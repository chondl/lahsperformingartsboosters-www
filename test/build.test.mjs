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

// "Los Altos High Eagle Band Boosters" is the legal name; "…Performing Arts Boosters" is
// the DBA. The legal name is what banks, DAFs, and matching portals recognize, so anywhere
// we state the EIN or tell someone where to send money, it has to appear.
test('the EIN never appears without the legal name', () => {
  for (const f of expected.filter((f) => f.endsWith('.html'))) {
    const html = readFileSync(f, 'utf8');
    if (!html.includes('EIN 77-0525170')) continue;
    assert.match(html, /Los Altos High Eagle Band Boosters/, `${f} states the EIN under the DBA alone`);
  }
});

test('payment instructions name the legal entity', () => {
  const donate = readFileSync('dist/donate/index.html', 'utf8');
  for (const context of [/payable to.{0,40}Los Altos High Eagle Band Boosters/s,
                         /recommend the grant.{0,80}Los Altos High Eagle Band Boosters/s]) {
    assert.match(donate, context);
  }
});

// Mail is the one money context that takes the DBA: the school office routes by the name
// it knows. A mailed check is payable to the legal name but addressed to the DBA.
test('mailing addresses use the DBA, not the legal name', () => {
  for (const f of expected.filter((f) => f.endsWith('.html'))) {
    const html = readFileSync(f, 'utf8');
    if (!html.includes('201 Almond Avenue')) continue;
    assert.doesNotMatch(html, /Eagle Band Boosters,? 201 Almond/, `${f} addresses mail to the legal name`);
    assert.match(html, /Performing Arts Boosters(<[^>]*>|,|\s)*\s*201 Almond/, `${f} address lacks the DBA`);
  }
});

test('the home hero has a single primary Donate call to action', () => {
  const html = readFileSync('dist/index.html', 'utf8');
  assert.match(html, /<a class="btn btn-primary" href="\/donate\/"[^>]*>Donate</);
  assert.doesNotMatch(html, /Find your program<\/a>/);
});
