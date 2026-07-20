# Program card imagery — design

**Date:** 2026-07-20
**Status:** approved, ready for implementation planning

Related: [CLAUDE.md](../../../CLAUDE.md) · [hero-images.md](../../hero-images.md)

## Problem

The four program cards on the home page each show an Apple emoji (🎺 🎻 🎤 🎭) centred in
a navy gradient block. The emoji are four unrelated illustration styles rendered at 2.1rem
inside a 92px band, which reads as clipart and undercuts a page whose job is partly
fundraising.

## Decision

Replace the emoji with a cropped photograph per card. The photo fills the band the
gradient block currently occupies; the title, summary and "View program →" link below it
are unchanged.

### The four images

| Program | Subject | Source | Rights |
|---|---|---|---|
| Marching Band & Color Guard | Blue sticks crossing chrome snare rims | `DSC_0464.JPG` — LAHS band, parent photo | Ours |
| Instrumental Music | Tuba bell flare, warm brass | `janosch-jost-jLhpu4-UL9I-unsplash.jpg` | Unsplash licence |
| Choir | Microphone grille, soft focus | `robinson-recalde-sT0n-Ie8OKo-unsplash.jpg` | Unsplash licence |
| Drama | Velour valance over a warm-lit cyclorama | `IMG_9464.jpg` — LAHS curtain call, parent photo | Ours |

All four are cropped past the point where any student is identifiable. This was a hard
requirement, and it is met by framing rather than by blurring or obscuring.

### Why not the alternatives

**Stock photography for all four is not reachable at this quality bar.** Openverse
searches restricted to CC0/public-domain returned nothing at all for "trumpet valves" or
"winter guard", and "color guard" in the CC pool means *military honour guard*. Allowing
CC-BY did not fix it — the results were amateur Flickr snapshots with no shared visual
register. Paid stock (Adobe/Getty) would work but was not pursued.

**Line icons (Lucide `drum`, `music-4`, `mic`, `drama`) were the runner-up** and remain
the fallback if the photo set ever has to be pulled. They are ISC-licensed and were
verified to render cleanly at 42px. The template should keep supporting them.

**Colour guard silks were tested for MBCG and rejected.** A crop of flying orange silks
cohered better with the warm brass and would have depicted the Color Guard half of the
program name. But without a visible pole it reads as two orange blobs, and no crop in the
available photos shows a pole without also showing a face or the *Hexed* backdrop
lettering. Snare sticks are less representative but legible.

### Known compromises

- **Drama is placeholder-grade.** The beige cyclorama reads flat at 92px and is close to a
  blank wall. It ships because it is honest, rights-clean and has no people in it. Replace
  it when the drama teacher supplies production photos.
- **The snare shot is the only outdoor-daylight frame**, so it is brighter and cooler than
  the other three. Accepted; the set is not perfectly unified.
- **No global colour grade.** Earlier tests applied desaturation and a navy wash across all
  four. The improvement was marginal and it would have applied to any future replacement
  image too, which is the wrong behaviour. Corrections belong in the crop, per image.

## Implementation shape

### Content-driven image paths

Each program's Markdown frontmatter gains an optional `cardImage`:

```yaml
title: Drama
order: 4
icon: "🎭"
cardImage: /images/programs/drama.jpg
```

`ProgramCard.astro` renders `cardImage` when present and falls back to `icon` in the
gradient block when absent. This matters because the overriding project goal is handoff to
a non-technical maintainer: swapping Drama later becomes a one-line edit in GitHub's web
editor plus a file upload, with no code change. It also means a program with no photo
degrades to today's behaviour rather than to a broken card.

`src/content.config.ts` adds `cardImage: z.string().optional()`.

### Assets

- **Output:** 1200×400 (3:1), JPEG, quality ~5, in `public/images/programs/`.
  The card band is roughly 280×92 CSS px at the 4-up desktop breakpoint, so 1200×400
  clears 2× on every breakpoint including the 1-up mobile layout.
- **Originals** go in `src/images/<year>/<Program>/`, gitignored, matching the hero
  convention. `IMG_9464.jpg` and the loose `Downloads` folders should be filed there.
- **Reproducible crops** — record these in `docs/program-card-images.md` alongside the
  hero recipes:

```bash
# MBCG — sticks over snares
ffmpeg -i DSC_0464.JPG -vf "crop=2100:700:2800:2400,scale=1200:-1" -q:v 5 mbcg.jpg
# Instrumental — tuba bell
ffmpeg -i janosch-jost-jLhpu4-UL9I-unsplash.jpg -vf "crop=2575:858:219:1500,scale=1200:-1" -q:v 5 instrumental-music.jpg
# Choir — microphone grille
ffmpeg -i robinson-recalde-sT0n-Ie8OKo-unsplash.jpg -vf "crop=2000:667:1150:1200,scale=1200:-1" -q:v 5 choir.jpg
# Drama — lit stage (source is only 1308px wide after crop; lowest-res of the four)
ffmpeg -i IMG_9464.jpg -vf "crop=1308:390:351:30,scale=1200:-1" -q:v 5 drama.jpg
```

### Accessibility and markup

- Images are **decorative** — each card already carries its program name as an `<h3>`, so
  the photo adds no information a screen reader needs. Use `alt=""`.
- The band keeps its fixed height with `object-fit: cover` (or a `background-size: cover`
  div, matching whichever the hero uses) so varying source ratios cannot break the grid.
- Cards remain a single `<a>` wrapping the whole tile; the photo must not become a second
  tab stop.

### Performance

Four images enter the home page above or near the fold. They should carry explicit
`width`/`height` to avoid layout shift. Astro's `astro:assets` is the obvious mechanism,
but the hero currently uses plain `public/` paths with CSS backgrounds — the
implementation should follow whichever pattern the hero already establishes rather than
introducing a second one.

## Testing

- `test/build.test.mjs` gains an assertion that all four program cards render an image and
  that each referenced `cardImage` file exists in `dist/`.
- A card whose program omits `cardImage` still builds and falls back to the emoji.
- Existing assertions (7 pages, one `<h1>` per page) must keep passing.

## Out of scope

- Replacing the Drama photograph. Tracked as follow-up.
- Any change to the hero carousel, nav, or the program pages themselves.
- Reworking the card layout, spacing, or the "View program →" affordance.
