# CLAUDE.md — LAHS Performing Arts Boosters website

Guidance for AI agents and future sessions working in this repo.

## What this is

A small (7-page) **static marketing/info site** for the **Los Altos High School
Performing Arts Boosters (PAB)** — a parent-led 501(c)(3) (EIN 77-0525170) supporting the
school's Marching Band & Color Guard, Instrumental Music, Choir, and Drama programs.

- **Live:** https://lahsperformingartsboosters.org (apex is canonical; `www` 301s to it; HTTP→HTTPS enforced)
- **Repo:** `github.com/chondl/lahsperformingartsboosters-www` (public), production branch `main`
- **Overriding goal:** stay **simple and maintainable enough to hand off to a non-technical
  maintainer.** Bias every change toward that. Content is editable as Markdown in GitHub's
  web UI; no local tooling needed to update copy.

## Commands

```bash
npm run dev       # local dev server (astro dev)
npm run build     # build static site to dist/
npm run preview   # preview the built site
npm test          # node --test — post-build assertions (run AFTER npm run build)
npx wrangler deploy --dry-run   # validate the Worker/assets deploy config
```

Deploy is automatic: **push to `main` → Cloudflare Workers Builds runs `npm run build` then
`npx wrangler deploy`.** Do not deploy by hand.

## Tech stack & gotchas

- **Astro 6** (static output). **Use the modern Content Layer API**, not the legacy one:
  collections are defined in `src/content.config.ts` with `glob()` loaders; render with
  `import { render } from 'astro:content'` and `await render(entry)` (NOT `entry.render()`);
  entry identifier is **`entry.id`** (NOT `entry.slug`). The legacy API is removed in Astro 6.
- **Node 24+.** The test script must use a glob (`node --test "test/**/*.test.mjs"`); bare
  `node --test test/` is broken on Node 24.
- **Cloudflare Workers + Static Assets** (not classic Pages). Hosting/deploy contract is
  `wrangler.jsonc`. Fonts are self-hosted via `@fontsource` (Raleway + Nunito Sans).
- **No SSR / no server runtime.** Pure static output; the only Worker logic is host
  canonicalization (see `worker/index.js`).

## Layout

```
src/
  content.config.ts          # collection schemas (programs, pages) — Content Layer API
  content/
    pages/{home,about,donate}.md     # singleton page bodies (Markdown)
    programs/{mbcg,instrumental-music,choir,drama}.md  # one file per program
  pages/
    index.astro              # Home (hero + program cards + home.md body)
    about.astro, donate.astro# render pages/*.md
    programs/[slug].astro     # ONE route renders all four program pages
  layouts/BaseLayout.astro    # <head>, fonts, header+footer wrapper; renders <h1> per page
  components/                 # Header (nav), Footer, HeroCarousel, ProgramCard
  styles/global.css           # design tokens + base styles
public/
  _redirects                  # /donate/* short links (see below)
  images/                     # logos (logo-eagle.png, logo-seal.png); hero/ for photos
worker/index.js               # entry Worker: www→apex 301, else serve ASSETS
wrangler.jsonc                # deploy config (assets, workers_dev:false, run_worker_first)
test/build.test.mjs           # asserts the 7 pages + _redirects build
docs/                         # spec, plan, Cloudflare config record (see References)
content-drafts/               # original first-pass drafts (source for the content/ files)
```

## Editing content (the common task)

Content lives in Markdown so non-technical maintainers can edit it in GitHub's web editor.

- **Page copy:** `src/content/pages/{home,about,donate}.md`. Each has `title` frontmatter
  (rendered as the page `<h1>` for about/donate; Home's h1 is the hero). Don't add a
  duplicate top-level `#`/`##` title in the body.
- **Programs:** `src/content/programs/<slug>.md`. Frontmatter schema (`src/content.config.ts`):
  `title`, `order` (nav/card order), `donateSlug`, `summary` (home card text), `icon` (emoji),
  optional `googleGroupUrl`, optional `volunteerSheetUrl` (MBCG only). The body is the page
  prose; **don't repeat the title as a heading** (the template renders `<h1>{title}`).
- **Nav** is generated from the `programs` collection ordered by `order` — change it in one
  place (`Header.astro` + frontmatter), never in 7 files.

### Donation links — `public/_redirects`

`/donate/mbcg|instrumental|choir|drama` 302-redirect to JotForm. Targets are currently
**placeholders** (`https://form.jotform.com/REPLACE_*`). These will be filled by **Plan 2**
(the JotForm form-sync tool). Workers Static Assets honors `_redirects`.

### `www` → apex redirect is in code (not a Cloudflare rule)

`worker/index.js` 301s `www` to the apex. `wrangler.jsonc` sets `run_worker_first: true` so
the Worker runs before asset matching. This avoids depending on a Cloudflare Single-Redirect
permission. See `docs/cloudflare-configuration.md` §9.

## Conventions (don't regress these)

**Content voice & accuracy**
- Content is **evergreen** — describe what the org does in any year; avoid specific dates,
  scores, or one-off show titles. **Exception: the Marching Band & Color Guard page**
  (`programs/mbcg.md`) intentionally carries **current-season** detail — the fall show
  theme + images and the full dated season calendar — refreshed each year. Don't strip that
  dated content thinking it violates "evergreen"; just update it each season.
- **The school runs the performances and curriculum; the Boosters _support_.** Never imply
  the Boosters run programs or "host" the Fall Festival (the school hosts it).
- **Marching Band & Color Guard is organizationally part of Instrumental Music** but has its
  own page due to its size; the two pages cross-reference each other.
- **Instrumental Music** is the umbrella for the bands, orchestras, and jazz band — say so.
- The spring **musical is biennial** (most recently 2026; next ~Feb 2028).
- Program **directors are credited** on each program page (update if staff change).
- Org emails are domain addresses: `president@` / `treasurer@lahsperformingartsboosters.org`.

**Design** (matches the approved mockup; see spec §4)
- Palette: navy `#103A6B`, royal blue `#2E6DB4`, **gold `#F4A81E` only as a subtle accent**
  (eyebrow underline, hover) — never as a fill. Fonts: Raleway (headings) + Nunito Sans (body).
- Every page must have exactly one `<h1>`. Keep the Programs dropdown keyboard-accessible.

## Deployment & Cloudflare

- Auto-deploy on push to `main`. The `*.workers.dev` URL is **disabled** (`workers_dev:false`)
  — the site serves only on the custom domain.
- **Cloudflare account config is NOT in version control.** Custom domains, Always Use HTTPS,
  and Email Routing were applied via the dashboard + REST API and are fully documented in
  **`docs/cloudflare-configuration.md`** (with exact API calls, verify commands, and undo
  steps). Read it before touching Cloudflare.
- **Never commit secrets.** The Cloudflare API token lives in a file outside the repo
  (`~/lahsperformingartsboosters-www-claude.txt`); read it at runtime, never echo or commit it.

## Roadmap / pending

- **Plan 2 — JotForm form-sync tool** (`docs/superpowers/specs` §8): a config-as-code CLI
  that clones a base JotForm into the four program donation forms and rewrites the
  `/donate/*` targets in `public/_redirects`. Not built yet.
- **Content placeholders to replace** when material is available: real ensemble photos
  (`public/images/hero/`, list them in `index.astro`); real Google Group + volunteer-sheet
  URLs (currently `PLACEHOLDER`); the full ~25-entry MBCG season calendar.

## Process notes

- This project was built with the **superpowers** workflow (brainstorm → spec → plan →
  subagent-driven implementation). The spec and plan are the design record:
  - Spec: `docs/superpowers/specs/2026-06-11-lahs-pab-website-design.md`
  - Plan: `docs/superpowers/plans/2026-06-11-lahs-pab-website.md`
- `.superpowers/` is **gitignored scratch** (visual-companion mockups); ignore it.
- For new features, follow the same flow (brainstorm → spec → plan) rather than coding
  straight away. Keep commits small and conventional (`feat:`, `fix:`, `chore:`, `docs:`).
- User preference: **do not put time estimates or priorities** in plans/todos.
