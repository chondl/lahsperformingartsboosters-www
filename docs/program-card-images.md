# Program card photos — how to crop and swap them

The four cards under "Jump to the program your family is part of" on the home page each
show a cropped photo. This is the procedure for replacing one.

Related: [CLAUDE.md](../CLAUDE.md) · [hero-images.md](hero-images.md) ·
[design spec](superpowers/specs/2026-07-20-program-card-imagery-design.md)

## Where things live

| What | Where | In git? |
|---|---|---|
| Camera originals | `src/images/<year>/<Program>/` | **No** — gitignored |
| Cropped card photos | `public/images/programs/*.jpg` | Yes — ~40–50 KB each |
| The path per program | `cardImage:` in `src/content/programs/<slug>.md` | Yes |
| The component | `src/components/ProgramCard.astro` | Yes |

## Swapping a photo (the common task)

1. Crop a new **1200×400** JPEG (see below) and drop it in `public/images/programs/`.
2. Point that program's `cardImage:` at it, in `src/content/programs/<slug>.md`.

That second step is a one-line frontmatter edit and can be done entirely in GitHub's web
editor. No code change is needed.

If you remove `cardImage:` entirely, the card falls back to the emoji in `icon:` on the
navy gradient block — the pre-2026 look. Nothing breaks.

## The constraint

The card photo sits in a **fixed 92px-tall band** with `object-fit: cover`, so only a
horizontal slice through the middle of the image is ever visible. The band is about
280px wide at the 4-up desktop layout and about 370px wide on a phone, which means the
visible slice runs from roughly **3:1 to 4:1**.

That is a punishing shape. It rules out anything whose subject reads vertically, and it is
why every one of these is a tight horizontal detail rather than a scene.

**Standard output: 1200×400.** That clears 2× at every breakpoint. Keep it uniform.

## What works in this shape

Learned the hard way while choosing the current four:

- **Texture and hardware survive the crop.** Brass, chrome, wood grain, drum rims, a mic
  grille — these read as craft at 92px.
- **Smooth recognisable objects die.** A theatrical mask cropped in becomes a white blob,
  because its meaning is its silhouette and the crop destroys the silhouette.
- **No faces.** Every photo here is framed so no student is identifiable. This is a hard
  requirement, met by framing — not by blurring.
- **Warm images sit together.** The current set is warm metal, warm wood, warm light. A
  cool daylight frame stands out; the MBCG snare shot is the one that does.

## Current set

| Program | Subject | Source |
|---|---|---|
| MBCG | Blue sticks over chrome snare rims | `DSC_0464.JPG` — ours |
| Instrumental Music | Tuba bell flare | `janosch-jost-jLhpu4-UL9I-unsplash.jpg` |
| Choir | Microphone grille | `robinson-recalde-sT0n-Ie8OKo-unsplash.jpg` |
| Drama | Velour valance over a lit cyclorama | `IMG_9464.jpg` — ours |

The two Unsplash images are under the Unsplash licence: free for commercial use, no
attribution required.

**Drama is a placeholder.** The cyclorama reads flat at 92px, and its source is the
lowest-resolution of the four. Replace it when the drama teacher supplies production
photos — something with stage lighting, rigging, or a lit set has the texture this shape
needs. Avoid posed cast shots; they are all faces at this crop.

## Reproducing the current crops

```bash
# MBCG — sticks over snares
ffmpeg -i src/images/2026/MBCG/DSC_0464.JPG \
  -vf "crop=2100:700:2800:2400,scale=1200:400" -q:v 5 public/images/programs/mbcg.jpg

# Instrumental Music — tuba bell
ffmpeg -i src/images/2026/Unsplash/janosch-jost-jLhpu4-UL9I-unsplash.jpg \
  -vf "crop=2575:858:219:1500,scale=1200:400" -q:v 5 public/images/programs/instrumental-music.jpg

# Choir — microphone grille
ffmpeg -i src/images/2026/Unsplash/robinson-recalde-sT0n-Ie8OKo-unsplash.jpg \
  -vf "crop=2000:667:1150:1200,scale=1200:400" -q:v 5 public/images/programs/choir.jpg

# Drama — lit stage
ffmpeg -i src/images/2026/Drama/IMG_9464.jpg \
  -vf "crop=1170:390:420:30,scale=1200:400" -q:v 5 public/images/programs/drama.jpg
```

`crop=W:H:X:Y` is width, height, then the offset of the crop's top-left corner in the
original. To find those numbers, downscale the original to a preview, look at it, and
scale your measured coordinates back up — the same method as
[hero-images.md](hero-images.md) step 1.

## Colour correction

Do it **in the crop**, per image — not as a CSS filter on the card. A filter on the
container would silently apply to whatever photo is swapped in later, which is the wrong
behaviour. The current four needed none.

## Tests

`test/build.test.mjs` asserts that all four cards ship a photo, that every referenced file
exists in `dist/`, and that each `<img>` carries `alt=""` (the photos are decorative — the
card already states the program name in its heading).
