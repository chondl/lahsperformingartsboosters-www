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
