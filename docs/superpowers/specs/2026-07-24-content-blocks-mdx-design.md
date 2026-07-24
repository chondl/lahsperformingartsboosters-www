# Content blocks — making page structure editable through content files

**Status:** Approved design (2026-07-24)
**Author:** Chris Hondl + Claude
**Origin:** side project identified during the chat-cms design
(`~/learn/chat-cms/docs/superpowers/specs/2026-07-23-chat-cms-design.md`, §5
"Blocks" and §13). This spec stands alone; chat-cms is motivation, not a
dependency.

## 1. Summary

Today, every page's *prose* is editable in content files, but several
page *blocks* are hardcoded in Astro templates: the home hero's text, the
"Find your program" section heading, and the fixed placement of the donate
page's reasons box and CTA. This project converts those blocks into a small
**MDX content-block palette**, so that page structure — which blocks appear,
in what order, with what text — is expressible entirely in the content
files. After it lands, everything text-shaped on the site, fold to footer,
is editable by changing content files only, and blocks can be removed,
restored, or reordered the same way.

This also makes the site the reference implementation for chat-cms's palette
model: content files stay pure Markdown-plus-tags with zero executable
content.

## 2. Goals and non-goals

**Goals**

- Every text string on every page lives in a content file (body or
  frontmatter) — no prose or headings hardcoded in `.astro` templates.
- Page structure (block presence, order, text) is editable in content files:
  removing a block's tag removes the block; restoring it restores the block.
- Content files remain **pure Markdown plus palette tags**: quoted string
  attributes and Markdown children only — no imports, no scripts, no JSX
  `{…}` expressions. (The chat-cms validator will later enforce this;
  until then it is a stated convention with a test.)
- Rendered output is visually unchanged — this is a refactor, not a
  redesign.
- Non-technical GitHub-web-UI editing stays viable: body prose is untouched;
  the tags read as obvious placeholders.

**Non-goals**

- **Images stay code-side.** The hero photo array (paths + focal points)
  remains in code per the documented crop workflow
  ([docs/hero-images.md](../../hero-images.md)); `<Hero>` exposes only text.
- **No new block types.** The palette is exactly the blocks the site has
  today.
- **Program pages are out of scope.** They are already fully content-driven:
  one route renders the collection, and buttons/cards are conditional
  frontmatter fields (the tier-1 pattern). No change.
- **No `.chat-cms/` folder yet** — that arrives when chat-cms onboards this
  site.
- Nav, header, footer: site chrome, not page blocks. Unchanged.

## 3. Block inventory (complete)

| Block | Today | After |
|---|---|---|
| Home hero text (title, subtitle) | Hardcoded props in `index.astro` | `<Hero title="…" subtitle="…" />` in `home.mdx` |
| "Find your program" (eyebrow, heading, program grid) | Hardcoded in `index.astro` | `<FindYourProgram eyebrow="…" heading="…" />` in `home.mdx` (grid renders from the programs collection internally) |
| Donate "Reasons to give" box | `reasons:` frontmatter list rendered at a fixed template position | `<Reasons title="Reasons to give">` with a Markdown bullet list as children, placed in `donate.mdx` body |
| Donate CTA button | `ctaHref`/`ctaLabel` frontmatter at fixed position | `<CTAButton href="/bts" label="…" />` placed in `donate.mdx` body |

That is the whole palette: **four components**. `about.md` needs no blocks
and stays plain Markdown.

## 4. Design

- **Add `@astrojs/mdx`.** `home.md` → `home.mdx`, `donate.md` →
  `donate.mdx`; the `pages` collection glob admits both extensions.
- **Palette components live in `src/components/content/`** — a designated
  directory that *is* the palette (chat-cms later derives the allowed-tag
  list from it). Each is a thin wrapper over existing markup/components
  (HeroCarousel, the programs grid, the donate boxes).
- **Templates become thin shells.** `index.astro` and `donate.astro` reduce
  to: BaseLayout + `<Content components={palette} />` (components injected
  by the route — content files never import anything). `index.astro` keeps
  the `heroImages` array and passes it into the palette's `<Hero>`.
- **Attribute/children convention:** scalars as quoted string attributes;
  prose and lists as Markdown children. The donate `reasons:` frontmatter
  list and `ctaHref`/`ctaLabel` fields migrate into the body as tag
  children/attributes and are **removed from the pages collection schema**.
- **Conditional rendering convention (site-wide):** components must treat
  optional content — absent tags, absent frontmatter fields — as "don't
  render the block," never as an error. (Mostly true today: `showDonate`,
  `cardImage`, `googleGroupUrl` already follow it.)
- **One-`<h1>` rule holds:** `<Hero>` renders the home page's only `<h1>`
  from its `title` attribute; `home.mdx` keeps its frontmatter `title` for
  the document `<title>`/metadata only (the layout must not render a second
  `<h1>` for home). About/donate keep the frontmatter-`title` `<h1>` from
  the layout, as today.

## 5. Documentation

- **CLAUDE.md**: update the "Editing content" section — what the palette is,
  the tag syntax rules (string attributes + Markdown children, nothing
  executable), how removing/restoring a block works, and that
  `src/components/content/` is the palette directory.
- The spec (this file) is the design record; no separate doc needed.

## 6. Testing

- All existing post-build assertions keep passing (7 pages, `_redirects`,
  EIN-never-with-DBA-alone, one `<h1>` per page).
- **New assertions** in the post-build suite:
  - Rendered home page contains the hero title/subtitle text and the
    program grid; rendered donate page contains the reasons items and a
    CTA link to `/bts` — guarding against a silent block-drop regression.
  - **Content purity:** no content file contains `import`/`export`
    statements or JSX `{…}` expressions; any component tag used in a
    content file exists in `src/components/content/`. This test is the
    forward-contract with chat-cms's validator.
- **Visual check before push:** run the dev server and compare home and
  donate against production side by side (same human-review habit as the
  hero-image workflow); output is expected to be visually identical.

## 7. Decisions log

| Decision | Choice | Why |
|---|---|---|
| Mechanism | MDX with route-injected components | Content files stay import-free and executable-free; palette is enforceable. |
| Palette size | Exactly the four existing blocks | YAGNI — new block types are a future developer task, after which they join the palette. |
| Donate reasons/CTA | Move from frontmatter to body tags | Structure (placement, presence, order) becomes editable, not just text; children are plain Markdown bullets — easier to edit than YAML lists. |
| Program pages | Untouched | Already fully content-driven via conditional frontmatter. |
| Images | Stay in code | Focal-point/crop workflow is deliberate developer work ([docs/hero-images.md](../../hero-images.md)). |
| Trade-off accepted | Tags visible to raw-GitHub editors | Mild complexity increase in exchange for structure-editability; body prose is unchanged. |
