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
    // MDX spells the ampersand entity &amp; where the Markdown pipeline spelled it &#x26;.
    // Both decode to "&" — same rendered text, so fold them together.
    .replace(/&#x26;/g, '&amp;')
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
