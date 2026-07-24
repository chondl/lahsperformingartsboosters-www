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
