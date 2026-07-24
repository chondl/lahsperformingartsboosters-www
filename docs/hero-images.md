# Hero carousel images — how to crop and add them

Procedure for turning camera originals into home-page hero slides. Written for a future
AI session: **you can look at the photos yourself and choose the crops — do that, don't
hand the job back to the human.** They will drop source images in and expect you to
select the focal point and crop for each one.

Related: [CLAUDE.md](../CLAUDE.md) · [cloudflare-configuration.md](cloudflare-configuration.md)

## Where things live

| What | Where | In git? |
|---|---|---|
| Camera originals | `src/images/<year>/<Program>/` | **No** — gitignored, tens of MB each |
| Cropped web slides | `public/images/hero/*.jpg` | Yes — ~100–550 KB each |
| The slide list | `src/components/content/Hero.astro` (`heroImages`) | Yes |
| The component | `src/components/HeroCarousel.astro` | Yes |

Originals stay on the human's disk and in the photo archive. Only derivatives ship.

## The constraint that drives everything

The hero is a full-bleed `background-size: cover` box, **460px tall on desktop, 360px on
mobile**. So its aspect ratio swings from about **4:1** on a wide desktop to nearly
**1:1** on a phone. No single crop survives that range.

At 1920px wide, a 16:9 slide scales to 1080px tall inside a 460px box — **only ~43% of
the image height is visible on desktop.** With the default `background-position: center`
that visible band is the middle 43%, which decapitates any subject sitting high in the
frame. That is why every slide carries its own focal point.

**Standard output: 16:9 at 2400×1350.** Keep it uniform.

## Step 1 — actually look at the photos

Originals are 6000×4000 and too large to read directly. Downscale to a preview, then use
the Read tool on the preview — it renders the image and you can see it.

```bash
sips -Z 1100 src/images/2026/MBCG/DSC_7253.jpg --out /tmp/prev/DSC_7253.jpg
sips -g pixelWidth -g pixelHeight src/images/2026/MBCG/DSC_7253.jpg   # get dimensions
```

Then Read `/tmp/prev/DSC_7253.jpg`. Judge each photo individually — **do not run one
formula over the whole batch.** Decide per image what the subject is, what is dead space
(empty bleachers, sky, music stands, trash cans), and where the subject sits horizontally.

## Step 2 — crop with ffmpeg

`ffmpeg` is available; ImageMagick is not. `sips` can only crop centred, so use ffmpeg
for any off-centre crop.

```bash
ffmpeg -y -i SOURCE.jpg -vf "crop=W:H:X:Y,scale=2400:1350:flags=lanczos" -q:v 4 OUT.jpg
```

- `W:H` must be 16:9. From a 6000-wide source that is `6000:3375`; from 4547-wide, `4547:2558`.
- `X:Y` is the top-left corner. Usually `X=0` (keep full width — it maximises available
  height) and `Y` chosen to trim dead space off the top or bottom.
- Add `hflip` **before** `crop` to mirror: `-vf "hflip,crop=...,scale=..."`.
- `-q:v 4` lands around 100–550 KB. Good enough; don't chase smaller.

**Read the result** before moving on. Confirm nothing important got clipped at an edge.

### Horizontal placement matters

The headline scrim is a left-to-right gradient, darkest on the **left**
(`rgba(8,28,55,.86)` → `.2`). A subject on the left ends up half-buried behind the
headline. Prefer crops that put the subject **right of centre**, with the quiet/dark part
of the frame on the left for the text to sit on.

**Mirroring is an accepted fix.** The band-conductor slide is flipped left↔right for
exactly this reason. Before flipping, check the frame for readable text or logos — those
give it away. And flag it to the human: mirroring reverses apparent handedness and hair
part, which matters for a named real person. It was approved for that photo; ask again
for any new one.

## Step 3 — choose the focal point

`position` is a CSS `background-position`. Only the Y term matters (X stays `center`).

Rough method: estimate where the must-see content sits as a percentage of image height,
then solve for the position value.

```
visible  = 0.43                      # fraction of height shown on desktop
P        = desiredWindowTop / (1 - visible)
```

So to start the visible band 20% down the image: `P = 0.20 / 0.57 ≈ 35%`.

Rules of thumb:
- Subject's head near the top of frame → **10–25%**.
- Group shots and full-body subjects → **40–50%**.
- Content stacked vertically (a title above people) → pick the value that gets **both**
  into the ~43% band; you usually cannot also keep feet or a baton, so drop those.

Mobile is nearly square, so it crops the sides and shows full height — the focal point is
effectively a desktop-only concern.

Current values, as worked examples:

| Slide | Focal | Why |
|---|---|---|
| `band-conductor.jpg` | `center 12%` | Head high in frame; holds his face and glasses |
| `marching-band-field.jpg` | `center 28%` | Gets the show title *and* the students' faces in one band |
| `orchestra-conductor.jpg` | `center 22%` | Her head is near the top edge |
| `marching-band-group.jpg` | `center 45%` | Group fills the middle |
| `color-guard.jpg` | `center 45%` | Subject already centred and right of frame |
| `drum-major.jpg` | `center 40%` | Vertical subject; pulled up to keep the salute |

## Step 4 — show the human before shipping

**Always get approval on the crops before pushing.** Build a review page that renders,
per image: the full crop, plus the hero simulated at desktop (460px) and mobile (360px)
with the focal point and scrim applied — so they see real framing, not just the crop.
Then open it:

```bash
open -a "Google Chrome" "file:///path/to/crop-review.html"
```

A working copy of that page from the first batch is worth reproducing rather than
reinventing. Reference images by absolute `file:///` URL so it works without a server.
Say plainly what is not yet committed.

## Step 5 — wire it up

Add to `heroImages` in `src/components/content/Hero.astro`:

```ts
{ src: '/images/hero/<name>.jpg', position: 'center 28%' },
```

Ordering conventions:
- **Ted (band director) leads.**
- **Never put the two conductor portraits next to each other**, and remember the rotation
  wraps — the last slide is adjacent to the first.
- Otherwise alternate group shots and single subjects.

## Step 6 — verify

```bash
npm run build && npm test
```

`test/build.test.mjs` asserts every hero slide resolves to a file that shipped — a typo'd
path is otherwise an invisible blank slide, not an error. Then commit and push to `main`;
Cloudflare auto-deploys in about a minute. Confirm live rather than assuming:

```bash
curl -s https://lahsperformingartsboosters.org/ | grep -o "url('/images/hero/[^']*')"
curl -s -o /dev/null -w '%{http_code}\n' https://lahsperformingartsboosters.org/images/hero/<name>.jpg
```

## Gotchas

- **Don't commit `src/images/`.** It is gitignored for a reason (54 MB in the first batch).
- Black-and-white mixed into a colour set reads as a deliberate beat, not a mistake — but
  say so and let the human decide.
- Dated content in a hero goes stale. The `marching-band-field.jpg` slide shows the
  "Hexed" prop from the 2025-26 season; it is on the home page by explicit choice and
  should be swapped when a new show exists. This is a **looser** rule than the MBCG
  program page, which intentionally carries current-season detail.
- Photos with masked students date to 2021-22. Flag it; the orchestra slide was kept
  anyway because it is the best frame available.
