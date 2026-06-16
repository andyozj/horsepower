/* qa-editguard.js — the broadcast-safety INVARIANT guard (static; no server needed).
 *   node qa-editguard.js
 *
 * THE BUG CLASS THIS STOPS: an editable text field that lives inside the render() tree and
 * commits LATE (on blur / a button / Enter, not per-keystroke) gets destroyed+recreated from
 * server state whenever a teammate's broadcast triggers render() — wiping the user's
 * uncommitted text. This was found (and re-found) in live dry-runs four+ times: node labels,
 * inspector WHY, the land-tray note, the assumption input, the lobby scratchpad, the parking-
 * lot input, the Farrier whisper. The fix each time was to add the field to the global
 * `editingLock` selector, which defers re-renders while the field is focused.
 *
 * The guard locks the POPULATION of editable fields and the editingLock selector to a reviewed
 * snapshot (REGISTRY below). It FAILS when:
 *   - a new editable field appears in index.html that isn't classified here (forces a decision:
 *     protected / draft / modal / slider / preseat);
 *   - a field declared `protected` no longer has its component selector in editingLock
 *     (protection silently removed);
 *   - the focusin and focusout matchers disagree (added to one, not the other);
 *   - editingLock carries a selector no protected field claims (dead/typo'd selector);
 *   - a registered field disappeared (stale registry — keep it honest).
 *
 * To satisfy a failure: classify the new field. If it commits late and lives in the render
 * tree, give it a component class and add `.thatclass textarea|input` to BOTH editingLock
 * matchers in index.html AND a `protected` entry here. Otherwise add a `draft`/`modal`/
 * `slider`/`preseat` entry with the reason it's exempt.
 */
const fs = require('fs');
const path = require('path');
const SRC = path.join(__dirname, 'public', 'index.html');
const html = fs.readFileSync(SRC, 'utf8');

let pass = 0, fail = 0;
const ok = (n, c, x) => { if (c) { pass++; console.log('  ✓', n); } else { fail++; console.log('  ✗', n, x != null ? '→ ' + (typeof x === 'string' ? x : JSON.stringify(x)) : ''); } };
const lineAt = idx => html.slice(0, idx).split('\n').length;

// ---- the reviewed registry: every editable field in the client, classified ----
// kind: protected (editingLock) | draft (per-keystroke persistence) | modal (body-appended,
//       outside render tree) | slider (no free text) | preseat (landing/picker, no canvas
//       broadcasts; value read synchronously on submit)
// match: how we identify the source site — testid | phIncludes (placeholder substring) |
//        phEquals (exact placeholder token, incl. barewords like `ph`) | type | nodeLabel
const REGISTRY = [
  // — protected (must be in editingLock) —
  { name: 'node label',        kind: 'protected', selector: '.node .label[contenteditable="true"]', match: { nodeLabel: true } },
  { name: 'inspector WHY',     kind: 'protected', selector: '.inspector textarea',  match: { testid: 'inspector-why' } },
  { name: 'inspector system',  kind: 'protected', selector: '.inspector .sysin',    match: { testid: 'inspector-system' } },
  { name: 'commit-input',      kind: 'protected', selector: '.commitcard textarea', match: { testid: 'commit-input' } },
  { name: 'pulse aha',         kind: 'protected', selector: '.pulsecard textarea',  match: { testid: 'pulse-aha' } },
  { name: 'pulse diff',        kind: 'protected', selector: '.pulsecard textarea',  match: { testid: 'pulse-diff' } },
  { name: 'baseline strip',    kind: 'protected', selector: '.baselinestrip input', match: { phEquals: 'ph' } },
  { name: 'land-tray note',    kind: 'protected', selector: '.landperson textarea', match: { phIncludes: 'what do they ride' } },
  { name: 'assumption-input',  kind: 'protected', selector: '.assumefloat textarea',match: { testid: 'assumption-input' } },
  { name: 'lobby scratchpad',  kind: 'protected', selector: '.scratch textarea',    match: { testid: 'scratch-input' } },
  { name: 'parking-lot input', kind: 'protected', selector: '.addorphan input',     match: { testid: 'orphan-input' } },
  { name: 'whisper-input',     kind: 'protected', selector: '.whisperbox input',    match: { testid: 'whisper-input' } },
  { name: 'timer-custom',      kind: 'protected', selector: '.timerctl input',      match: { testid: 'timer-custom' } },
  // — exempt (not editingLock), each with the reason it's broadcast-safe —
  { name: 'coach composer',    kind: 'draft',  reason: 'per-keystroke ui.coachDraft persist+restore (the input-listener pattern)', match: { testid: 'coach-input' } },
  { name: 'rebuild spar composer', kind: 'draft', reason: 'per-keystroke ui.coachDraft persist+restore (same input-listener pattern as the coach composer)', match: { testid: 'spar-input' } },
  { name: 'lock-challenge reason', kind: 'modal', reason: 'document.body-appended overlay — outside the render() tree', match: { phIncludes: 'why is it wrong' } },
  { name: 'lock-challenge proposed', kind: 'modal', reason: 'document.body-appended overlay — outside the render() tree', match: { phIncludes: 'proposed correction' } },
  { name: 'pulse confidence slider', kind: 'slider', reason: 'range input — no free text to lose; value re-derives from state', match: { type: 'range' } },
  { name: 'join name',         kind: 'preseat', reason: 'landing — no canvas broadcasts; backed by me.name', match: { testid: 'join-name' } },
  { name: 'join code',         kind: 'preseat', reason: 'landing — no canvas broadcasts; read on submit', match: { testid: 'join-code' } },
  { name: 'rejoin workshop code', kind: 'preseat', reason: 'landing rejoin — no canvas broadcasts; read on submit', match: { phIncludes: 'workshop code' } },
  { name: 'rejoin host code',  kind: 'preseat', reason: 'landing rejoin — no canvas broadcasts; read on submit', match: { phIncludes: 'host code' } },
  { name: 'create-team name',  kind: 'preseat', reason: 'team picker — short-lived; value read synchronously on create', match: { testid: 'create-team-name' } },
];

// ---- 1. extract & compare the two editingLock matchers ----
console.log('\n— 1. editingLock matchers —');
const matcherRe = /addEventListener\('(focusin|focusout)'[\s\S]*?\.matches\('([^']*)'\)/g;
const matchers = {};
let mm;
while ((mm = matcherRe.exec(html))) matchers[mm[1]] = mm[2];
ok('focusin matcher found', !!matchers.focusin);
ok('focusout matcher found', !!matchers.focusout);
ok('focusin and focusout selectors are identical (no add-to-one-not-the-other drift)',
   matchers.focusin && matchers.focusin === matchers.focusout,
   matchers.focusin === matchers.focusout ? null : 'in≠out');
const lockSet = (matchers.focusin || '').split(',').map(s => s.trim()).filter(Boolean);

// ---- 2. enumerate every editable field site in the source ----
console.log('\n— 2. editable-field population —');
const sites = [];
const attrsOf = body => {
  const testid = (body.match(/['"]?data-testid['"]?\s*:\s*'([^']*)'/) || [])[1] || null;
  const type = (body.match(/\btype\s*:\s*'([^']*)'/) || [])[1] || null;
  // placeholder may be a quoted string OR a bareword identifier (e.g. `placeholder:ph`)
  const pm = body.match(/placeholder\s*:\s*(?:'([^']*)'|([A-Za-z_$][\w$]*))/);
  const placeholder = pm ? (pm[1] != null ? pm[1] : pm[2]) : null;
  return { testid, type, placeholder };
};
let m;
const taRe = /el\('textarea',\s*\{([^}]*)\}/g;
while ((m = taRe.exec(html))) sites.push(Object.assign({ tag: 'textarea', line: lineAt(m.index) }, attrsOf(m[1])));
const inRe = /el\('input',\s*\{([^}]*)\}/g;
while ((m = inRe.exec(html))) sites.push(Object.assign({ tag: 'input', line: lineAt(m.index) }, attrsOf(m[1])));
const lblRe = /el\('div',\s*\{class:'label',\s*contenteditable/g;
while ((m = lblRe.exec(html))) sites.push({ tag: 'contenteditable', line: lineAt(m.index), nodeLabel: true, testid: null, type: null, placeholder: null });

console.log(`  (found ${sites.length} editable field sites; registry has ${REGISTRY.length} entries)`);

const matchEntry = (site, e) => {
  const x = e.match;
  if (x.nodeLabel) return !!site.nodeLabel;
  if (x.testid) return site.testid === x.testid;
  if (x.type) return site.type === x.type && !site.testid;
  if (x.phEquals) return site.placeholder === x.phEquals;
  if (x.phIncludes) return !!site.placeholder && site.placeholder.includes(x.phIncludes);
  return false;
};

// every site must map to exactly one registry entry
const usedEntries = new Set();
let unclassified = 0, ambiguous = 0;
for (const site of sites) {
  const hits = REGISTRY.filter(e => matchEntry(site, e));
  if (hits.length === 0) {
    unclassified++;
    ok(`field @line ${site.line} (${site.tag} testid=${site.testid || '—'} ph="${(site.placeholder || '').slice(0, 28)}") is classified`,
       false, 'UNCLASSIFIED — add a REGISTRY entry (protected→also add its selector to editingLock; else draft/modal/slider/preseat)');
  } else if (hits.length > 1) {
    ambiguous++;
    ok(`field @line ${site.line} maps to exactly one registry entry`, false, 'ambiguous: ' + hits.map(h => h.name).join(', '));
  } else {
    usedEntries.add(hits[0].name);
  }
}
ok('every editable field site is classified', unclassified === 0, unclassified ? unclassified + ' unclassified' : null);
ok('no field site is ambiguous', ambiguous === 0);

// no stale registry entries (a field was removed but its registry/selector lingers)
const stale = REGISTRY.filter(e => !usedEntries.has(e.name));
ok('no stale registry entries (every classified field still exists in source)', stale.length === 0,
   stale.length ? stale.map(e => e.name).join(', ') : null);

// ---- 3. protected fields ⇔ editingLock selectors ----
console.log('\n— 3. protected ⇔ editingLock coverage —');
const protSelectors = [...new Set(REGISTRY.filter(e => e.kind === 'protected').map(e => e.selector))];
for (const sel of protSelectors)
  ok(`editingLock covers "${sel}"`, lockSet.includes(sel), 'missing from the matcher');
// dead-selector check: every selector in editingLock is claimed by some protected field
for (const sel of lockSet)
  ok(`editingLock selector "${sel}" is claimed by a protected field (not dead/typo)`, protSelectors.includes(sel),
     'no REGISTRY protected field uses this selector');

// ---- summary ----
const byKind = REGISTRY.reduce((a, e) => (a[e.kind] = (a[e.kind] || 0) + 1, a), {});
console.log('\n  classification:', JSON.stringify(byKind));
console.log(`\nEDITGUARD ${fail ? '❌' : '✅'} — ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
