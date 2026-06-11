# LAHS Performing Arts Boosters Website — Implementation Plan (Plan 1: Website + Deployment)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build and deploy a 7-page static Astro website for the LAHS Performing Arts Boosters to Cloudflare Pages on `lahsperformingartsboosters.org`, with HTTPS, clean `/donate/*` redirects (placeholder targets), and `president@`/`treasurer@` email routing.

**Architecture:** A static Astro site. Shared `BaseLayout`, `Header`, and `Footer` components are defined once. All page prose lives in Markdown content collections so a non-technical maintainer can edit it in the GitHub web editor. Program pages (incl. Marching Band & Color Guard, which carries an extra season calendar + volunteer link) render from one dynamic route. Donation links are short URLs handled by a Cloudflare Pages `_redirects` file. Cloudflare Pages builds from GitHub on every push; domain, HTTPS, the www→apex redirect, and email routing are configured via the Cloudflare API.

**Tech Stack:** Astro (static output), `@fontsource` (Raleway + Nunito Sans), vanilla JS hero carousel, Cloudflare Pages, Cloudflare API (DNS / redirects / email routing), GitHub (`gh` CLI), Wrangler (verification only).

**Scope note:** The **JotForm form-sync CLI** (spec §8) is a separate, independent subsystem and is covered by **Plan 2**. This plan ships the site with placeholder donation redirect targets; Plan 2 swaps in real JotForm form IDs. The site is fully functional and publishable without Plan 2.

**Reference:** Design spec at `docs/superpowers/specs/2026-06-11-lahs-pab-website-design.md`. First-pass page content already drafted in `content-drafts/` (this plan migrates it into Astro content collections).

**Owner-provided inputs needed before Phase 5:**
- A Cloudflare API token with scopes from spec §9 (Pages: Edit; DNS: Edit; Zone: Read; Email Routing Rules: Edit; Email Routing Addresses: Edit; Account Settings: Read).
- Destination inbox addresses for `president@` and `treasurer@` forwarding (recipients available to click a verification email).
- The one-time Cloudflare→GitHub authorization click (Task 5.1).

---

## File Structure

```
pab-website/
├── astro.config.mjs              # Astro config (site URL, static)
├── package.json                  # deps + scripts
├── tsconfig.json                 # Astro TS config
├── public/
│   ├── _redirects                # /donate/* short links (placeholder targets)
│   ├── favicon.svg → favicon.ico # eagle mark favicon
│   └── images/
│       ├── logo-eagle.png        # header/footer mark
│       ├── logo-seal.png         # footer seal + hero
│       └── hero/                 # ensemble photos (placeholders initially)
├── src/
│   ├── styles/global.css         # design tokens + base styles
│   ├── layouts/BaseLayout.astro  # <head>, fonts, header+footer wrapper
│   ├── components/
│   │   ├── Header.astro          # nav (Home/About/Programs▾/Donate) + logo
│   │   ├── Footer.astro          # seal, address, EIN
│   │   ├── HeroCarousel.astro    # auto-rotating ensemble photos
│   │   └── ProgramCard.astro     # home "find your program" card
│   ├── content/
│   │   ├── config.ts             # collection schemas (programs, pages)
│   │   ├── pages/                # home.md, about.md, donate.md (singletons)
│   │   └── programs/             # mbcg.md, instrumental-music.md, choir.md, drama.md
│   └── pages/
│       ├── index.astro           # Home
│       ├── about.astro           # About & Contact
│       ├── donate.astro          # Donate
│       └── programs/[slug].astro # one route → all four program pages
├── scripts/
│   └── cf-setup.sh               # Cloudflare domain/HTTPS/redirect/email setup (API)
└── test/
    └── build.test.mjs            # post-build assertions (pages + _redirects exist)
```

---

## Phase 0 — Project scaffold & GitHub repo

### Task 0.1: Initialize the Astro project (manual scaffold, preserving existing files)

**Files:**
- Create: `package.json`, `astro.config.mjs`, `tsconfig.json`
- Modify: `.gitignore` (already excludes `node_modules/`, `dist/`, `.astro/`)

- [ ] **Step 1: Create `package.json`**

```json
{
  "name": "lahsperformingartsboosters-www",
  "type": "module",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "astro dev",
    "build": "astro build",
    "preview": "astro preview",
    "test": "node --test test/"
  }
}
```

- [ ] **Step 2: Install Astro and fonts**

Run:
```bash
npm install astro@latest
npm install @fontsource/raleway @fontsource/nunito-sans
```
Expected: `node_modules/` created; `astro` and both fontsource packages in `package.json` dependencies.

> **Font note (spec §4 deviation, intentional):** the spec says fonts load "from Google Fonts." We self-host the same families via `@fontsource` instead — identical typefaces (Raleway + Nunito Sans), but no third-party request, faster, and no layout shift. This is a deliberate, strictly-better choice.
>
> **Astro 5.x note:** `astro@latest` installs Astro 5.x. The content-collection patterns in Phase 2 (`src/content/config.ts`, `getEntry`, `entry.render()`) still work but emit deprecation warnings. They are fine to use as written. If you prefer warning-free output, the modern equivalents are: put the schema in `src/content.config.ts` using a `glob()` loader, import `render` from `astro:content`, and call `render(entry)` instead of `entry.render()`. Either is acceptable; the legacy form keeps this plan's code copy-paste-ready.

- [ ] **Step 3: Create `astro.config.mjs`**

```js
import { defineConfig } from 'astro/config';

export default defineConfig({
  site: 'https://lahsperformingartsboosters.org',
  // static output (default). Pages handles redirects via public/_redirects.
});
```

- [ ] **Step 4: Create `tsconfig.json`**

```json
{ "extends": "astro/tsconfigs/strict" }
```

- [ ] **Step 5: Verify the toolchain builds (empty project)**

Run: `npx astro build`
Expected: build runs and warns "no pages" (or builds an empty `dist/`). No crash. (Pages get added in Phase 2.)

- [ ] **Step 6: Commit**

```bash
git add package.json package-lock.json astro.config.mjs tsconfig.json
git commit -m "chore: scaffold Astro project"
```

### Task 0.2: Create and push the GitHub repository

**Files:** none (repo already initialized locally with commits)

- [ ] **Step 1: Create the public GitHub repo and push**

Run:
```bash
gh repo create lahsperformingartsboosters-www \
  --public \
  --source=. \
  --remote=origin \
  --description "Website for the Los Altos High School Performing Arts Boosters" \
  --push
```
Expected: repo created under the `chondl` account; local commits pushed; `origin` set.

- [ ] **Step 2: Verify**

Run: `gh repo view --web` (or `git remote -v`)
Expected: remote points at `github.com/chondl/lahsperformingartsboosters-www`; default branch pushed.

---

## Phase 1 — Design system & shared layout

### Task 1.1: Add logo assets and favicon

**Files:**
- Create: `public/images/logo-seal.png`, `public/images/logo-eagle.png`, `public/favicon.ico`

- [ ] **Step 1: Download the official logos into the repo**

Run:
```bash
mkdir -p public/images public/images/hero
curl -sL "https://files.smartsites.parentsquare.com/10944/header_logo_img_o7t6n344rhflefnddfl.png" -o public/images/logo-seal.png
curl -sL "https://files.smartsites.parentsquare.com/10944/footer_logo_img_0l48v8qgss6kbpmhhfm.png" -o public/images/logo-eagle.png
file public/images/logo-*.png
```
Expected: two PNGs (seal 400×400, eagle 160×160).

- [ ] **Step 2: Generate the favicon from the eagle mark**

Run:
```bash
npx --yes sharp-cli@latest -i public/images/logo-eagle.png -o public/favicon-32.png resize 32 32 \
  || npx --yes @squoosh/cli --resize '{"width":32,"height":32}' -d public public/images/logo-eagle.png
cp public/images/logo-eagle.png public/favicon.ico  # fallback if no converter; browsers accept PNG-in-.ico for modern use
```
Expected: a favicon asset exists in `public/`. (A 32×32 eagle is fine; exact tool may vary.)

- [ ] **Step 3: Commit**

```bash
git add public/images/logo-*.png public/favicon*
git commit -m "feat: add LAHS logo assets and favicon"
```

### Task 1.2: Global styles / design tokens

**Files:**
- Create: `src/styles/global.css`

- [ ] **Step 1: Write `src/styles/global.css`** (palette + type from the approved mockup)

```css
:root {
  --navy: #103A6B;
  --navy-d: #0c2c52;
  --royal: #2E6DB4;
  --gold: #F4A81E;        /* subtle accent ONLY */
  --bg: #F4F6F8;
  --ink: #222;
  --line: #e2e7ec;
  --maxw: 1120px;
}
* { box-sizing: border-box; margin: 0; padding: 0; }
html { scroll-behavior: smooth; }
body {
  font-family: "Nunito Sans", system-ui, sans-serif;
  color: var(--ink);
  background: #fff;
  line-height: 1.6;
}
h1, h2, h3, h4 { font-family: "Raleway", system-ui, sans-serif; color: var(--navy); line-height: 1.2; }
a { color: var(--royal); text-decoration: none; }
a:hover { text-decoration: underline; }
.container { max-width: var(--maxw); margin: 0 auto; padding: 0 24px; }
.section { padding: 56px 0; }
.eyebrow {
  display: inline-block; color: var(--royal); font-family: "Raleway"; font-weight: 800;
  text-transform: uppercase; letter-spacing: 1.6px; font-size: .78rem;
  border-bottom: 2px solid var(--gold); padding-bottom: 3px; margin-bottom: 10px;
}
.btn { display: inline-block; padding: 12px 24px; border-radius: 7px; font-family: "Raleway"; font-weight: 700; }
.btn-primary { background: var(--royal); color: #fff; }
.btn-primary:hover { background: #3a86d6; text-decoration: none; }
/* Markdown content styling */
.prose h2 { margin: 1.6em 0 .4em; font-size: 1.6rem; }
.prose h3 { margin: 1.2em 0 .3em; font-size: 1.2rem; }
.prose p, .prose ul, .prose table { margin: 0 0 1em; }
.prose ul { padding-left: 1.2em; }
.prose table { border-collapse: collapse; width: 100%; }
.prose th, .prose td { border: 1px solid var(--line); padding: 8px 10px; text-align: left; font-size: .95rem; }
.prose th { background: var(--bg); font-family: "Raleway"; }
```

- [ ] **Step 2: Commit**

```bash
git add src/styles/global.css
git commit -m "feat: add global styles and design tokens"
```

### Task 1.3: BaseLayout, Header, Footer

**Files:**
- Create: `src/layouts/BaseLayout.astro`, `src/components/Header.astro`, `src/components/Footer.astro`

- [ ] **Step 1: Write `src/components/Header.astro`** (nav driven by the programs collection)

```astro
---
import { getCollection } from 'astro:content';
const programs = (await getCollection('programs')).sort((a, b) => a.data.order - b.data.order);
---
<header class="site-header">
  <div class="container nav">
    <a href="/" class="brand">
      <img src="/images/logo-eagle.png" alt="LAHS eagle" width="46" height="46" />
      <span class="brand-text">
        <span class="brand-sub">Los Altos High School</span>
        <span class="brand-title">Performing Arts Boosters</span>
      </span>
    </a>
    <nav class="menu">
      <a href="/">Home</a>
      <a href="/about/">About</a>
      <div class="dropdown">
        <button class="dropbtn" aria-haspopup="true">Programs ▾</button>
        <div class="dropdown-content">
          {programs.map((p) => <a href={`/programs/${p.slug}/`}>{p.data.title}</a>)}
        </div>
      </div>
      <a class="donate" href="/donate/">Donate</a>
    </nav>
  </div>
</header>
<style>
  .site-header { background: var(--navy); }
  .nav { display: flex; align-items: center; gap: 16px; padding: 14px 24px; }
  .brand { display: flex; align-items: center; gap: 12px; }
  .brand img { border-radius: 50%; background: #fff; }
  .brand-text { display: flex; flex-direction: column; line-height: 1.12; }
  .brand-sub { font-size: .72rem; color: #9fb8dd; text-transform: uppercase; letter-spacing: 2px; font-weight: 700; font-family: "Raleway"; }
  .brand-title { font-weight: 900; font-size: 1.25rem; color: #fff; font-family: "Raleway"; }
  .menu { margin-left: auto; display: flex; align-items: center; gap: 22px; font-family: "Raleway"; font-weight: 700; }
  .menu > a, .dropbtn { color: #dce6f4; background: none; border: none; font: inherit; cursor: pointer; }
  .menu > a:hover, .dropbtn:hover { color: #fff; text-decoration: none; }
  .menu .donate { border: 1.5px solid #6f93c4; color: #fff; padding: 8px 18px; border-radius: 6px; }
  .menu .donate:hover { border-color: var(--gold); }
  .dropdown { position: relative; }
  .dropdown-content { display: none; position: absolute; top: 100%; left: 0; background: #fff; min-width: 230px; box-shadow: 0 8px 24px rgba(0,0,0,.18); border-radius: 8px; overflow: hidden; z-index: 20; }
  .dropdown:hover .dropdown-content, .dropdown:focus-within .dropdown-content { display: block; }
  .dropdown-content a { display: block; padding: 11px 16px; color: var(--navy); }
  .dropdown-content a:hover { background: var(--bg); text-decoration: none; }
</style>
```

- [ ] **Step 2: Write `src/components/Footer.astro`**

```astro
---
const year = new Date().getFullYear();
---
<footer class="site-footer">
  <div class="container foot">
    <img src="/images/logo-seal.png" alt="LAHS seal" width="74" height="74" />
    <div>
      <strong>LAHS Performing Arts Boosters</strong><br />
      201 Almond Avenue, Los Altos, CA 94022 · EIN 77-0525170
    </div>
    <div class="spacer">A 501(c)(3) nonprofit · &copy; {year}<br />lahsperformingartsboosters.org</div>
  </div>
</footer>
<style>
  .site-footer { background: var(--navy-d); color: #cdd9ea; font-size: .88rem; margin-top: 48px; }
  .foot { display: flex; gap: 20px; align-items: center; padding: 34px 24px; }
  .foot strong { color: #fff; font-family: "Raleway"; }
  .foot .spacer { margin-left: auto; text-align: right; color: #9fb3d1; font-size: .8rem; }
</style>
```

- [ ] **Step 3: Write `src/layouts/BaseLayout.astro`** (imports fonts + global css; wraps header/footer)

```astro
---
import '@fontsource/raleway/600.css';
import '@fontsource/raleway/700.css';
import '@fontsource/raleway/800.css';
import '@fontsource/raleway/900.css';
import '@fontsource/nunito-sans/400.css';
import '@fontsource/nunito-sans/600.css';
import '@fontsource/nunito-sans/700.css';
import '../styles/global.css';
import Header from '../components/Header.astro';
import Footer from '../components/Footer.astro';

const { title, description } = Astro.props;
const siteTitle = 'LAHS Performing Arts Boosters';
const fullTitle = title ? `${title} · ${siteTitle}` : siteTitle;
---
<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <link rel="icon" href="/favicon.ico" />
    <title>{fullTitle}</title>
    {description && <meta name="description" content={description} />}
  </head>
  <body>
    <Header />
    <main>
      <slot />
    </main>
    <Footer />
  </body>
</html>
```

- [ ] **Step 4: Commit**

```bash
git add src/layouts/BaseLayout.astro src/components/Header.astro src/components/Footer.astro
git commit -m "feat: add base layout, header, and footer"
```

---

## Phase 2 — Content collections & pages

### Task 2.1: Define content collection schemas

**Files:**
- Create: `src/content/config.ts`

- [ ] **Step 1: Write `src/content/config.ts`**

```ts
import { defineCollection, z } from 'astro:content';

const programs = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    order: z.number(),                 // nav + card ordering
    donateSlug: z.string(),            // matches /donate/<slug>
    summary: z.string(),               // short text for home cards
    icon: z.string().optional(),       // emoji/icon for cards
    googleGroupUrl: z.string().url().optional(),
    volunteerSheetUrl: z.string().url().optional(),  // MBCG
  }),
});

const pages = defineCollection({
  type: 'content',
  schema: z.object({ title: z.string(), description: z.string().optional() }),
});

export const collections = { programs, pages };
```

- [ ] **Step 2: Verify schema compiles**

Run: `npx astro sync`
Expected: `astro sync` completes without schema errors (no content yet is fine).

- [ ] **Step 3: Commit**

```bash
git add src/content/config.ts
git commit -m "feat: define programs and pages content collections"
```

### Task 2.2: Migrate page + program content from `content-drafts/`

**Files:**
- Create: `src/content/pages/home.md`, `about.md`, `donate.md`
- Create: `src/content/programs/mbcg.md`, `instrumental-music.md`, `choir.md`, `drama.md`

- [ ] **Step 1: Create the program Markdown files** with schema-valid frontmatter, using the bodies from `content-drafts/`. Example — `src/content/programs/mbcg.md` frontmatter (body = the prose from `content-drafts/marching-band-color-guard.md`, including its season-calendar Markdown table):

```md
---
title: Marching Band & Color Guard
order: 1
donateSlug: mbcg
summary: Camp, competitions, and football performances — part of Instrumental Music.
icon: "🎺"
googleGroupUrl: https://groups.google.com/PLACEHOLDER-mbcg
volunteerSheetUrl: https://docs.google.com/spreadsheets/d/PLACEHOLDER/edit
---

<!-- body copied from content-drafts/marching-band-color-guard.md (below the draft frontmatter) -->
```

Repeat for the other three using their draft bodies and these frontmatter values:
- `instrumental-music.md`: order 2, donateSlug `instrumental`, summary "The bands, orchestras, and jazz band."
- `choir.md`: order 3, donateSlug `choir`, summary "Vocal ensembles, festivals, and Spring Sing."
- `drama.md`: order 4, donateSlug `drama`, summary "Plays, the musical, and student-directed shows."

> Drop the draft-only `page:`/`slug:`/`draft:` frontmatter keys; keep the prose. Set placeholder Google Group / volunteer-sheet URLs (owner supplies real ones later).

- [ ] **Step 2: Create the singleton page files** `src/content/pages/{home,about,donate}.md` with `title:` frontmatter and the bodies from the matching `content-drafts/` files.

- [ ] **Step 3: Verify content validates**

Run: `npx astro sync`
Expected: completes with no Zod schema errors. Fix any frontmatter mismatch reported.

- [ ] **Step 4: Commit**

```bash
git add src/content/pages src/content/programs
git commit -m "feat: migrate page and program content into collections"
```

### Task 2.3: Program page route

**Files:**
- Create: `src/pages/programs/[slug].astro`

- [ ] **Step 1: Write `src/pages/programs/[slug].astro`**

```astro
---
import { getCollection } from 'astro:content';
import BaseLayout from '../../layouts/BaseLayout.astro';

export async function getStaticPaths() {
  const programs = await getCollection('programs');
  return programs.map((p) => ({ params: { slug: p.slug }, props: { program: p } }));
}

const { program } = Astro.props;
const { Content } = await program.render();
const d = program.data;
---
<BaseLayout title={d.title} description={d.summary}>
  <article class="container section prose">
    <Content />
    <div class="program-actions">
      {d.volunteerSheetUrl && <a class="btn btn-primary" href={d.volunteerSheetUrl}>Volunteer sign-up sheet</a>}
      {d.googleGroupUrl && <a class="btn" href={d.googleGroupUrl}>Join the Google Group</a>}
      <a class="btn btn-primary" href={`/donate/${d.donateSlug}`}>Donate to {d.title}</a>
    </div>
  </article>
</BaseLayout>
<style>
  .program-actions { display: flex; flex-wrap: wrap; gap: 12px; margin-top: 28px; padding-top: 20px; border-top: 1px solid var(--line); }
</style>
```

- [ ] **Step 2: Verify all four program pages build**

Run: `npx astro build`
Expected: `dist/programs/mbcg/index.html` and the other three exist.

- [ ] **Step 3: Commit**

```bash
git add src/pages/programs/[slug].astro
git commit -m "feat: render program pages from one dynamic route"
```

### Task 2.4: Hero carousel + ProgramCard components

**Files:**
- Create: `src/components/HeroCarousel.astro`, `src/components/ProgramCard.astro`

- [ ] **Step 1: Write `src/components/HeroCarousel.astro`** (reads an images prop; falls back to a branded gradient if empty)

```astro
---
// images: string[] of /images/hero/*.jpg paths. Empty array → gradient-only hero.
const { images = [], title, subtitle } = Astro.props;
---
<section class="hero">
  <div class="slides">
    {images.length === 0 && <div class="slide on gradient"></div>}
    {images.map((src, i) => (
      <div class={`slide ${i === 0 ? 'on' : ''}`} style={`background-image:url('${src}')`}></div>
    ))}
  </div>
  <div class="scrim"></div>
  <div class="container hero-content">
    <p class="kick">Parent-led · 501(c)(3) nonprofit</p>
    <h1>{title}</h1>
    {subtitle && <p class="sub">{subtitle}</p>}
    <div class="cta">
      <a class="btn btn-primary" href="#find-your-program">Find your program</a>
      <a class="btn ghost" href="/donate/">Donate</a>
    </div>
  </div>
</section>
<style>
  .hero { position: relative; height: 460px; overflow: hidden; background: var(--navy-d); }
  .slides, .slide { position: absolute; inset: 0; }
  .slide { background-size: cover; background-position: center; opacity: 0; transition: opacity 1.1s ease; }
  .slide.on { opacity: 1; }
  .slide.gradient { background: linear-gradient(120deg, #0d2f57, #1c4f8f); opacity: 1; }
  .scrim { position: absolute; inset: 0; background: linear-gradient(90deg, rgba(8,28,55,.86), rgba(8,28,55,.45) 60%, rgba(8,28,55,.2)); }
  .hero-content { position: relative; height: 100%; display: flex; flex-direction: column; justify-content: center; color: #fff; }
  .hero-content h1 { color: #fff; font-size: 2.8rem; font-weight: 900; max-width: 18ch; text-shadow: 0 2px 18px rgba(0,0,0,.35); }
  .kick { font-family: "Raleway"; font-weight: 700; letter-spacing: 3px; text-transform: uppercase; font-size: .8rem; color: #cdb27a; margin-bottom: 12px; }
  .sub { font-size: 1.12rem; color: #e3ebf6; max-width: 46ch; margin: 14px 0 24px; }
  .cta { display: flex; gap: 12px; }
  .cta .ghost { background: rgba(255,255,255,.12); color: #fff; border: 1px solid rgba(255,255,255,.5); }
</style>
<script>
  const slides = [...document.querySelectorAll('.hero .slide')];
  if (slides.length > 1) {
    let cur = 0;
    setInterval(() => {
      slides[cur].classList.remove('on');
      cur = (cur + 1) % slides.length;
      slides[cur].classList.add('on');
    }, 4500);
  }
</script>
```

- [ ] **Step 2: Write `src/components/ProgramCard.astro`**

```astro
---
const { href, title, summary, icon } = Astro.props;
---
<a class="pcard" href={href}>
  <div class="top">{icon}</div>
  <div class="body">
    <h3>{title}</h3>
    <p>{summary}</p>
    <span class="go">View program →</span>
  </div>
</a>
<style>
  .pcard { display: block; border: 1px solid var(--line); border-radius: 12px; overflow: hidden; background: #fff; transition: .15s; color: inherit; }
  .pcard:hover { transform: translateY(-3px); box-shadow: 0 12px 28px rgba(16,58,107,.13); text-decoration: none; }
  .pcard .top { height: 92px; display: flex; align-items: center; justify-content: center; font-size: 2.1rem; background: linear-gradient(135deg, var(--navy), var(--royal)); }
  .pcard .body { padding: 16px; }
  .pcard h3 { font-size: 1.05rem; }
  .pcard p { font-size: .88rem; color: #5a6672; margin: 5px 0 10px; }
  .pcard .go { font-family: "Raleway"; font-weight: 700; font-size: .82rem; color: var(--royal); }
</style>
```

- [ ] **Step 3: Commit**

```bash
git add src/components/HeroCarousel.astro src/components/ProgramCard.astro
git commit -m "feat: add hero carousel and program card components"
```

### Task 2.5: Home page

**Files:**
- Create: `src/pages/index.astro`

- [ ] **Step 1: Write `src/pages/index.astro`** (hero + program cards from collection + Markdown body for the rest)

```astro
---
import { getCollection, getEntry } from 'astro:content';
import BaseLayout from '../layouts/BaseLayout.astro';
import HeroCarousel from '../components/HeroCarousel.astro';
import ProgramCard from '../components/ProgramCard.astro';

const programs = (await getCollection('programs')).sort((a, b) => a.data.order - b.data.order);
const home = await getEntry('pages', 'home');
const { Content } = await home.render();

// Drop ensemble photos into public/images/hero/ and list them here. Empty = gradient hero.
const heroImages: string[] = [];
---
<BaseLayout description="Parent-led nonprofit supporting the performing arts at Los Altos High School.">
  <HeroCarousel
    images={heroImages}
    title="Los Altos High School Performing Arts Boosters"
    subtitle="Supporting Marching Band & Color Guard, Instrumental Music, Choir, and Drama."
  />
  <section id="find-your-program" class="container section">
    <span class="eyebrow">Find your program</span>
    <h2>Most families care about one thing — start there</h2>
    <div class="programs-grid">
      {programs.map((p) => (
        <ProgramCard href={`/programs/${p.slug}/`} title={p.data.title} summary={p.data.summary} icon={p.data.icon} />
      ))}
    </div>
  </section>
  <section class="container section prose">
    <Content />
  </section>
</BaseLayout>
<style>
  .programs-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 18px; margin-top: 22px; }
  @media (max-width: 820px) { .programs-grid { grid-template-columns: repeat(2, 1fr); } }
</style>
```

> Note: the home Markdown body still contains a "Find your program" list — trim that section from `src/content/pages/home.md` during this task so it isn't duplicated by the card grid. Keep the "Get involved" and "Fall Festival" sections in the Markdown.

- [ ] **Step 2: Build & eyeball**

Run: `npx astro build && npx astro preview`
Expected: home page renders hero + 4 cards + get-involved/fall-festival content. Visit the printed localhost URL.

- [ ] **Step 3: Commit**

```bash
git add src/pages/index.astro src/content/pages/home.md
git commit -m "feat: build home page with hero and program cards"
```

### Task 2.6: About & Donate pages

**Files:**
- Create: `src/pages/about.astro`, `src/pages/donate.astro`

- [ ] **Step 1: Write `src/pages/about.astro`**

```astro
---
import { getEntry } from 'astro:content';
import BaseLayout from '../layouts/BaseLayout.astro';
const page = await getEntry('pages', 'about');
const { Content } = await page.render();
---
<BaseLayout title="About & Contact" description="About the LAHS Performing Arts Boosters.">
  <article class="container section prose"><Content /></article>
</BaseLayout>
```

- [ ] **Step 2: Write `src/pages/donate.astro`** (same pattern, `getEntry('pages','donate')`, title "Donate").

- [ ] **Step 3: Build & verify both pages**

Run: `npx astro build`
Expected: `dist/about/index.html` and `dist/donate/index.html` exist.

- [ ] **Step 4: Commit**

```bash
git add src/pages/about.astro src/pages/donate.astro
git commit -m "feat: add about and donate pages"
```

---

## Phase 3 — Donation redirects & build verification

### Task 3.1: `_redirects` file

**Files:**
- Create: `public/_redirects`

- [ ] **Step 1: Write `public/_redirects`** (placeholder targets until Plan 2 fills real JotForm IDs)

```
# /donate/<program> short links → JotForm. Plan 2 (JotForm sync) overwrites the targets.
/donate/mbcg          https://form.jotform.com/REPLACE_MBCG          302
/donate/instrumental  https://form.jotform.com/REPLACE_INSTRUMENTAL  302
/donate/choir         https://form.jotform.com/REPLACE_CHOIR         302
/donate/drama         https://form.jotform.com/REPLACE_DRAMA         302
```

- [ ] **Step 2: Verify it lands in the build output**

Run: `npx astro build && test -f dist/_redirects && echo OK`
Expected: prints `OK` (Astro copies `public/` verbatim to `dist/`).

- [ ] **Step 3: Commit**

```bash
git add public/_redirects
git commit -m "feat: add donation redirect rules (placeholder targets)"
```

### Task 3.2: Post-build smoke test

**Files:**
- Create: `test/build.test.mjs`

- [ ] **Step 1: Write `test/build.test.mjs`**

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';

const expected = [
  'dist/index.html',
  'dist/about/index.html',
  'dist/donate/index.html',
  'dist/programs/mbcg/index.html',
  'dist/programs/instrumental-music/index.html',
  'dist/programs/choir/index.html',
  'dist/programs/drama/index.html',
  'dist/_redirects',
];

test('all expected pages and redirects are built', () => {
  for (const f of expected) assert.ok(existsSync(f), `missing ${f}`);
});

test('redirects cover all four donation slugs', () => {
  const r = readFileSync('dist/_redirects', 'utf8');
  for (const slug of ['mbcg', 'instrumental', 'choir', 'drama']) {
    assert.match(r, new RegExp(`^/donate/${slug}\\b`, 'm'), `missing /donate/${slug}`);
  }
});
```

- [ ] **Step 2: Run the test against a fresh build**

Run: `npx astro build && npm test`
Expected: both tests PASS.

- [ ] **Step 3: Commit**

```bash
git add test/build.test.mjs
git commit -m "test: assert built pages and donation redirects exist"
```

---

## Phase 4 — Push & manual visual QA

### Task 4.1: Push and self-review

- [ ] **Step 1: Push all work**

Run: `git push`
Expected: GitHub `main` updated.

- [ ] **Step 2: Local full preview pass**

Run: `npx astro build && npx astro preview`
Check: every nav link works; Programs dropdown lists all four; MBCG page shows the season-calendar table + volunteer button; Donate page lists four program links; footer shows EIN/address; favicon loads; layout is responsive at mobile width.

- [ ] **Step 3:** Use `superpowers:requesting-code-review` for a review of the site before deployment. Address findings, commit, push.

---

## Phase 5 — Cloudflare deployment, domain, HTTPS, email

> Requires the owner's Cloudflare API token (spec §9 scopes) and the one-time GitHub authorization.

### Task 5.1: Connect Cloudflare Pages to GitHub (owner-performed, ~3 min)

- [ ] **Step 1:** In the Cloudflare dashboard → **Workers & Pages → Create → Pages → Connect to Git**, authorize the Cloudflare GitHub app for `chondl/lahsperformingartsboosters-www`.
- [ ] **Step 2:** Create the Pages project (name e.g. `lahspab`). Set **Build command:** `npm run build`, **Build output directory:** `dist`, **Production branch:** `main`. Save & deploy.
- [ ] **Step 3:** Confirm the first deploy succeeds and note the `*.pages.dev` URL. Visit it over HTTPS and spot-check pages + a `/donate/mbcg` redirect (it will 302 to the placeholder URL — expected).

### Task 5.2: Discover account/zone IDs and store token

**Files:**
- Create: `scripts/cf-setup.sh`

- [ ] **Step 1:** Export the token for this shell session: `export CF_API_TOKEN=...` (owner provides; never commit it).
- [ ] **Step 2: Write `scripts/cf-setup.sh`** — a documented, idempotent helper that uses the Cloudflare API. Top section discovers IDs:

```bash
#!/usr/bin/env bash
set -euo pipefail
: "${CF_API_TOKEN:?export CF_API_TOKEN first}"
ZONE_NAME="lahsperformingartsboosters.org"
PROJECT="${CF_PAGES_PROJECT:-lahspab}"
api() { curl -sS -H "Authorization: Bearer $CF_API_TOKEN" -H "Content-Type: application/json" "$@"; }

ZONE_ID=$(api "https://api.cloudflare.com/client/v4/zones?name=$ZONE_NAME" | python3 -c 'import sys,json;print(json.load(sys.stdin)["result"][0]["id"])')
ACCOUNT_ID=$(api "https://api.cloudflare.com/client/v4/zones?name=$ZONE_NAME" | python3 -c 'import sys,json;print(json.load(sys.stdin)["result"][0]["account"]["id"])')
echo "ZONE_ID=$ZONE_ID  ACCOUNT_ID=$ACCOUNT_ID"
```

- [ ] **Step 3: Verify discovery**

Run: `bash scripts/cf-setup.sh`
Expected: prints non-empty `ZONE_ID` and `ACCOUNT_ID`.

- [ ] **Step 4: Commit** (the script is safe to commit; it contains no secrets)

```bash
git add scripts/cf-setup.sh
git commit -m "chore: add Cloudflare setup helper (ID discovery)"
```

### Task 5.3: Attach custom domains (apex + www)

- [ ] **Step 1:** Add the apex + `www` as Pages custom domains via API (append to `cf-setup.sh`):

```bash
add_domain() {
  api -X POST "https://api.cloudflare.com/client/v4/accounts/$ACCOUNT_ID/pages/projects/$PROJECT/domains" \
    --data "{\"name\":\"$1\"}" >/dev/null && echo "attached $1"
}
add_domain "$ZONE_NAME"
add_domain "www.$ZONE_NAME"
```

- [ ] **Step 2:** Confirm DNS records exist for both. Pages auto-creates them on the same account; verify:

```bash
api "https://api.cloudflare.com/client/v4/zones/$ZONE_ID/dns_records?type=CNAME" \
  | python3 -c 'import sys,json;[print(r["name"],r["content"]) for r in json.load(sys.stdin)["result"]]'
```
Expected: entries for apex and `www` resolving toward Pages.

Fallback — if a record is missing, create the proxied CNAME explicitly (apex uses CNAME flattening on Cloudflare):

```bash
add_cname() {  # $1 = full hostname
  api -X POST "https://api.cloudflare.com/client/v4/zones/$ZONE_ID/dns_records" \
    --data "{\"type\":\"CNAME\",\"name\":\"$1\",\"content\":\"$PROJECT.pages.dev\",\"proxied\":true}" \
    >/dev/null && echo "created CNAME $1 → $PROJECT.pages.dev"
}
# add_cname "$ZONE_NAME"        # uncomment only if apex record is missing
# add_cname "www.$ZONE_NAME"    # uncomment only if www record is missing
```

- [ ] **Step 3:** In a browser, load `https://lahsperformingartsboosters.org` — expect the site over a valid TLS cert (may take a few minutes to issue).

### Task 5.4: Enforce HTTPS and canonical apex

- [ ] **Step 1: Always Use HTTPS** (append to script):

```bash
api -X PATCH "https://api.cloudflare.com/client/v4/zones/$ZONE_ID/settings/always_use_https" \
  --data '{"value":"on"}' >/dev/null && echo "Always Use HTTPS: on"
```

- [ ] **Step 2: www → apex single redirect** via a redirect ruleset:

```bash
api -X PUT "https://api.cloudflare.com/client/v4/zones/$ZONE_ID/rulesets/phases/http_request_dynamic_redirect/entrypoint" \
  --data '{
    "rules": [{
      "action": "redirect",
      "expression": "(http.host eq \"www.lahsperformingartsboosters.org\")",
      "action_parameters": { "from_value": {
        "status_code": 301,
        "target_url": { "expression": "concat(\"https://lahsperformingartsboosters.org\", http.request.uri.path)" },
        "preserve_query_string": true
      } }
    }]
  }' >/dev/null && echo "www→apex redirect set"
```

- [ ] **Step 3: Verify**

Run:
```bash
curl -sI https://www.lahsperformingartsboosters.org | grep -i 'location\|HTTP/'
curl -sI http://lahsperformingartsboosters.org | grep -i 'location\|HTTP/'
```
Expected: `www` → `301` to apex; plain `http` upgrades to `https`.

### Task 5.5: Email routing for president@ / treasurer@

- [ ] **Step 1:** Enable email routing + add destination addresses (owner provides `PRESIDENT_DEST` and `TREASURER_DEST` inboxes):

```bash
api -X POST "https://api.cloudflare.com/client/v4/accounts/$ACCOUNT_ID/email/routing/addresses" \
  --data "{\"email\":\"$PRESIDENT_DEST\"}" >/dev/null || true
api -X POST "https://api.cloudflare.com/client/v4/accounts/$ACCOUNT_ID/email/routing/addresses" \
  --data "{\"email\":\"$TREASURER_DEST\"}" >/dev/null || true
echo "Destination addresses requested — each recipient must click the Cloudflare verification email."
```

- [ ] **Step 2:** After both destinations are **verified**, enable routing and create the forwarding rules:

```bash
api -X POST "https://api.cloudflare.com/client/v4/zones/$ZONE_ID/email/routing/enable" --data '{}' >/dev/null || true
rule() {  # $1=local-part  $2=destination
  api -X POST "https://api.cloudflare.com/client/v4/zones/$ZONE_ID/email/routing/rules" --data "{
    \"name\": \"$1\", \"enabled\": true,
    \"matchers\": [{\"type\":\"literal\",\"field\":\"to\",\"value\":\"$1@$ZONE_NAME\"}],
    \"actions\":  [{\"type\":\"forward\",\"value\":[\"$2\"]}]
  }" >/dev/null && echo "rule: $1@ → $2"
}
rule president "$PRESIDENT_DEST"
rule treasurer "$TREASURER_DEST"
```

- [ ] **Step 3: Verify** by sending a test email to each address and confirming it lands in the destination inboxes. (Email routing also adds the required MX/TXT records automatically; confirm in the dashboard if a send fails.)

- [ ] **Step 4: Commit** the finalized script.

```bash
git add scripts/cf-setup.sh
git commit -m "chore: Cloudflare domain, HTTPS, redirect, and email-routing setup"
git push
```

### Task 5.6: Final acceptance check (spec §11 success criteria)

- [ ] All 7 pages load over **HTTPS** at the apex; `www` and `http` redirect to canonical `https://` apex.
- [ ] Programs dropdown + all four program pages work; MBCG shows the season calendar + volunteer link.
- [ ] `/donate/mbcg|instrumental|choir|drama` each 302-redirect (to placeholder targets — Plan 2 finalizes).
- [ ] Editing a content `.md` file via the GitHub web editor triggers a Cloudflare rebuild and the change goes live (test with a trivial edit).
- [ ] Email to `president@`/`treasurer@lahsperformingartsboosters.org` forwards to the designated inboxes.
- [ ] Site matches the approved mockup (palette, Raleway/Nunito Sans, logos, carousel).

---

## Done / Handoff

When Phase 5 passes, the site is **live and publishable**. Then:
- **Plan 2 — JotForm sync tool** (spec §8): build the config-as-code CLI that clones/updates the four donation forms and rewrites `public/_redirects` with real form IDs.
- **Content polish:** swap placeholder hero images for real ensemble photos (drop into `public/images/hero/`, list them in `src/pages/index.astro`); fill real Google Group + volunteer-sheet URLs; add the full ~25-entry MBCG season calendar.
