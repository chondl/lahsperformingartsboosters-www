# Drama photos — 2026 batch audit

Record of what was in `src/images/2026/Drama/`, what survived review, and what was requested
from the drama teacher. **Read this first if new drama images arrive** — it says which frames
we already asked for and what to do with them.

Related: [hero-images.md](hero-images.md) · [program-card-images.md](program-card-images.md) ·
[CLAUDE.md](../CLAUDE.md)

Audited 2026-07-28. Nothing from this batch has been committed.

## Status

**Waiting on the drama teacher.** The request went out for high-resolution originals (see
[What we asked for](#what-we-asked-for)). Until it comes back, the home hero carousel still has
**no drama slide** and the drama program page has **no photo**.

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
