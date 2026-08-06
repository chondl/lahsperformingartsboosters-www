# Drama photos — batch audits and what shipped

Record of the drama photo batches: what arrived, what survived review, and the exact recipes
for everything that shipped. **Read this first if new drama images arrive.**

Related: [hero-images.md](hero-images.md) · [program-card-images.md](program-card-images.md) ·
[CLAUDE.md](../CLAUDE.md)

## Status

**The teacher came through.** Six camera originals (4032×3024 to 6000×4000) arrived
2026-08-05 — see [The August 2026 batch](#the-august-2026-batch). The home hero now has a
drama slide (`drama-oz-cast.jpg`) and the drama program page carries three photos. The
**program card is still the placeholder** — a candidate slice was cut, reviewed, and
**declined**; don't re-propose it (recipe kept below). The July screenshot batch, kept below as history, never shipped —
its crop A (curtain call) is superseded by the new hero slide.

## The August 2026 batch

Six files in `src/images/2026/Drama/` (copied from `~/Downloads/drama 2026`) — all real
camera files, so the resolution problem that sank the July batch is gone.

| File | Native | Verdict |
|---|---|---|
| `IMG_2061.JPG` | 6000×4000 | **Hero slide.** Wizard of Oz cast — Tin Man, Dorothy, Lion, Toto puppet — against the painted Oz backdrop. Best colour, unmistakably theatre. |
| `IMG_4232.JPG` | 6000×4000 | **Program page.** Six performers mid-gesture in a comedy scene, eye-chart poster behind, one performer flat on the floor. The most energy in the batch. |
| `IMG_3906.JPG` | 6000×4000 | **Program page + card candidate.** Two students on ladders flanking a hand-painted sepia porch backdrop (*Our Town* — the shirts carry character names, not student names). The tech-theater frame. |
| `IMG_4020.JPG` | 6000×4000 | **Program page.** *Our Town* graveyard scene — the quiet counterweight to the comedy frame. Added as the third page photo at the human's request. |
| `IMG_0518.HEIC` | 4032×3024 | **No.** Bare-stage scene, ghost costume at a folding table; subjects small in a mostly black frame. |
| `IMG_5443.HEIC` | 5712×4284 | **No.** Students painting character-name shirts — charming behind-the-scenes moment, but classroom fluorescent light. |

### Hero — Oz cast, mirrored

```bash
ffmpeg -y -i src/images/2026/Drama/IMG_2061.JPG \
  -vf "hflip,crop=6000:3375:0:480,scale=2400:1350:flags=lanczos" -q:v 4 \
  public/images/hero/drama-oz-cast.jpg
# → 2400×1350. In heroImages: { src: '/images/hero/drama-oz-cast.jpg', position: 'center 30%' }
```

The `hflip` is deliberate: unmirrored, the cast sits centre-left and the leftmost performer
drowns under the headline scrim; flipped, the dark stage-right becomes the text zone and the
cast lands centre-right. No readable text or logos in frame. Focal `center 30%` starts the
43% desktop band at ~17% of image height — it holds every face (Tin Man's head near the top
through Dorothy kneeling at mid-frame) and gives up the feet, per the usual trade.

Like the "Hexed" field slide, this is dated show content (the 2025-26 *Wizard of Oz*) kept
by choice — swap it when a newer production photo exists.

### Program page — three inline photos, 1600×900

```bash
ffmpeg -y -i src/images/2026/Drama/IMG_4232.JPG \
  -vf "crop=6000:3375:0:330,scale=1600:900:flags=lanczos" -q:v 4 \
  public/images/drama-broken-box-scene.jpg
ffmpeg -y -i src/images/2026/Drama/IMG_4020.JPG \
  -vf "crop=6000:3375:0:200,scale=1600:900:flags=lanczos" -q:v 4 \
  public/images/drama-graveyard-scene.jpg
ffmpeg -y -i src/images/2026/Drama/IMG_3906.JPG \
  -vf "crop=6000:3375:0:440,scale=1600:900:flags=lanczos" -q:v 4 \
  public/images/drama-set-backdrop.jpg
```

Placement in `src/content/programs/drama.md`, one photo per stretch of prose: the comedy
scene sits after the intro/director line (mirroring the cello photo on the Instrumental
Music page); the graveyard scene closes "The classes" (it is a Broken Box production shot);
the backdrop-and-ladders frame closes "A year on stage", directly above "What the Boosters
provide" — it shows exactly what booster money buys. The graveyard cast's grey shirts carry
*Our Town* **character** names (Julia Gibbs, Simon Stimson…), not student names.

### Card candidate — cut, reviewed, DECLINED

```bash
ffmpeg -y -i src/images/2026/Drama/IMG_3906.JPG \
  -vf "crop=2850:950:1480:1950,scale=1200:400:flags=lanczos" -q:v 5 \
  public/images/programs/drama.jpg
```

A slice of the painted porch backdrop taken *between* the two students — nothing but
drawing in frame, warm sepia that sits with the card set's warm palette, real pen texture
at 92px. `X=1480` and `W=2850` matter: wider or further left pulls in a student on a
ladder at either edge. **The human reviewed it on 2026-08-05 and chose to keep the current
card — don't re-propose this slice.** The recipe stays here in case that changes;
`cardImage:` already points at `/images/programs/drama.jpg`.

### Review page for this batch

`src/images/2026/Drama/_review/drama-review-2026-08.html` (gitignored) — hero simulated at
real desktop width and in a 390px phone frame with the scrim applied, both inline crops, and
the card candidate against the current card in a real 92px band.

---

# History — the July 2026 screenshot batch

Audited 2026-07-28. Nothing from this batch was ever committed; it is kept here because its
size analysis is what produced the request that brought in the August batch.

## The finding that drives everything

**Nine of the ten files are screen grabs, 393–1048 px wide.** Only `IMG_9464.jpg` (2001×948) is a
real photograph. A screenshot arrives at screen resolution — roughly a quarter of what the hero
needs — and no amount of cropping fixes that.

This is the thing to say to whoever sends the next batch: *anything straight off a camera or a
phone is four to ten times larger than a screenshot, and all of these problems disappear.*

## Size targets, for reference

| Use | Target | Precedent already shipping |
|---|---|---|
| Home hero slide | 2400×1350 (16:9) | `orchestra-violins.jpg` at 1310×737 — the accepted floor |
| Inline program-page image | ~1500 wide, 16:9 | `instrumental-music-cellos.jpg` at 1530×861 |
| Program card | 1200×400 | see [program-card-images.md](program-card-images.md) |

**Inline prose images render at up to 1072 px** on desktop — the container is `--maxw: 1120px`
minus `var(--space-md)` gutters on both sides. So anything under ~1100 px native gets upscaled
in the browser, and anything under ~2100 px is not retina-sharp.

## Per-file verdicts

| File | Native | Verdict |
|---|---|---|
| `IMG_9464.jpg` | 2001×948 | **Best usable.** Curtain call — cast in a line, joined hands raised. The only real photograph. Crop A below. |
| `Screenshot 2024-12-18 125740.png` | 586×289 | **Best composition in the folder, unusable size.** Musical production number: white wings sweeping in from both sides, yellow raincoat centre, googly-eyed puppet, painted sky. The only frame with movement in it. **This is the one we asked for.** |
| `Screenshot 2026-01-07 091229.png` | 1009×719 | **Program page.** Emerald City — best colour in the set. Had a livestream overlay burning student and staff names across the bottom; crop C removes it. |
| `Screenshot 2026-01-07 091304.png` | 875×432 | **Program page, borderline.** Oz forest with the cardboard tree puppets. 1.23× upscale at render width. |
| `Screenshot 2026-01-07 091431.png` | 532×290 | **No — but worth requesting.** Dorothy and the Lion behind the lattice. Warm, intimate, second-best image here. |
| `Screenshot 2025-04-15 103257.png` | 408×589 | **No.** Three in a bed, rainbow backdrop. Charming but *portrait* and tiny. |
| `Screenshot 2025-08-28 174953.png` | 1048×703 | **No.** Best resolution after the real photo, but it's a talkback, cluttered, and a video-player control is burned into the frame. |
| `Screenshot 2026-01-07 091350.png` | 779×304 | **No.** Munchkinland. Cast pushed to the outer edges, a closed door in the middle. |
| `Screenshot 2024-08-29 134748.png` | 541×403 | **No.** Shot from the back of the house; dark, tiny performer, audience heads dominate. |
| `Screenshot 2024-12-18 130135.png` | 393×359 | **No.** Smallest file. Busy staging, a figure kneeling with their back to camera. |

## The crops, with exact recipes

Regenerate any of these from the originals. `ffmpeg` is available; ImageMagick is not.

**A — curtain call → hero.** Ships today if you want a drama slide before the teacher replies.

```bash
ffmpeg -y -i "src/images/2026/Drama/IMG_9464.jpg" \
  -vf "crop=1685:948:0:0" -q:v 3 public/images/hero/drama-curtain-call.jpg
# → 1684x948. Add to heroImages in src/components/content/Hero.astro:
#   { src: '/images/hero/drama-curtain-call.jpg', position: 'center 80%' },
```

`X=0` is deliberate: it drops the onlooker at the right edge and puts the cast right of centre, so
the headline lands on dark curtain rather than on a student. Focal `center 80%` holds heads and
feet in the 43% desktop band. Two people stand in the wings at far left, under the darkest part of
the scrim — acceptable, but that's the compromise.

Honest caveat: this is the weakest *picture* of the good ones — street clothes, no set, no colour.
It reads unmistakably as theatre and it's real, which is why it clears the bar.

**B — musical number → hero, if a high-res original arrives.** Proof-of-composition only at this size.

```bash
ffmpeg -y -i "src/images/2026/Drama/Screenshot 2024-12-18 125740.png" \
  -vf "crop=514:289:36:0,scale=2400:1350:flags=lanczos" -q:v 3 /tmp/B-musical.jpg
# focal: center 52%
```

**Focal point 52% was tested against 40% and 64%** — use it. At 40% the desktop band guillotines the
raincoat's outstretched arms, which is the gesture the whole photo is built on. At 64% you lose the
upper row of faces and the headline lands on her. 52% holds her face, both arms, the wing sweeping
in from the left, and the boy leaning in.

**C — Emerald City → program page.**

```bash
ffmpeg -y -i "src/images/2026/Drama/Screenshot 2026-01-07 091229.png" \
  -vf "crop=1009:567:0:125" -q:v 3 public/images/drama-emerald-city.jpg
```

`Y=125` is what cuts the livestream name overlay off the bottom. **Do not skip it** — the overlay
carries real student and staff names.

**D — Oz forest → program page, or hold.**

```bash
ffmpeg -y -i "src/images/2026/Drama/Screenshot 2026-01-07 091304.png" \
  -vf "crop=875:432:0:0" -q:v 3 public/images/drama-oz-forest.jpg
# 2.03:1, a little wider than the cello photo
```

## What we asked for

Ranked by how much each would improve the site, strongest first:

1. **The musical production number** — the yellow-raincoat / white-wings frame. Ask for the
   *original camera file*, not a re-export and not another screenshot.
2. **Dorothy and the Lion behind the lattice** (`Screenshot 2026-01-07 091431.png`).
3. **The three-in-a-bed rainbow scene** (`Screenshot 2025-04-15 103257.png`) — only useful if a
   landscape frame from that show exists.

## When new images arrive

1. Read [hero-images.md](hero-images.md) — the crop-and-focal-point procedure is there and hasn't
   changed. This file is the drama-specific state on top of it.
2. Check the native size first (`sips -g pixelWidth -g pixelHeight`). If it's still under ~1500 px,
   it's another screenshot; say so plainly rather than shipping a soft hero.
3. If the musical frame comes back at 2400 px+: **it becomes the drama hero slide**, and crop A
   either moves to a second slide or to the program page. Focal `center 52%` should carry over —
   re-verify it, since a wider original may include more headroom.
4. Rebuild the review page and get approval before pushing, per hero-images.md step 4.
5. `npm run build && npm test` — `test/build.test.mjs` asserts every hero slide resolves to a file
   that shipped, so a typo'd path is a silent blank slide otherwise.

## Where the review artifacts live

`src/images/2026/Drama/_review/` — gitignored along with the rest of `src/images/`, so it stays on
the human's disk and out of the repo.

- `drama-review.html` — the approval page. Open it with
  `open -a "Google Chrome" src/images/2026/Drama/_review/drama-review.html`.
  Heroes render full-bleed at real browser width with the site's 1120 px centred content container,
  plus a true 390 px phone viewport. Two mistakes worth not repeating: a hero sim squeezed into a
  narrow column isn't a desktop preview, and omitting the centred container puts the headline flush
  left instead of where it actually lands on the photo.
- `crops/` — the four candidate crops (A, B, C, D).
- `prev/` — downscaled previews of the rejected files.

## Also still open

The **drama program card** (`public/images/programs/drama.jpg`) is a placeholder — a lit-stage crop
from a curtain call that reads flat at 92 px. Nothing in this batch beats it; the Oz forest frame
has the tight horizontal texture a card wants but not the resolution. Same request covers it. See
[program-card-images.md](program-card-images.md).
