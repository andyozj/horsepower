# Slice B — Voice interview (two modes) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:subagent-driven-development or executing-plans. Steps use `- [ ]`.

**Goal:** add voice to the AI-led interview in two selectable, push-to-talk modes — **Listen** (STT → the existing text Coach) and **Converse** (Azure Voice Live realtime speech-to-speech) — server-proxied, degrading to the text interview when Azure isn't configured.

**Architecture:** browser audio ⇄ our server (proxy/relay) ⇄ Azure Foundry. Mode 1 reuses the hardened text pipeline (`SYSTEMS.interview` + `applyOps`); Mode 2 uses Voice Live with `applyOps` exposed as an `update_map` function tool. Keys stay server-side. Absent config → the `Voice` button degrades to "unavailable" and the text interview is untouched (rule #8).

**Tech:** Express + `ws` (existing), `fetch` to Azure audio REST (Mode 1), a server-side `ws` client to the Voice Live WSS endpoint (Mode 2). Browser `MediaRecorder`/Web Audio. No build step.

---

## Config (all default-off → text fallback; set on the Azure-connected host)
- `AZURE_SPEECH_ENDPOINT` — Foundry/AOAI resource base for audio (may equal `AZURE_OPENAI_ENDPOINT`).
- `AZURE_SPEECH_KEY` — api-key (may equal `AZURE_OPENAI_KEY`).
- `AZURE_STT_DEPLOYMENT` — e.g. `gpt-4o-mini-transcribe` (Mode 1 STT). Absent → no Listen mode.
- `AZURE_TTS_DEPLOYMENT` — e.g. `gpt-4o-mini-tts` (optional, speak the reply). Absent → text reply only.
- `AZURE_TTS_VOICE` — default voice name (e.g. `alloy`).
- `AZURE_VOICELIVE_ENDPOINT` / `AZURE_VOICELIVE_MODEL` (`gpt-realtime-mini`) — Mode 2. Absent → no Converse mode.
- `AZURE_AUDIO_API_VERSION` — default a recent stable version.
- `/api/health` gains `voice: { listen:bool, speak:bool, converse:bool }`.

---

## Phase 1 — Mode 1 "Listen" (STT → chat). Ships first.

### Task 1: Server STT proxy `POST /api/stt`
**Files:** Modify `server.js`.
- [ ] Add config consts + a `voiceCaps()` helper; extend `/api/health` with `voice`.
- [ ] `callAzureTranscribe(buf, mime)` → multipart POST to `{AZURE_SPEECH_ENDPOINT}/openai/deployments/{AZURE_STT_DEPLOYMENT}/audio/transcriptions?api-version=...`, `api-key` header; return `{text}`.
- [ ] `POST /api/stt` (raw audio body, `express.raw({type:['audio/*','application/octet-stream'], limit:'8mb'})`): gate to a live room + the per-IP/global coach buckets (reuse `coachSpendAllowed`); 20s timeout; clamp; on no-config/error → `{degraded:true, text:''}` (never 500). Returns `{text}`.
- [ ] Test: `qa-voice.js` — no Azure config → `/api/stt` returns `degraded:true`; `/api/health` `voice.listen===false`.

### Task 2: Optional Server TTS proxy `POST /api/tts`
**Files:** Modify `server.js`.
- [ ] `callAzureSpeech(text)` → POST `{...}/audio/speech` `{model, input, voice}` → audio bytes; relay with `content-type:audio/mpeg`.
- [ ] `POST /api/tts` gated/timeout/clamped (`text.slice(0,800)`); no-config → 204. 
- [ ] Test: no config → 204; `voice.speak` reflects config.

### Task 3: Client PTT recorder + Voice button (Listen)
**Files:** Modify `public/index.html`.
- [ ] `voiceCaps` from `/api/info` or `/api/health` at boot → `ui.voice`.
- [ ] Replace the disabled `Voice` stubs (interviewHero ~L2817, interviewDock ~L2616) with a live PTT button when `ui.voice.listen`: pointerdown → `navigator.mediaDevices.getUserMedia({audio})` + `MediaRecorder` start; pointerup → stop → POST blob to `/api/stt` → put `text` into the composer; auto-send via `sendInterviewTurn` (or let the user edit first — config: send-on-release).
- [ ] Recording affordance (pulsing mic, "listening…"); errors (denied mic / degraded) → toast + fall back to typing.
- [ ] If `ui.voice.speak`: after the Coach reply, fetch `/api/tts` and play the audio (guard with a mute toggle; respect `prefers-reduced-motion`? n/a — it's audio, add a mute pref `ui.voiceMute`).
- [ ] `editguard`: the composer is already protected; the PTT button adds no new editable field.
- [ ] Test (`qa-voice.js` Playwright, degraded): with no Azure config the Voice button shows "unavailable"/hidden and the text interview still works; with a MOCK stt endpoint, a recorded blob round-trips into the composer.

### Task 4: Mode toggle scaffold
- [ ] A small segmented control by the Voice button: **Listen ▾ / Converse** — only show Converse when `ui.voice.converse`. Default Listen. Persist `ui.voiceMode`.

---

## Phase 2 — Mode 2 "Converse" (Voice Live realtime). Layers on after Mode 1 is proven.

### Task 5: Server Voice Live relay
**Files:** Modify `server.js`.
- [ ] On a dedicated WS path (or a `voice:*` message namespace on the existing socket), open a server-side `ws` client to `AZURE_VOICELIVE_ENDPOINT` (`wss://…/voice-live/realtime?api-version=…&model=gpt-realtime-mini`, `api-key`).
- [ ] `session.update`: instructions = `SYSTEMS.interview` (voice-adapted), tools = `[{name:'update_map', parameters: <applyOps ops schema>}]`, input/output audio formats (pcm16), turn_detection = server VAD OR none (PTT → client commits).
- [ ] Relay: browser audio frames → `input_audio_buffer.append`; PTT release → `input_audio_buffer.commit` + `response.create`. Stream `response.audio.delta` back to the browser. On `response.function_call_arguments.done` for `update_map` → `applyOps(team.canvas, ops)` + `broadcast` + return `function_call_output`.
- [ ] Authz: only the seated member of the team; rides `ws.bucket`; per-room concurrency cap; close on phase change.

### Task 6: Client realtime audio (Converse)
**Files:** Modify `public/index.html`.
- [ ] PTT → capture mic via Web Audio (pcm16 24kHz), stream frames over the relay; play streamed audio deltas (AudioContext queue).
- [ ] "Converse" UI: live "Coach is listening / speaking" states, a stop/hang-up control; the map builds live (existing reconciler renders the ops).
- [ ] Degrade: any failure → drop back to Listen/text with a toast.

### Task 7: Tests + live verification
- [ ] `qa-voice.js`: degraded paths (no config) for both modes; mock STT round-trip; Voice Live relay session-open against a mock WS.
- [ ] Live (needs Azure creds): a real Listen turn transcribes + builds the map; a real Converse exchange builds the map via `update_map`. Verified against the Azure-connected deploy (like `qa-interview-live`).

---

## Self-review notes
- Both modes are **enhancements** on the working text interview — every degraded path must leave typing fully functional (rule #8).
- Reuse `coachSpendAllowed` + `ws.bucket` for spend/rate control (audio is pricier — keep the caps).
- Mode 1 reuses `SYSTEMS.interview`/`applyOps` verbatim (the extraction quality is already verified live). Mode 2 must mirror the SAME extraction discipline in the tool schema + instructions.
- No Azure key during build → Phase 1/2 verified on degraded + mock paths; live quality verified once the user wires `AZURE_SPEECH_*` / `AZURE_VOICELIVE_*`.
