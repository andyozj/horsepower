# Illustration set — mapping table (integrated 2026-06-13)

27 unique hand-drawn illustrations (33 uploads, 6 exact-duplicate PNGs deduped by md5:
IMG_2944–2948 each had two identical copies, coachcheer had two). Each resized with
`sips` into `public/img/` at ~2× on-screen render size; transparency preserved where present.

| Uploaded file (IMG #) | Slot | Target filename | What I saw |
|---|---|---|---|
| coachcheer.png | Coach — cheer | `coach-cheer.png` | Gold horse, red cap + rosette + whistle cord, mouth open in happy whinny |
| IMG_2958 | Coach — hero/portrait | `coach-hero.png` | Gold coach horse, red cap, whistle, kind knowing eyes, facing slightly left (calm default) |
| IMG_2956 | Coach — listen | `coach-listen.png` | Same coach, head tilted, ear forward, calm listening look |
| IMG_2954 | Coach — question | `coach-question.png` | Same coach, raised brow / skeptical "go on" question expression |
| IMG_2961 | Steed purple | `steed-purple.png` | Purple horse head, profile facing left over a fence |
| IMG_2938 | Steed green | `steed-green.png` | Sage-green horse head profile |
| IMG_2963 | Steed navy | `steed-navy.png` | Dark navy horse head profile |
| IMG_2939 | Steed gold | `steed-gold.png` | Amber/gold horse head profile |
| IMG_2941 | Steed chestnut | `steed-chestnut.png` | Chestnut/brown horse head profile |
| IMG_2942 | Steed blue | `steed-blue.png` | Mid-blue horse head profile |
| IMG_2962 | Steed plum | `steed-plum.png` | Crimson/magenta-pink horse head (nearest plum #a23b6b) |
| IMG_2959 | Steed teal | `steed-teal.png` | Teal horse head profile |
| IMG_2940 | Steed ghost | `steed-ghost.png` | Faint pale line ghost horse head (empty stall) |
| IMG_2948 | Paddock fence | `fence.png` (2048×512) | Wide rustic wooden fence, posts + grass tufts + pebbles |
| IMG_2947 | Social / OG card | `og-image.png` (1200×630) | Three horses (purple/coach-gold/green) round a paper map, right third cream |
| IMG_2944 | Reveal parcel | `reveal-parcel.png` | Brown-paper parcel, string, cracked red wax seal, rolled map peeking (reads on navy) |
| IMG_2936 | Landing watermark | `watermark-horse.png` | Single continuous-line cantering horse, faint gesture drawing |
| IMG_2952 | Empty-canvas spot | `empty-canvas.png` | Horse at a drafting table, pencil in mouth, blank sheet |
| IMG_2943 | Rosette badge | `rosette.png` | Yellow/gold show-ribbon rosette with horseshoe centre |
| IMG_2945 | Race-card crest | `racecard-crest.png` (400×200) | Heraldic crest: crossed crops, horseshoe, laurel, star |
| IMG_2950 | Closed farewell | `farewell.png` | Horse walking away, head turned back, tipping red cap |
| IMG_2949 | Farrier console spot | `farrier-setup.png` | Farrier bench: anvil, horseshoes, clipboard, steaming mug |
| IMG_2946 | Paper texture tile | `paper-tile.png` | Barely-there cream paper texture (kept 512, tileable) |
| IMG_2951 | Trot cycle 1 | `trot-1.png` | Small horse mid-gallop, legs gathered |
| IMG_2953 | Trot cycle 2 | `trot-2.png` | Small horse trotting, legs extended |
| IMG_2955 | Trot cycle 3 | `trot-3.png` | Small horse gallop, legs splayed |
| IMG_2957 | Trot cycle 4 | `trot-4.png` | Small horse trotting, opposite reach |

## Slots with NO matching upload (left code-drawn — fallback stands)
None — all 15 prompt slots had at least one matching image, plus the trot cycle.

## Steed colour-palette → image mapping
The participant steed palette hexes are matched to the nearest steed image. Any palette
colour without a close image keeps the procedural `steedSvg` draw (never blank).
