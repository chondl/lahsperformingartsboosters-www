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
  Page bodies are **MDX** (`@astrojs/mdx`), which is what lets content files use the block
  palette; program pages stay plain Markdown.
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
    pages/{home,donate}.mdx  # singleton page bodies (Markdown + content blocks)
    pages/about.md           # plain Markdown — needs no blocks
    programs/{mbcg,instrumental-music,choir,drama}.md  # one file per program
  pages/
    index.astro              # Home — a thin shell; structure lives in home.mdx
    about.astro, donate.astro# render pages/*.{md,mdx}
    programs/[slug].astro     # ONE route renders all four program pages
  layouts/BaseLayout.astro    # <head>, fonts, header+footer wrapper; renders <h1> per page
  components/                 # Header (nav), Footer, HeroCarousel, ProgramCard
    content/                  # THE BLOCK PALETTE — tags usable in content files
  styles/global.css           # design tokens + base styles
public/
  _redirects                  # /donate/* short links (see below)
  images/                     # logos (logo-eagle.png, logo-seal.png); hero/ for photos
worker/index.js               # entry Worker: fetch=www→apex 301 + serve ASSETS; email=donate@ fan-out
wrangler.jsonc                # deploy config (assets, workers_dev:false, run_worker_first)
test/build.test.mjs           # asserts the 7 pages + _redirects build, and that no block dropped
test/content-purity.test.mjs  # asserts content files stay pure Markdown + palette tags
test/email-worker.test.mjs    # asserts donate@ email fan-out (DONATE_FORWARD_TO)
docs/                         # spec, plan, Cloudflare config record (see References)
content-drafts/               # original first-pass drafts (source for the content/ files)
```

## Editing content (the common task)

Content lives in Markdown so non-technical maintainers can edit it in GitHub's web editor.

- **Page copy:** `src/content/pages/{home,donate}.mdx` and `about.md`. Each has `title`
  frontmatter (rendered as the page `<h1>` for about/donate; Home's h1 is the hero). Don't add
  a duplicate top-level `#`/`##` title in the body.
- **Programs:** `src/content/programs/<slug>.md`. Frontmatter schema (`src/content.config.ts`):
  `title`, `order` (nav/card order), `summary` (home card text), `icon` (emoji),
  `showDonate` (defaults true), optional `googleGroupUrl`, optional `volunteerSheetUrl`.
  The last two render buttons at the page bottom; they are **omitted for now** because the
  real URLs don't exist yet — adding the line back per program restores the button, no code
  change needed. The body is the page
  prose; **don't repeat the title as a heading** (the template renders `<h1>{title}`).
- **Nav** is generated from the `programs` collection ordered by `order` — change it in one
  place (`Header.astro` + frontmatter), never in 7 files.

### Content blocks — the MDX palette

`home.mdx` and `donate.mdx` are Markdown *plus a small set of block tags*. The tags are the
page's structure: **delete a tag and that block disappears; put it back and it returns; move it
and the page reorders.** No code change either way.

The palette is exactly the files in **`src/components/content/`** — that directory *is* the list
of allowed tags:

| Tag | What it renders | Attributes |
|---|---|---|
| `<Hero title="…" subtitle="…" />` | Home hero: rotating photos + headline. Photos are code-side (see below). | `title` (required), `subtitle` |
| `<FindYourProgram eyebrow="…" heading="…" />` | The four program cards. The grid comes from the `programs` collection — never hand-listed. | `eyebrow`, `heading` |
| `<Prose>` … `</Prose>` | A body-copy section. Wraps home's Markdown; other pages get it from their template. | none |
| `<Reasons title="…">` … `</Reasons>` | The tinted "reasons to give" box on donate. Children are Markdown. | `title` |
| `<CTAButton href="/bts" label="…" />` | The primary donate button. | `href`, `label` (both required) |

Rules for content files — a test ([test/content-purity.test.mjs](test/content-purity.test.mjs))
enforces them:

- **Attributes are quoted strings.** No `{…}` expressions anywhere.
- **No `import` or `export`.** The route injects the components
  (`<Content components={{ Hero, … }} />`); content files never reach for them.
- **Only palette tags.** A tag with no matching `src/components/content/<Tag>.astro` fails the test.
- **Blank lines around Markdown children.** `<Reasons title="…">` needs an empty line before and
  after its bullet list, or MDX treats the children as raw text.

Adding a *new* block type is a developer task: create the component in `src/components/content/`,
add it to the route's `components={{…}}` map, and document it in the table above. Design record:
[docs/superpowers/specs/2026-07-24-content-blocks-mdx-design.md](docs/superpowers/specs/2026-07-24-content-blocks-mdx-design.md).

### Home hero photos

The home hero is a rotating carousel of real ensemble photos. The human drops camera
originals into `src/images/<year>/<Program>/` and expects **you to look at them, choose
the crop and focal point per image, and wire them in** — that is the job, don't hand it
back. Full procedure, including the ffmpeg recipes and why each slide needs its own
focal point: **[docs/hero-images.md](docs/hero-images.md)**. Read it before touching hero images.

Short version: uniform 16:9 at 2400×1350 into `public/images/hero/`; each slide carries a
`position` (CSS `background-position`) because the hero is ~4:1 on desktop and only ~43%
of the image height is visible there; show the human a review page in Chrome and get
approval before pushing; originals are gitignored.

### Home program-card photos

Each program card on the home page shows a cropped photo, set by `cardImage:` in that
program's frontmatter. Swapping one is a one-line frontmatter edit plus a file in
`public/images/programs/` — no code change. Remove the line and the card falls back to the
`icon:` emoji. Full procedure, the 92px-band constraint, and the ffmpeg recipes:
**[docs/program-card-images.md](docs/program-card-images.md)**.

Short version: uniform 1200×400; tight horizontal detail only (texture survives the crop,
smooth silhouettes don't); no identifiable students; colour-correct in the crop, never as a
CSS filter. **Drama is a placeholder** pending photos from the drama teacher.

### Donation links — everything goes to `/bts`

There is **one** donation destination: `/bts`, a Cloudflare Single Redirect rule (NOT in
`_redirects`) pointing at the JotForm Back-to-School campaign. See
[docs/cloudflare-configuration.md](docs/cloudflare-configuration.md) §7b. Always link to
`/bts` — never the JotForm URL directly — so traffic stays on our own domain and the
target can be changed in one place each year.

The old per-program `/donate/mbcg|instrumental|choir|drama` short links were removed;
donors pick their program *on the form*. `public/_redirects` is now empty of rules.

**Marching Band & Color Guard is the exception:** it runs its own campaign, separate from
Back-to-School. Its program page sets `showDonate: false` and carries no donate button.

### Who receives `donate@` email

`donate@lahsperformingartsboosters.org` fans out to several board members via the Worker's
`email()` handler. **To add/remove a recipient, edit the `DONATE_FORWARD_TO` array in
`worker/index.js` and push** — but a new address must first be a *verified* Cloudflare Email
Routing destination. Full steps: [docs/cloudflare-configuration.md](docs/cloudflare-configuration.md) §6d.
(A single Cloudflare rule can only forward to one address, which is why this is done in code.)

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
- **Two org names — use the right one.** *Los Altos High Eagle Band Boosters* is the
  **legal name**; *Los Altos High School Performing Arts Boosters* (LAHS PAB) is the
  **DBA** and the name the school community knows. Use the **legal name** wherever money or
  legal identity is involved — check payees, donor-advised fund grant recipients, employer
  matching portal lookups, and any statement of the EIN or 501(c)(3) status. Use the **DBA**
  everywhere else: page titles, nav, headings, prose, **and the mailing address** — school
  staff route mail by the DBA, so an envelope addressed to the legal name may not reach us.
  A mailed check therefore carries *both*: payable to the legal name, addressed to the DBA.
  `test/build.test.mjs` asserts the EIN never ships alongside the DBA alone.
- Org emails are domain addresses: `president@` / `treasurer@` / `donate@lahsperformingartsboosters.org`
  (forwarding aliases via Cloudflare Email Routing — see [docs/cloudflare-configuration.md](docs/cloudflare-configuration.md) §6).

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

- **Plan 2 — JotForm form-sync tool** (`docs/superpowers/specs` §8): **superseded.** The
  four per-program forms were collapsed into one Back-to-School form with a program picker,
  reached via `/bts`, so there is nothing left to sync. Don't build it.
- **Google Group + volunteer-sheet buttons — coming back.** Both were removed because only
  `PLACEHOLDER` URLs existed. The schema and template still support them: add
  `googleGroupUrl:` / `volunteerSheetUrl:` to a program's frontmatter and the button
  returns. The MBCG volunteer sheet lands after band camp (Aug 8); Google Group links are
  expected within a few weeks of that.
- **MBCG campaign launch (Aug 8).** MBCG's own fundraising campaign and volunteer plans are
  presented at the end of band camp. Its page currently tells families to wait.
- **Hero photos — ongoing.** The first six shipped (2026 season). More originals will be
  dropped into `src/images/` for cropping; see [docs/hero-images.md](docs/hero-images.md).
  The "Hexed" field shot is 2025-26 show content and should be swapped once a new show exists.
- **Drama card photo — placeholder.** The home card uses a lit-stage crop from a curtain
  call; it reads flat at 92px and its source is the lowest-resolution of the four. Ask the
  drama teacher for production photos — stage lighting, rigging, or a lit set, not posed
  cast shots (all faces at this crop). See
  [docs/program-card-images.md](docs/program-card-images.md).

## Process notes

- This project was built with the **superpowers** workflow (brainstorm → spec → plan →
  subagent-driven implementation). The spec and plan are the design record:
  - Spec: `docs/superpowers/specs/2026-06-11-lahs-pab-website-design.md`
  - Plan: `docs/superpowers/plans/2026-06-11-lahs-pab-website.md`
- `.superpowers/` is **gitignored scratch** (visual-companion mockups); ignore it.
- For new features, follow the same flow (brainstorm → spec → plan) rather than coding
  straight away. Keep commits small and conventional (`feat:`, `fix:`, `chore:`, `docs:`).
- User preference: **do not put time estimates or priorities** in plans/todos.
