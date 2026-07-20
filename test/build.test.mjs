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

test('no placeholder donation URLs ship', () => {
  for (const f of expected) {
    assert.doesNotMatch(readFileSync(f, 'utf8'), /REPLACE_|form\.jotform\.com/, `placeholder in ${f}`);
  }
});

test('the per-program /donate/* short links are gone', () => {
  const r = readFileSync('dist/_redirects', 'utf8');
  for (const slug of ['mbcg', 'instrumental', 'choir', 'drama']) {
    assert.doesNotMatch(r, new RegExp(`^/donate/${slug}\\b`, 'm'), `stale /donate/${slug}`);
  }
});

test('giving is funnelled to the single /bts campaign', () => {
  assert.match(readFileSync('dist/donate/index.html', 'utf8'), /href="\/bts"/);
  for (const p of ['instrumental-music', 'choir', 'drama']) {
    assert.match(readFileSync(`dist/programs/${p}/index.html`, 'utf8'), /href="\/bts"/, `${p} missing /bts`);
  }
});

test('MBCG has no donate button (it runs a separate campaign)', () => {
  assert.doesNotMatch(readFileSync('dist/programs/mbcg/index.html', 'utf8'), /href="\/bts"/);
});

test('the home hero has a single primary Donate call to action', () => {
  const html = readFileSync('dist/index.html', 'utf8');
  assert.match(html, /<a class="btn btn-primary" href="\/donate\/"[^>]*>Donate</);
  assert.doesNotMatch(html, /Find your program<\/a>/);
});
