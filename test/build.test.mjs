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

// PLACEHOLDER caught a live regression: three program pages shipped dead "Join the Google
// Group" buttons because the placeholder lived in frontmatter, not the body.
test('no placeholder URLs ship', () => {
  for (const f of expected) {
    assert.doesNotMatch(readFileSync(f, 'utf8'), /REPLACE_|PLACEHOLDER|form\.jotform\.com/, `placeholder in ${f}`);
  }
});

test('no program page links out to a Google Group or volunteer sheet yet', () => {
  for (const p of ['mbcg', 'instrumental-music', 'choir', 'drama']) {
    const html = readFileSync(`dist/programs/${p}/index.html`, 'utf8');
    assert.doesNotMatch(html, /href="[^"]*groups\.google\.com/, `${p} links to a Google Group`);
    // Volunteer sheets are Google Sheets; docs.google.com/forms (the updates form) is fine.
    assert.doesNotMatch(html, /href="[^"]*docs\.google\.com\/spreadsheets/, `${p} links to a volunteer sheet`);
  }
});

test('MBCG carries the updates sign-up form button', () => {
  const html = readFileSync('dist/programs/mbcg/index.html', 'utf8');
  assert.match(html, /<a class="btn" href="https:\/\/docs\.google\.com\/forms\/[^"]+"[^>]*>Sign up for MBCG updates<\/a>/);
  assert.match(html, /Stay in the loop/);
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

test('MBCG gives to its own campaign via /donate-mbcg, never /bts', () => {
  const html = readFileSync('dist/programs/mbcg/index.html', 'utf8');
  assert.doesNotMatch(html, /href="\/bts"/);
  assert.match(html, /<a class="btn btn-primary" href="\/donate-mbcg"[^>]*>Give to the MBCG campaign</, 'MBCG donate button missing');
  assert.match(html, /<a class="btn btn-primary btn-lg" href="\/donate-mbcg">Give to the MBCG campaign</, 'MBCG in-section donate button missing');
  for (const p of ['instrumental-music', 'choir', 'drama']) {
    assert.doesNotMatch(readFileSync(`dist/programs/${p}/index.html`, 'utf8'), /donate-mbcg/, `${p} links the MBCG campaign`);
  }
});

test('the Fall Festival date is published everywhere it is mentioned', () => {
  assert.match(readFileSync('dist/index.html', 'utf8'), /Saturday, October 31, 2026/);
  assert.match(readFileSync('dist/programs/choir/index.html', 'utf8'), /Fall Festival<\/strong> — Saturday, October 31, 2026/);
  assert.doesNotMatch(readFileSync('dist/programs/choir/index.html', 'utf8'), /date TBD/);
});

test('the home page lists the Boosters meeting dates', () => {
  const html = readFileSync('dist/index.html', 'utf8');
  assert.match(html, /id="boosters-meetings"/);
  assert.match(html, /Tuesdays at 7:00 PM on Zoom/);
  // In prose in the meetings section, and again as table rows in the season calendar.
  assert.match(html, /Sep 1, Sep 29, Oct 27, Dec 1, Feb 9, Apr 13, and May 25/, 'meeting-dates prose missing');
  assert.equal((html.match(/LAHS Performing Arts Boosters Meeting/g) ?? []).length, 7, 'expected seven meeting rows');
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

// The hero references photos by path, so a typo or a deleted file degrades to an invisible
// blank slide rather than an error. Assert every slide resolves to a file we actually ship.
test('every hero slide points at a photo that shipped', () => {
  const html = readFileSync('dist/index.html', 'utf8');
  const slides = [...html.matchAll(/background-image:url\('([^']+)'\)/g)].map((m) => m[1]);
  assert.ok(slides.length > 0, 'hero has no slides');
  for (const src of slides) assert.ok(existsSync(`dist${src}`), `hero slide missing: ${src}`);
});

// Same failure mode as the hero slides: a card photo is referenced by path, so a typo or a
// deleted file degrades to a broken image rather than a build error.
test('every program card photo that shipped resolves to a file', () => {
  const html = readFileSync('dist/index.html', 'utf8');
  const cards = [...html.matchAll(/<img[^>]*class="top-img"[^>]*src="([^"]+)"/g)].map((m) => m[1]);
  assert.equal(cards.length, 4, 'expected a photo on all four program cards');
  for (const src of cards) assert.ok(existsSync(`dist${src}`), `card photo missing: ${src}`);
});

// The photos are decorative — each card already carries its program name as text — so an
// alt describing them would be read out as noise.
test('program card photos are marked decorative', () => {
  const html = readFileSync('dist/index.html', 'utf8');
  for (const tag of html.match(/<img[^>]*class="top-img"[^>]*>/g) ?? []) {
    assert.match(tag, /alt=""/, `card photo lacks an empty alt: ${tag}`);
  }
});

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

test('the find-your-program block renders its heading and every program card', () => {
  const html = readFileSync('dist/index.html', 'utf8');
  assert.match(html, /id="find-your-program"/);
  assert.match(html, /Find your program/);
  assert.match(html, /Jump to the program your family is part of/);
  assert.equal((html.match(/class="pcard"/g) ?? []).length, 4, 'expected four program cards');
});

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

// The home page is a flat MDX flow: blocks plus body prose. These assertions fail loudly if a
// block silently disappears from the content file — the one regression this refactor can cause.
test('the home body prose renders inside the prose container', () => {
  const html = readFileSync('dist/index.html', 'utf8');
  assert.match(html, /class="container section prose"/, 'home lost its prose section');
  assert.match(html, /Supporting the arts at Los Altos High School/);
  assert.match(html, /The Fall Festival/);
});

test('the home hero has a single primary Donate call to action', () => {
  const html = readFileSync('dist/index.html', 'utf8');
  assert.match(html, /<a class="btn btn-primary" href="\/donate\/"[^>]*>Donate</);
  assert.doesNotMatch(html, /Find your program<\/a>/);
});
