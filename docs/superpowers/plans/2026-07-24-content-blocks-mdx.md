# Content Blocks (MDX Palette) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Convert the last hardcoded page blocks (home hero text, "Find your program", donate reasons box, donate CTA) into an MDX content-block palette so page structure — which blocks appear, in what order, with what text — is editable entirely in content files.

**Architecture:** Add `@astrojs/mdx`; `home.md` and `donate.md` become `.mdx`. A small palette of thin wrapper components lives in `src/components/content/` and is injected by the route via `<Content components={{…}} />`, so content files never import anything. `index.astro` and `donate.astro` shrink to BaseLayout + `<Content>`. Rendered output is unchanged.

**Tech Stack:** Astro 6.4.6 (static, Content Layer API), `@astrojs/mdx` 6.0.3, Node 24, `node --test` post-build assertions, Cloudflare Workers Static Assets.

## Global Constraints

- **Astro 6 Content Layer API only.** Collections in `src/content.config.ts` with `glob()` loaders; render with `import { render } from 'astro:content'` and `await render(entry)` (NOT `entry.render()`); identifier is `entry.id` (NOT `entry.slug`).
- **Pin exact dependency versions** (no `^`/`~`) — matches the existing `package.json` style. `@astrojs/mdx` must be **`6.0.3`**: 7.x requires Astro ^7, 6.0.3 declares `astro: ^6.4.0`.
- **Node 24+.** Test script must keep the glob form: `node --test "test/**/*.test.mjs"`.
- **Rendered output is visually unchanged.** This is a refactor. The one accepted diff is typographic: the donate "reasons" strings move from YAML frontmatter (rendered raw) into Markdown body children, so smartypants now curls their apostrophes (`can't` → `can’t`, `We're` → `We’re`). That matches the surrounding body prose and is expected.
- **Content files stay pure Markdown plus palette tags:** quoted string attributes and Markdown children only. No `import`, no `export`, no JSX `{…}` expressions. Task 6 makes this a test.
- **Every page has exactly one `<h1>`.** Home's is the hero's; about/donate/program pages get theirs from the route template's `{title}`.
- **Palette:** navy `#103A6B`, royal `#2E6DB4`, gold `#F4A81E` as a subtle accent only. Fonts Raleway (headings) + Nunito Sans (body). Use only the existing `--space-*`, `--fs-*`, `--radius*` tokens.
- **Program pages are out of scope** — `src/pages/programs/[slug].astro`, `src/content/programs/*.md`, and the `programs` collection schema are not touched.
- **Images stay code-side.** The hero slide array (paths + focal points) stays in code; `<Hero>` exposes only text.
- **Commits:** small and conventional (`feat:`, `fix:`, `chore:`, `docs:`). Do not push; deployment is automatic from `main` and the human runs the visual check first (Task 8).
- **Verification loop is always:** `npm run build` **then** `npm test` (the suite asserts against `dist/`).

## Deviation from the spec — a fifth palette component

Spec §3 inventories four blocks. Implementing them needs a **fifth**, `<Prose>`, and the plan adds it.

Why it is forced: today `index.astro` wraps the home Markdown body in
`<section class="container section prose">`. Once `<Hero>` and `<FindYourProgram>` move into
`home.mdx`, the MDX output is one flat flow — hero (full-bleed), program grid (self-contained
`.container` section), then body prose. A wrapper in `index.astro` around the whole `<Content>`
cannot work: it would have to carry `.container` (which would break the full-bleed hero) and
`.prose` (whose global rules would then leak into the hero `<h1>` and the program cards — adding
margins to the hero heading, and margins plus a border-radius to the card photos). So the prose
wrapper has to travel with the prose, which means it becomes a block in the content file.

`<Prose>` is not a new *visual* block — it is exactly the `<section class="container section prose">`
that `index.astro` renders today, moved into the palette. It also satisfies the spec's own goal
that no page structure stays hardcoded in `.astro` templates.

---

## File Structure

**Created**

| File | Responsibility |
|---|---|
| `src/components/content/Hero.astro` | Home hero block. Owns the `heroImages` array (paths + focal points); takes `title`/`subtitle` as strings; renders `HeroCarousel`. |
| `src/components/content/FindYourProgram.astro` | Program-grid block. Takes `eyebrow`/`heading`; reads the `programs` collection itself and renders the `ProgramCard` grid. Owns the `.programs-grid` styles. |
| `src/components/content/Prose.astro` | Body-copy section wrapper (`<section class="container section prose">`) for a flat MDX flow. |
| `src/components/content/Reasons.astro` | Donate "reasons to give" tinted box. Takes `title`; children are a Markdown bullet list (and the CTA). |
| `src/components/content/CTAButton.astro` | Primary call-to-action link. Takes `href`/`label`. |
| `test/content-purity.test.mjs` | The forward-contract with chat-cms's validator: no imports/exports, no JSX expressions, every component tag resolves to `src/components/content/<Tag>.astro`. |

**Renamed**

- `src/content/pages/home.md` → `src/content/pages/home.mdx`
- `src/content/pages/donate.md` → `src/content/pages/donate.mdx`

**Modified**

- `package.json` — add `@astrojs/mdx` 6.0.3.
- `astro.config.mjs` — register the MDX integration.
- `src/content.config.ts` — `pages` glob admits `.mdx`; drop `ctaHref`/`ctaLabel`/`reasons` from the schema.
- `src/pages/index.astro` — reduces to BaseLayout + `<Content components={{ Hero, FindYourProgram, Prose }} />`.
- `src/pages/donate.astro` — reduces to BaseLayout + `<h1>` + `<Content components={{ Reasons, CTAButton }} />`.
- `test/build.test.mjs` — new characterization assertions guarding each block.
- `CLAUDE.md`, `docs/hero-images.md` — document the palette; repoint the slide-list location.

**Untouched:** `src/pages/about.astro`, `src/content/pages/about.md`, everything under `src/content/programs/`, `src/pages/programs/[slug].astro`, `src/components/{Header,Footer,HeroCarousel,ProgramCard}.astro`, `worker/index.js`, `wrangler.jsonc`, `public/`.

---

## Testing note: these are characterization tests

This is a refactor with no output change, so the usual red-then-green cycle does not apply to
Tasks 2–5. Instead each of those tasks writes its guard assertion **first and proves it passes
against the pre-refactor build**, then refactors, then proves it still passes. The assertion's
job is to fail if the refactor silently drops a block. Task 6's purity test is genuinely new
behaviour and includes a step that proves it bites.

---

## Task 0: Capture the production baseline

Must happen **before any code changes**. The whole point of the refactor is that production HTML
does not change, so the pre-change live pages are the reference.

**Files:**
- Create: `scripts/compare-render.mjs` (throwaway helper; delete in Task 8 if not worth keeping)

- [ ] **Step 1: Capture the live pages**

```bash
mkdir -p /tmp/pab-prod-before
for p in index:/ donate:/donate/ about:/about/; do
  n=${p%%:*}; u=${p#*:}
  curl -sf "https://lahsperformingartsboosters.org$u" -o "/tmp/pab-prod-before/$n.html"
done
ls -l /tmp/pab-prod-before/ && git rev-parse HEAD
```

Expected: three non-empty files. Record the HEAD sha — that is the commit production is serving.

- [ ] **Step 2: Write the normalising comparison helper**

`scripts/compare-render.mjs`:

```js
#!/usr/bin/env node
// Compares production HTML against the local build, ignoring the bits Astro regenerates on
// every build: scoped-style hashes and asset bundle names. Throwaway tool for the
// content-blocks refactor — see docs/superpowers/plans/2026-07-24-content-blocks-mdx.md.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { execFileSync } from 'node:child_process';

const SITE = 'https://lahsperformingartsboosters.org';
const PAGES = [
  { name: 'index', url: '/', dist: 'dist/index.html' },
  { name: 'donate', url: '/donate/', dist: 'dist/donate/index.html' },
  { name: 'about', url: '/about/', dist: 'dist/about/index.html' },
];

const normalise = (html) =>
  html
    .replace(/ data-astro-cid-[a-z0-9]+(="[^"]*")?/g, '')
    .replace(/astro-cid-[a-z0-9]+/g, 'astro-cid')
    .replace(/_astro\/[^"' ]+\.(css|js)/g, '_astro/BUNDLE.$1')
    .replace(/>\s+</g, '><')
    .replace(/[ \t]+/g, ' ')
    .trim();

const refetch = process.argv.includes('--refetch');
const dir = refetch ? '/tmp/pab-prod-after' : '/tmp/pab-prod-before';
mkdirSync(dir, { recursive: true });

let differences = 0;
for (const p of PAGES) {
  if (refetch) {
    writeFileSync(`${dir}/${p.name}.html`,
      execFileSync('curl', ['-sf', `${SITE}${p.url}`], { encoding: 'utf8' }));
  }
  const before = normalise(readFileSync(`/tmp/pab-prod-before/${p.name}.html`, 'utf8'));
  const after = normalise(refetch
    ? readFileSync(`${dir}/${p.name}.html`, 'utf8')
    : readFileSync(p.dist, 'utf8'));
  writeFileSync(`/tmp/pab-cmp-${p.name}-before.html`, before.replace(/></g, '>\n<'));
  writeFileSync(`/tmp/pab-cmp-${p.name}-after.html`, after.replace(/></g, '>\n<'));
  try {
    execFileSync('diff', ['-u',
      `/tmp/pab-cmp-${p.name}-before.html`, `/tmp/pab-cmp-${p.name}-after.html`],
      { stdio: 'inherit' });
    console.log(`${p.name}: IDENTICAL`);
  } catch {
    differences++;
    console.log(`--- ^ differences on ${p.name} ---`);
  }
}
process.exit(differences ? 1 : 0);
```

- [ ] **Step 3: Prove the helper reports the untouched pages as identical**

```bash
npm run build && node scripts/compare-render.mjs
```

Expected: `about: IDENTICAL` at minimum. If `index`/`donate` are not identical *before* any
change, the local build already differs from production — stop and find out why before
refactoring, because the baseline is then not trustworthy.

- [ ] **Step 4: Commit the helper**

```bash
git add scripts/compare-render.mjs
git commit -m "chore: add a prod-vs-local render comparison helper"
```

---

## Task 1: Add MDX and move the two page files to `.mdx`

Pure plumbing: install the integration, rename the files, widen the collection glob. No blocks
yet, no markup changes. Ends with the whole existing suite green, which proves MDX renders the
same HTML the Markdown pipeline did.

**Files:**
- Modify: `package.json`
- Modify: `astro.config.mjs`
- Modify: `src/content.config.ts:24`
- Rename: `src/content/pages/home.md` → `src/content/pages/home.mdx`
- Rename: `src/content/pages/donate.md` → `src/content/pages/donate.mdx`

**Interfaces:**
- Consumes: nothing.
- Produces: `.mdx` entries in the `pages` collection whose `entry.id` is unchanged (`home`, `donate`) — the glob loader strips the extension, so `getEntry('pages', 'home')` still resolves.

- [ ] **Step 1: Capture the current build as the baseline**

```bash
npm run build && npm test
```

Expected: build succeeds; all tests in `test/build.test.mjs` and `test/email-worker.test.mjs` pass. Then snapshot the two pages so later tasks can diff against them:

```bash
mkdir -p /tmp/pab-baseline && cp dist/index.html dist/donate/index.html /tmp/pab-baseline/ 2>/dev/null; cp dist/index.html /tmp/pab-baseline/index.html && cp dist/donate/index.html /tmp/pab-baseline/donate.html && ls -l /tmp/pab-baseline
```

Expected: `index.html` and `donate.html` present.

- [ ] **Step 2: Install the MDX integration**

```bash
npm install --save-exact @astrojs/mdx@6.0.3
```

Expected: installs cleanly. `@astrojs/markdown-satteri` is an **optional** peer of this version — an npm warning about it is fine; an `ERESOLVE` error about `astro` is not (that means the wrong major got picked).

Verify the pin landed without a range:

```bash
grep '@astrojs/mdx' package.json
```

Expected: `"@astrojs/mdx": "6.0.3",` under `dependencies` (not `devDependencies` — it runs during the Cloudflare build).

- [ ] **Step 3: Register the integration**

`astro.config.mjs` in full:

```js
import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';

export default defineConfig({
  site: 'https://lahsperformingartsboosters.org',
  // static output (default). Pages handles redirects via public/_redirects.
  // MDX powers the content-block palette in src/components/content/ — see CLAUDE.md.
  integrations: [mdx()],
});
```

- [ ] **Step 4: Rename the two page files**

```bash
git mv src/content/pages/home.md src/content/pages/home.mdx
git mv src/content/pages/donate.md src/content/pages/donate.mdx
```

Do not edit their contents in this task.

- [ ] **Step 5: Widen the `pages` collection glob**

In `src/content.config.ts`, change line 24 from:

```ts
  loader: glob({ pattern: '**/*.md', base: './src/content/pages' }),
```

to:

```ts
  // {md,mdx}: page bodies may use the content-block palette (src/components/content/).
  loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/pages' }),
```

Leave the `programs` collection's `'**/*.md'` pattern alone — program pages are out of scope.

- [ ] **Step 6: Build and run the full suite**

```bash
npm run build && npm test
```

Expected: build succeeds; every existing test passes. If the build fails on `donate.mdx`, the
likely cause is a bare `<` or `{` in the body — there are none today, so investigate rather than
work around it.

- [ ] **Step 7: Diff the rendered pages against the baseline**

```bash
diff /tmp/pab-baseline/index.html dist/index.html && diff /tmp/pab-baseline/donate.html dist/donate/index.html && echo IDENTICAL
```

Expected: `IDENTICAL`. If MDX introduces a difference, stop and report it — it must be understood
before the refactor proceeds. (A change in `data-astro-cid-*` hashes is acceptable and should be
called out; a change in text, tags, or attributes is not.)

- [ ] **Step 8: Commit**

```bash
git add package.json package-lock.json astro.config.mjs src/content.config.ts src/content/pages/home.mdx src/content/pages/donate.mdx
git commit -m "chore: add @astrojs/mdx and move page content to .mdx"
```

---

## Task 2: The `<Prose>` block

Move the home page's body-copy wrapper out of `index.astro` and into the content file. After this
task `index.astro` still renders the hero and the program grid directly; only the prose section is
content-driven.

**Files:**
- Create: `src/components/content/Prose.astro`
- Modify: `src/content/pages/home.mdx`
- Modify: `src/pages/index.astro:42-44`
- Test: `test/build.test.mjs` (append)

**Interfaces:**
- Consumes: the `pages` collection admitting `.mdx` (Task 1).
- Produces: `Prose` — an Astro component with **no props**, rendering `<section class="container section prose"><slot /></section>`. Later tasks add `Hero` and `FindYourProgram` to the same `components={{…}}` map in `index.astro`.

- [ ] **Step 1: Write the characterization assertion**

Append to `test/build.test.mjs`:

```js
// The home page is a flat MDX flow: blocks plus body prose. These assertions fail loudly if a
// block silently disappears from the content file — the one regression this refactor can cause.
test('the home body prose renders inside the prose container', () => {
  const html = readFileSync('dist/index.html', 'utf8');
  assert.match(html, /class="container section prose"/, 'home lost its prose section');
  assert.match(html, /Supporting the arts at Los Altos High School/);
  assert.match(html, /The Fall Festival/);
});
```

- [ ] **Step 2: Prove it passes against the current build**

```bash
npm run build && npm test
```

Expected: PASS, including the new test. (It is pinning today's output; a failure here means the
assertion is wrong, not the code.)

- [ ] **Step 3: Create the palette component**

`src/components/content/Prose.astro`:

```astro
---
// Body-copy section. Interior pages get this wrapper from their route template; the home page
// is a flat MDX flow (hero and program grid are full-width blocks), so it carries the wrapper
// as a block instead. No props — the children are the prose.
---
<section class="container section prose">
  <slot />
</section>
```

- [ ] **Step 4: Wrap the home body in the block**

`src/content/pages/home.mdx` in full:

```mdx
---
title: Los Altos High School Performing Arts Boosters
---

<Prose>

## Supporting the arts at Los Altos High School

The Performing Arts Boosters (PAB) is a parent-led nonprofit that supports every
performing arts student at Los Altos High School. We fund the staff, equipment,
travel, and experiences that the school budget alone can't cover — across Marching
Band & Color Guard, Band, Orchestra, Choir, and Drama.

We're a 501(c)(3) charitable organization run entirely by volunteers. Every dollar
we raise goes directly back to the programs and the students.

## Get involved

There's a place for every parent, whether you have an hour a season or want to take
on a bigger role.

- **Give.** Our Back-to-School donation campaign is how we fund the year. Gifts of
  any size are tax-deductible. [Donate to your program »](/donate)
- **Join your program's Google Group.** It's where schedules, volunteer sign-ups, and
  program news are shared.
- **Come to a meeting.** The Boosters meet monthly on Zoom — open to all parents.
  It's the best way to hear what's happening and lend a hand.
- **Volunteer.** From concert refreshments to driving equipment trucks to building
  sets, our programs run on parent help.

## The Fall Festival

Each fall, Los Altos High School hosts the Fall Festival, a community event with
performances from across the department. The Boosters pitch in to support it — as we do
for concerts and shows throughout the year — and it's a great first taste of everything
our students do.

</Prose>
```

The blank lines immediately inside `<Prose>` … `</Prose>` are required: without them MDX treats
the children as raw text instead of Markdown.

- [ ] **Step 5: Inject the component from the route**

In `src/pages/index.astro`, add the import after the `ProgramCard` import:

```astro
import Prose from '../components/content/Prose.astro';
```

and replace lines 42–44:

```astro
  <section class="container section prose">
    <Content />
  </section>
```

with:

```astro
  <Content components={{ Prose }} />
```

- [ ] **Step 6: Build, test, and diff**

```bash
npm run build && npm test && diff /tmp/pab-baseline/index.html dist/index.html && echo IDENTICAL
```

Expected: tests pass and `IDENTICAL`. If `diff` reports only `data-astro-cid-*` attribute
differences on the prose `<section>`, that is expected — `index.astro` has a `<style>` block so
its elements carried a scope hash, and `Prose.astro` has none. Confirm the only differences are
those attributes; anything else is a real regression.

- [ ] **Step 7: Refresh the baseline for later tasks**

```bash
cp dist/index.html /tmp/pab-baseline/index.html
```

- [ ] **Step 8: Commit**

```bash
git add src/components/content/Prose.astro src/content/pages/home.mdx src/pages/index.astro test/build.test.mjs
git commit -m "feat: move the home prose section into a Prose content block"
```

---

## Task 3: The `<Hero>` block

Hero *text* moves into `home.mdx`; the slide array (paths + focal points) moves into the palette
component, staying code-side per the crop workflow.

**Files:**
- Create: `src/components/content/Hero.astro`
- Modify: `src/content/pages/home.mdx`
- Modify: `src/pages/index.astro`
- Test: `test/build.test.mjs` (append)

**Interfaces:**
- Consumes: `Prose` and the `components={{…}}` injection point from Task 2.
- Produces: `Hero` — props `{ title: string; subtitle?: string }`. It renders `HeroCarousel`, which emits the home page's only `<h1>`.

- [ ] **Step 1: Write the characterization assertions**

Append to `test/build.test.mjs`:

```js
test('the home hero renders its title and subtitle', () => {
  const html = readFileSync('dist/index.html', 'utf8');
  assert.match(html, /<h1[^>]*>Los Altos High School Performing Arts Boosters<\/h1>/);
  assert.match(html, /Supporting Marching Band/);
  assert.match(html, /Choir, and Drama\./);
});

// One h1 per page: the hero owns the home page's, route templates own the rest. MDX makes it
// easy to add a second by accident (a stray `# Heading` in a body), so assert it.
test('every page has exactly one h1', () => {
  for (const f of expected.filter((f) => f.endsWith('.html'))) {
    const count = (readFileSync(f, 'utf8').match(/<h1[\s>]/g) ?? []).length;
    assert.equal(count, 1, `${f} has ${count} <h1> elements`);
  }
});
```

- [ ] **Step 2: Prove they pass against the current build**

```bash
npm run build && npm test
```

Expected: PASS. If "every page has exactly one h1" fails, stop — that is a pre-existing bug to
report, not something to paper over.

- [ ] **Step 3: Create the palette component**

`src/components/content/Hero.astro`:

```astro
---
import HeroCarousel from '../HeroCarousel.astro';
import type { HeroImage } from '../HeroCarousel.astro';

// Text comes from the content file; the photos deliberately do not. Choosing a crop and a
// focal point per slide is developer work — see docs/hero-images.md.
interface Props {
  title: string;
  subtitle?: string;
}
const { title, subtitle } = Astro.props;

// Hero slides, in rotation order. Photos live in public/images/hero/, cropped to a uniform
// 16:9. `position` is the focal point — see the note in HeroCarousel.astro before changing
// one. To swap a photo, drop a new 16:9 JPEG in that folder and edit the src here.
// Order note: the two conductor portraits are kept apart in the rotation (slots 1 and 4,
// and the wrap from the last slide back to the first lands on a field shot, not a portrait).
const heroImages: HeroImage[] = [
  { src: '/images/hero/band-conductor.jpg', position: 'center 12%' },
  { src: '/images/hero/marching-band-group.jpg', position: 'center 45%' },
  { src: '/images/hero/color-guard.jpg', position: 'center 45%' },
  { src: '/images/hero/orchestra-conductor.jpg', position: 'center 22%' },
  { src: '/images/hero/drum-major.jpg', position: 'center 40%' },
  { src: '/images/hero/marching-band-field.jpg', position: 'center 28%' },
];
---
<HeroCarousel images={heroImages} title={title} subtitle={subtitle} />
```

- [ ] **Step 4: Add the tag to the content file**

In `src/content/pages/home.mdx`, insert immediately after the frontmatter's closing `---` and
before `<Prose>` (keep a blank line on each side):

```mdx
<Hero
  title="Los Altos High School Performing Arts Boosters"
  subtitle="Supporting Marching Band & Color Guard, Concert Bands, Orchestras, Jazz Band, Choir, and Drama."
/>
```

The bare `&` in an MDX attribute string is fine. If the build ever rejects it, write `&amp;` —
JSX decodes HTML entities in attribute values, so it renders as a single `&`.

- [ ] **Step 5: Strip the hero from the route**

In `src/pages/index.astro`: delete the `HeroCarousel` import, the `HeroImage` type import, the
`heroImages` array and its comment block, and the `<HeroCarousel … />` element. Add
`import Hero from '../components/content/Hero.astro';` and extend the components map to
`components={{ Hero, Prose }}`. The file should now read:

```astro
---
import { getCollection, getEntry, render } from 'astro:content';
import BaseLayout from '../layouts/BaseLayout.astro';
import ProgramCard from '../components/ProgramCard.astro';
import Hero from '../components/content/Hero.astro';
import Prose from '../components/content/Prose.astro';

const programs = (await getCollection('programs')).sort((a, b) => a.data.order - b.data.order);
const home = await getEntry('pages', 'home');
if (!home) throw new Error('Missing content: pages/home');
const { Content } = await render(home);
---
<BaseLayout description="Parent-led nonprofit supporting the performing arts at Los Altos High School.">
  <section id="find-your-program" class="container section">
    <span class="eyebrow">Find your program</span>
    <h2>Jump to the program your family is part of</h2>
    <div class="programs-grid">
      {programs.map((p) => (
        <ProgramCard href={`/programs/${p.id}/`} title={p.data.title} summary={p.data.summary} icon={p.data.icon} cardImage={p.data.cardImage} />
      ))}
    </div>
  </section>
  <Content components={{ Hero, Prose }} />
</BaseLayout>
<style>
  .programs-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: var(--space-sm); margin-top: var(--space-md); }
  @media (max-width: 820px) { .programs-grid { grid-template-columns: repeat(2, 1fr); } }
  @media (max-width: 520px) { .programs-grid { grid-template-columns: 1fr; } }
</style>
```

Note the hero now renders **after** the program grid in source order — that is temporary and
correct only until Task 4 moves the grid into the content file too. Do not try to "fix" the order
here; Step 6 accounts for it.

- [ ] **Step 6: Build and test**

```bash
npm run build && npm test
```

Expected: all tests pass. Do **not** diff against the baseline in this task — block order is
intentionally wrong mid-refactor and the diff will be noisy. Task 4 restores it and re-diffs.

- [ ] **Step 7: Commit**

```bash
git add src/components/content/Hero.astro src/content/pages/home.mdx src/pages/index.astro test/build.test.mjs
git commit -m "feat: move the home hero text into a Hero content block"
```

---

## Task 4: The `<FindYourProgram>` block

The program grid becomes a block, `index.astro` becomes a thin shell, and block order is restored.

**Files:**
- Create: `src/components/content/FindYourProgram.astro`
- Modify: `src/content/pages/home.mdx`
- Modify: `src/pages/index.astro`
- Test: `test/build.test.mjs` (append)

**Interfaces:**
- Consumes: `Hero` and `Prose` from Tasks 2–3.
- Produces: `FindYourProgram` — props `{ eyebrow?: string; heading?: string }`. It reads the `programs` collection itself (sorted by `data.order`) and renders the `ProgramCard` grid; absent `eyebrow`/`heading` render nothing, per the site-wide conditional-rendering convention.

- [ ] **Step 1: Write the characterization assertion**

Append to `test/build.test.mjs`:

```js
test('the find-your-program block renders its heading and every program card', () => {
  const html = readFileSync('dist/index.html', 'utf8');
  assert.match(html, /id="find-your-program"/);
  assert.match(html, /Find your program/);
  assert.match(html, /Jump to the program your family is part of/);
  assert.equal((html.match(/class="pcard"/g) ?? []).length, 4, 'expected four program cards');
});
```

- [ ] **Step 2: Prove it passes against the current build**

```bash
npm run build && npm test
```

Expected: PASS.

- [ ] **Step 3: Create the palette component**

`src/components/content/FindYourProgram.astro`:

```astro
---
import { getCollection } from 'astro:content';
import ProgramCard from '../ProgramCard.astro';

// The grid is generated from the programs collection — never hand-listed — so adding a program
// is one Markdown file. Only the two labels are content-editable.
interface Props {
  eyebrow?: string;
  heading?: string;
}
const { eyebrow, heading } = Astro.props;
const programs = (await getCollection('programs')).sort((a, b) => a.data.order - b.data.order);
---
<section id="find-your-program" class="container section">
  {eyebrow && <span class="eyebrow">{eyebrow}</span>}
  {heading && <h2>{heading}</h2>}
  <div class="programs-grid">
    {programs.map((p) => (
      <ProgramCard href={`/programs/${p.id}/`} title={p.data.title} summary={p.data.summary} icon={p.data.icon} cardImage={p.data.cardImage} />
    ))}
  </div>
</section>
<style>
  .programs-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: var(--space-sm); margin-top: var(--space-md); }
  @media (max-width: 820px) { .programs-grid { grid-template-columns: repeat(2, 1fr); } }
  @media (max-width: 520px) { .programs-grid { grid-template-columns: 1fr; } }
</style>
```

- [ ] **Step 4: Add the tag to the content file**

In `src/content/pages/home.mdx`, insert between the `<Hero … />` tag and `<Prose>`, with a blank
line on each side:

```mdx
<FindYourProgram
  eyebrow="Find your program"
  heading="Jump to the program your family is part of"
/>
```

`home.mdx` now reads: frontmatter, `<Hero …/>`, `<FindYourProgram …/>`, `<Prose>…</Prose>` — the
page's structure, in order, in one file.

- [ ] **Step 5: Reduce the route to a thin shell**

`src/pages/index.astro` in full:

```astro
---
import { getEntry, render } from 'astro:content';
import BaseLayout from '../layouts/BaseLayout.astro';
import Hero from '../components/content/Hero.astro';
import FindYourProgram from '../components/content/FindYourProgram.astro';
import Prose from '../components/content/Prose.astro';

// Page structure lives in src/content/pages/home.mdx; this route only supplies the palette.
const home = await getEntry('pages', 'home');
if (!home) throw new Error('Missing content: pages/home');
const { Content } = await render(home);
---
<BaseLayout description="Parent-led nonprofit supporting the performing arts at Los Altos High School.">
  <Content components={{ Hero, FindYourProgram, Prose }} />
</BaseLayout>
```

- [ ] **Step 6: Build, test, and diff against the baseline**

```bash
npm run build && npm test && diff /tmp/pab-baseline/index.html dist/index.html
```

Expected: tests pass. The `diff` is expected to show **only** `data-astro-cid-*` attribute
changes (the grid's scope hash moved from `index.astro` to `FindYourProgram.astro`, and the hero
markup is unchanged). Read every diff hunk. Any change to text, tag names, classes, or attribute
values other than `data-astro-cid-*` is a regression — fix it before committing.

- [ ] **Step 7: Commit**

```bash
git add src/components/content/FindYourProgram.astro src/content/pages/home.mdx src/pages/index.astro test/build.test.mjs
git commit -m "feat: move the home program grid into a FindYourProgram content block"
```

---

## Task 5: The `<Reasons>` and `<CTAButton>` blocks

Donate's reasons list and CTA move out of frontmatter and into the body as tags, and the three
now-dead schema fields go away.

**Files:**
- Create: `src/components/content/Reasons.astro`
- Create: `src/components/content/CTAButton.astro`
- Modify: `src/content/pages/donate.mdx`
- Modify: `src/pages/donate.astro`
- Modify: `src/content.config.ts:28-31`
- Test: `test/build.test.mjs` (append)

**Interfaces:**
- Consumes: nothing from Tasks 2–4 (donate is an independent route).
- Produces:
  - `Reasons` — props `{ title?: string }`; children are Markdown. Renders `<section class="give">`.
  - `CTAButton` — props `{ href: string; label: string }`. Renders `<a class="btn btn-primary cta-button">`.

**Note on nesting:** `<CTAButton>` goes **inside** `<Reasons>`, as its last child. That is where
the button sits today (inside the tinted box, under the list), and the spec requires the rendered
output to be unchanged. Both are still independently removable — deleting either tag removes
exactly that piece.

**Note on `is:global`:** the reasons list arrives as slotted Markdown, which carries no Astro scope
hash, so `Reasons.astro`'s descendant rules cannot be scoped. They are declared `is:global` and
prefixed with `.prose` — the prefix is not decoration, it is what keeps `.prose .give ul` ahead of
global.css's `.prose ul` on specificity. Without it the two tie and source order decides.

- [ ] **Step 1: Write the characterization assertion**

Append to `test/build.test.mjs`:

```js
test('the donate page keeps its reasons box and its call to action', () => {
  const html = readFileSync('dist/donate/index.html', 'utf8');
  assert.match(html, /class="give"/, 'donate lost the reasons box');
  assert.match(html, /Reasons to give/);
  assert.match(html, /Family contributions fund nearly everything/);
  assert.match(html, /all-volunteer 501\(c\)\(3\)/);
  assert.match(html, /full membership, which includes family admission/);
  assert.match(html, /One form covers every program/);
  assert.match(html, /<a [^>]*href="\/bts"[^>]*>Give to the Back-to-School campaign<\/a>/);
});
```

(The assertions avoid apostrophes on purpose — those glyphs change when the strings move from
YAML into Markdown.)

- [ ] **Step 2: Prove it passes against the current build**

```bash
npm run build && npm test
```

Expected: PASS.

- [ ] **Step 3: Create `CTAButton`**

`src/components/content/CTAButton.astro`:

```astro
---
// Primary call to action. Always link to an on-domain path such as /bts, never a vendor URL —
// see CLAUDE.md, "Donation links".
interface Props {
  href: string;
  label: string;
}
const { href, label } = Astro.props;
---
<a class="btn btn-primary cta-button" href={href}>{label}</a>
<style>
  .cta-button { font-size: var(--fs-md); padding: var(--space-sm) var(--space-md); }
  @media (max-width: 520px) { .cta-button { display: block; text-align: center; } }
</style>
```

- [ ] **Step 4: Create `Reasons`**

`src/components/content/Reasons.astro`:

```astro
---
// Tinted callout box: an eyebrow label plus whatever Markdown you put inside it (today a bullet
// list and the donate button).
interface Props {
  title?: string;
}
const { title } = Astro.props;
---
<section class="give">
  {title && <span class="eyebrow">{title}</span>}
  <slot />
</section>
<style is:global>
  /* is:global because the list arrives as slotted Markdown, which carries no scope hash and so
     cannot be matched by a scoped selector. The `.prose` prefix is load-bearing: it lifts these
     above global.css's `.prose ul` rules, which would otherwise tie on specificity. */
  .give {
    margin: var(--space-md) 0 var(--space-lg);
    padding: var(--space-md);
    background: #f5f8fc;
    border: 1px solid var(--line);
    border-radius: 8px;
  }
  .prose .give ul { margin: var(--space-sm) 0 var(--space-md); padding-left: 1.15rem; }
  .prose .give li { margin-bottom: var(--space-2xs); }
</style>
```

- [ ] **Step 5: Move the reasons and CTA into the content body**

`src/content/pages/donate.mdx` — replace the frontmatter and add the block at the top of the
body. The frontmatter becomes just:

```mdx
---
title: Donate to the Performing Arts Boosters
---

<Reasons title="Reasons to give">

- Family contributions fund nearly everything the school budget can't — instructional
  staff, travel to festivals and competitions, instrument repair, uniforms, and props.
- We're an all-volunteer 501(c)(3), so nearly every dollar goes straight to the students.
- A gift of $350 or more a year is a full membership, which includes family admission to
  all regular concerts at Eagle Theater.
- One form covers every program — give by credit card, check, or donor-advised fund.

<CTAButton href="/bts" label="Give to the Back-to-School campaign" />

</Reasons>

## Membership and concert admission
```

Everything from `## Membership and concert admission` to the end of the file is unchanged — do
not retype it, just leave it in place below the new block.

- [ ] **Step 6: Reduce the donate route to a thin shell**

`src/pages/donate.astro` in full (the `.give` styles moved into `Reasons.astro`, so the route's
`<style>` block goes away entirely):

```astro
---
import { getEntry, render } from 'astro:content';
import BaseLayout from '../layouts/BaseLayout.astro';
import Reasons from '../components/content/Reasons.astro';
import CTAButton from '../components/content/CTAButton.astro';

// Page structure lives in src/content/pages/donate.mdx; this route only supplies the palette.
const page = await getEntry('pages', 'donate');
if (!page) throw new Error('Missing content: pages/donate');
const { Content } = await render(page);
---
<BaseLayout title="Donate" description="Donate to the LAHS Performing Arts Boosters.">
  <article class="container section prose">
    <h1>{page.data.title}</h1>
    <Content components={{ Reasons, CTAButton }} />
  </article>
</BaseLayout>
```

- [ ] **Step 7: Drop the dead fields from the collection schema**

In `src/content.config.ts`, delete these four lines from the `pages` schema:

```ts
    // Donate page only: the call-to-action panel above the fold.
    ctaHref: z.string().optional(),
    ctaLabel: z.string().optional(),
    reasons: z.array(z.string()).optional(),
```

leaving:

```ts
const pages = defineCollection({
  // {md,mdx}: page bodies may use the content-block palette (src/components/content/).
  loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/pages' }),
  schema: z.object({
    title: z.string(),
    description: z.string().optional(),
  }),
});
```

- [ ] **Step 8: Build, test, and diff against the baseline**

```bash
npm run build && npm test && diff /tmp/pab-baseline/donate.html dist/donate/index.html
```

Expected: tests pass. The `diff` should show only:
- `data-astro-cid-*` attribute changes,
- `give-cta` → `cta-button` on the button's class list,
- curled apostrophes in the four reason bullets (`can't` → `can’t`, `We're` → `We’re`).

Anything else — a lost list item, a moved button, a changed heading — is a regression. Fix it
before committing.

- [ ] **Step 9: Commit**

```bash
git add src/components/content/Reasons.astro src/components/content/CTAButton.astro src/content/pages/donate.mdx src/pages/donate.astro src/content.config.ts test/build.test.mjs
git commit -m "feat: move the donate reasons box and CTA into content blocks"
```

---

## Task 6: The content-purity test

This is the forward contract with chat-cms's validator: content files stay pure Markdown plus
palette tags. Unlike Tasks 2–5 this is new behaviour, so it includes a step that proves the test
actually bites.

**Files:**
- Create: `test/content-purity.test.mjs`

**Interfaces:**
- Consumes: the palette directory `src/components/content/` populated by Tasks 2–5 (`Hero`, `FindYourProgram`, `Prose`, `Reasons`, `CTAButton`).
- Produces: nothing consumed downstream.

- [ ] **Step 1: Write the test**

`test/content-purity.test.mjs` in full:

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

// The forward contract with chat-cms: content files are pure Markdown plus tags from the
// palette directory. Nothing executable, nothing imported, no tag we did not sanction.
const CONTENT_DIR = 'src/content';
const PALETTE_DIR = 'src/components/content';

function contentFiles(dir = CONTENT_DIR) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
    e.isDirectory()
      ? contentFiles(join(dir, e.name))
      : /\.mdx?$/.test(e.name)
        ? [join(dir, e.name)]
        : [],
  );
}

// Fenced code blocks are literal text, not MDX, so they are exempt from every rule below.
const stripFences = (src) => src.replace(/^```[\s\S]*?^```/gm, '');

const all = contentFiles();
const mdx = all.filter((f) => f.endsWith('.mdx'));

test('there are content files to check', () => {
  assert.ok(all.length >= 7, `found only ${all.length} content files`);
  assert.ok(mdx.length >= 2, `found only ${mdx.length} .mdx files`);
});

test('no content file imports or exports anything', () => {
  for (const f of all) {
    assert.doesNotMatch(stripFences(readFileSync(f, 'utf8')), /^\s*(import|export)\s/m,
      `${f} has an import/export — the palette is injected by the route, never imported`);
  }
});

test('no MDX content file contains a JSX expression', () => {
  for (const f of mdx) {
    assert.doesNotMatch(stripFences(readFileSync(f, 'utf8')), /[{}]/,
      `${f} has a { } expression — attributes must be quoted strings`);
  }
});

test('every component tag used in content comes from the palette', () => {
  for (const f of mdx) {
    const tags = new Set(
      [...stripFences(readFileSync(f, 'utf8')).matchAll(/<([A-Z][A-Za-z0-9]*)/g)].map((m) => m[1]),
    );
    assert.ok(tags.size > 0, `${f} uses no palette tags`);
    for (const tag of tags) {
      assert.ok(existsSync(join(PALETTE_DIR, `${tag}.astro`)),
        `${f} uses <${tag}>, which is not in ${PALETTE_DIR}`);
    }
  }
});
```

- [ ] **Step 2: Run it**

```bash
npm test
```

Expected: all four tests PASS. (No build needed — this suite reads `src/`, not `dist/`.)

- [ ] **Step 3: Prove the test bites**

Temporarily append `<Bogus />` on its own line at the end of `src/content/pages/home.mdx`, then:

```bash
npm test
```

Expected: FAIL — `src/content/pages/home.mdx uses <Bogus>, which is not in src/components/content`.

Now temporarily change `<Prose>` in that file to `<Prose class={x}>` and re-run:

```bash
npm test
```

Expected: FAIL — `src/content/pages/home.mdx has a { } expression`.

- [ ] **Step 4: Revert both probes and confirm green**

```bash
git checkout src/content/pages/home.mdx
npm run build && npm test
```

Expected: build succeeds, every test passes, `git status` shows `home.mdx` clean.

- [ ] **Step 5: Commit**

```bash
git add test/content-purity.test.mjs
git commit -m "test: assert content files stay pure Markdown plus palette tags"
```

---

## Task 7: Documentation

**Files:**
- Modify: `CLAUDE.md` (tech-stack bullet, layout tree, "Editing content" section)
- Modify: `docs/hero-images.md:16` and `docs/hero-images.md:129`

**Interfaces:**
- Consumes: the finished palette from Tasks 2–6.
- Produces: nothing.

- [ ] **Step 1: Update the tech-stack bullet in `CLAUDE.md`**

In the "Tech stack & gotchas" list, append to the end of the **Astro 6** bullet:

```markdown
  Page bodies are **MDX** (`@astrojs/mdx`), which is what lets content files use the block
  palette; program pages stay plain Markdown.
```

- [ ] **Step 2: Update the layout tree in `CLAUDE.md`**

Replace these lines in the ```` ``` ```` layout block:

```
  content/
    pages/{home,about,donate}.md     # singleton page bodies (Markdown)
```

with:

```
  content/
    pages/{home,donate}.mdx  # singleton page bodies (Markdown + content blocks)
    pages/about.md           # plain Markdown — needs no blocks
```

and replace:

```
  components/                 # Header (nav), Footer, HeroCarousel, ProgramCard
```

with:

```
  components/                 # Header (nav), Footer, HeroCarousel, ProgramCard
    content/                  # THE BLOCK PALETTE — tags usable in content files
```

and replace:

```
    index.astro              # Home (hero + program cards + home.md body)
```

with:

```
    index.astro              # Home — a thin shell; structure lives in home.mdx
```

Also add to the `test/` lines:

```
test/content-purity.test.mjs # asserts content files stay pure Markdown + palette tags
```

- [ ] **Step 3: Add the palette subsection to `CLAUDE.md`**

Insert this immediately after the "Editing content (the common task)" intro bullets and before
the `### Home hero photos` heading:

```markdown
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

Rules for content files — a test (`test/content-purity.test.mjs`) enforces them:

- **Attributes are quoted strings.** No `{…}` expressions anywhere.
- **No `import` or `export`.** The route injects the components
  (`<Content components={{ Hero, … }} />`); content files never reach for them.
- **Only palette tags.** A tag with no matching `src/components/content/<Tag>.astro` fails the test.
- **Blank lines around Markdown children.** `<Reasons title="…">` needs an empty line before and
  after its bullet list, or MDX treats the children as raw text.

Adding a *new* block type is a developer task: create the component in `src/components/content/`,
add it to the route's `components={{…}}` map, and document it in the table above.
```

- [ ] **Step 4: Repoint the hero slide-list location in `docs/hero-images.md`**

Line 16 — change:

```markdown
| The slide list | `src/pages/index.astro` (`heroImages`) | Yes |
```

to:

```markdown
| The slide list | `src/components/content/Hero.astro` (`heroImages`) | Yes |
```

Line 129 — change:

```markdown
Add to `heroImages` in `src/pages/index.astro`:
```

to:

```markdown
Add to `heroImages` in `src/components/content/Hero.astro`:
```

- [ ] **Step 5: Verify no stale pointers remain**

```bash
grep -rn "heroImages" docs CLAUDE.md src | grep -v "superpowers/plans\|superpowers/specs"
```

Expected: only `docs/hero-images.md` (two hits) and `src/components/content/Hero.astro`. No hit
should mention `src/pages/index.astro`.

- [ ] **Step 6: Commit**

```bash
git add CLAUDE.md docs/hero-images.md
git commit -m "docs: describe the MDX content-block palette"
```

---

## Task 8: Full verification and the human visual check

**Files:** none modified (unless a defect turns up).

- [ ] **Step 1: Clean build from scratch**

```bash
rm -rf dist && npm run build && npm test
```

Expected: build succeeds; every test in both suites passes. Paste the actual test summary into the
report — do not assert success without it.

- [ ] **Step 2: Validate the deploy config is still sound**

```bash
npx wrangler deploy --dry-run
```

Expected: succeeds. (The refactor does not touch `wrangler.jsonc`; this catches an accidental
change to what lands in `dist/`.)

- [ ] **Step 3: Confirm the templates really are thin shells**

```bash
wc -l src/pages/index.astro src/pages/donate.astro && grep -c "" src/components/content/*.astro
```

Expected: `index.astro` ~14 lines, `donate.astro` ~17 lines, and five files in
`src/components/content/`.

Then confirm no prose survives in a template:

```bash
grep -n "Find your program\|Reasons to give\|Jump to the program\|Supporting Marching Band" src/pages src/layouts src/components/*.astro -r
```

Expected: **no matches**. Every one of those strings must now live in a content file.

- [ ] **Step 4: Diff the new build against the captured production HTML**

The live pages were captured to `/tmp/pab-prod-before/` *before* any of this work began (Task 0
below). Compare them to the fresh local build, normalising the volatile bits Astro regenerates:

```bash
node scripts/compare-render.mjs
```

That helper (written in Task 0) strips `data-astro-cid-*` attributes, `_astro/*.css` bundle
hashes, and collapses whitespace, then prints a unified diff of prod-vs-local for `/` and
`/donate/`. Expected remaining differences, and nothing else:
- `give-cta` → `cta-button` on the donate button's class list
- curled apostrophes in the four donate reason bullets

- [ ] **Step 5: Push and let Cloudflare deploy**

```bash
git push origin main
```

Deployment is automatic (Cloudflare Workers Builds runs `npm run build` then `npx wrangler
deploy`). Do not deploy by hand. Poll until the live HTML changes:

```bash
until curl -s https://lahsperformingartsboosters.org/donate/ | grep -q 'cta-button'; do sleep 20; done; echo DEPLOYED
```

- [ ] **Step 6: Verify production after the deploy**

Re-capture the live pages and diff them against the pre-change capture with the same normaliser:

```bash
node scripts/compare-render.mjs --refetch
```

Expected: the same two known differences from Step 4 and nothing more. Also re-check that the
site still serves correctly end to end:

```bash
curl -sI https://www.lahsperformingartsboosters.org/ | head -3   # expect 301 to the apex
for p in / /about/ /donate/ /programs/mbcg/ /programs/instrumental-music/ /programs/choir/ /programs/drama/; do
  printf '%s ' "$p"; curl -s -o /dev/null -w '%{http_code}\n' "https://lahsperformingartsboosters.org$p"
done
```

Expected: `301` for `www`, `200` for all seven pages.

- [ ] **Step 7: Report**

State plainly what shipped, the exact diff between the old and new production HTML, and the
verification output. Delete the throwaway comparison helper if it is not worth keeping.
