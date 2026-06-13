# Spec — Mobile-responsive layout & navigation

Date: 2026-06-13
Status: Approved (design)

## Problem

The LAHS PAB site renders only for desktop widths. The viewport meta tag is
present, but the layout does not adapt below ~820px:

- The header is a single flex row (brand + Home + About + Programs hover-dropdown
  + Donate). On a phone it overflows and the hover-only dropdown is unusable on
  touch. **This is the primary failure.**
- The hero h1 is a fixed `2.8rem` at `460px` height — oversized on small screens.
- The footer is a three-column flex row (`margin-left:auto` on the last block)
  that collides on narrow widths.
- Prose tables (the MBCG season calendar) use `table-layout: fixed` with fixed
  column percentages and are too wide to read on a phone.
- Program cards drop to 2 columns at 820px but stay cramped on small phones.

## Goal

Make every page's content and navigation usable on a phone, without adding tooling
or dependencies and without changing any content Markdown. Honor existing design
conventions: gold as a subtle accent only, exactly one `<h1>` per page, the
Programs menu stays keyboard-accessible.

## Approach

Pure CSS media queries plus a small extension of the toggle JS already in
`Header.astro`. One primary breakpoint at **720px**, with a small-phone tweak at
**~520px** for the program grid.

### 1. Header / navigation (`src/components/Header.astro`)

- Below 720px, hide the desktop link row and show a **hamburger button** (`☰`)
  at the right of the brand. The button toggles a full-width vertical nav panel
  (navy background) listing, in order: Home, About, the four program links shown
  as a flat indented list (no hover-dropdown on touch), then Donate.
- Reuse the existing `.open`-class + click/Escape JS pattern and the
  `aria-expanded` contract; extend it to the hamburger toggle. The Programs
  hover-dropdown remains for desktop (≥720px).
- Brand text shrinks slightly below 720px so "Performing Arts Boosters" fits.
- The hamburger button must be keyboard-operable and carry
  `aria-expanded` / `aria-controls`.

### 2. Hero (`src/components/HeroCarousel.astro`)

- Fluid h1 via `clamp()` (~1.6rem phone → 2.8rem desktop).
- Reduce hero height (~360px) and tighten padding below 720px.
- Subtitle wraps; CTA buttons stack and become comfortably tappable.

### 3. Program cards (`src/pages/index.astro`)

- Keep 4-col desktop → 2-col at 820px → **1-col below ~520px**.

### 4. Footer (`src/components/Footer.astro`)

- Below 720px the three blocks stack vertically, left-aligned; drop
  `margin-left:auto` so nothing collides.

### 5. Prose tables (`src/styles/global.css`)

- Below 720px allow `.prose table` to **scroll horizontally** within its
  container (e.g. wrapping rule / `display:block; overflow-x:auto` on the table),
  and slightly increase the small font for legibility. No per-table markup
  changes — maintainers' Markdown is untouched.

## Out of scope

- No JS framework, no CSS framework, no build-tooling changes.
- No content rewrites.
- No slide-in drawer or other heavier nav patterns.

## Verification

- `npm run build` succeeds; `npm test` passes (the 7-page + `_redirects` assertions).
- Manually check Home, About, Donate, and a program page (MBCG, with its table) at
  a phone width: nav opens/closes via tap and keyboard, no horizontal page
  overflow, hero text fits, footer stacks, calendar table scrolls.
