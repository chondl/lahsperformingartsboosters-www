import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { parseSeasonCalendar, buildIcs } from '../src/lib/season-calendar.mjs';

// The season-calendar table on the home page is load-bearing: the /calendar/pab.ics feed
// is parsed out of it at build time (docs/pab-calendar-feed.md). These tests pin the
// parsing contract against the real content file, so an edit the parser cannot read
// fails here — and fails the build — instead of silently shipping a wrong calendar.

const source = readFileSync('src/content/pages/home.mdx', 'utf8');
const seasonYear = Number(source.match(/^seasonYear:\s*(\d{4})\s*$/m)?.[1]);
const events = parseSeasonCalendar(source, seasonYear);

test('home.mdx declares the seasonYear the feed needs', () => {
  assert.ok(Number.isInteger(seasonYear), 'home.mdx frontmatter is missing seasonYear');
});

test('every event title starts with LAHS, for readability on subscriber calendars', () => {
  assert.ok(events.length > 0);
  for (const e of events) assert.match(e.summary, /^LAHS/, `title without LAHS prefix: ${e.summary}`);
});

test('every event carries a Where — LAHS, MVHS, or Zoom', () => {
  for (const e of events) {
    assert.ok(['LAHS', 'MVHS', 'Zoom'].includes(e.location), `unexpected Where for ${e.summary}: ${e.location}`);
  }
});

test('all seven Boosters meetings are timed Zoom events', () => {
  const meetings = events.filter((e) => e.summary === 'LAHS Performing Arts Boosters Meeting');
  assert.equal(meetings.length, 7);
  for (const m of meetings) {
    assert.equal(m.allDay, false);
    assert.equal(m.location, 'Zoom');
    assert.match(m.start, /T190000$/, `meeting not at 7:00 PM: ${m.start}`);
  }
  assert.equal(meetings[0].start, '20260901T190000');
  assert.equal(meetings.at(-1).start, '20270525T190000');
});

test('a two-night show expands to one 7 PM event per night', () => {
  const nights = events.filter((e) => e.summary.includes('Cinderella'));
  assert.equal(nights.length, 2, 'Nov 6–7 should be two events');
  assert.equal(nights[0].start, '20261106T190000');
  assert.equal(nights[1].start, '20261107T190000');
  assert.equal(nights[0].allDay, false);
});

test('the Fall Festival starts at 12:30 PM at LAHS', () => {
  const e = events.find((ev) => ev.summary.includes('Fall Festival'));
  assert.ok(e, 'Fall Festival not found');
  assert.equal(e.start, '20261031T123000');
  assert.equal(e.location, 'LAHS');
});

test('the year rolls over for spring events', () => {
  const e = events.find((ev) => ev.summary.includes('Spring Sing'));
  assert.ok(e, 'Spring Sing not found');
  assert.equal(e.start, '20270315T190000');
});

test('the one MVHS event carries its location', () => {
  const e = events.find((ev) => ev.summary.includes('Orchestras'));
  assert.ok(e, 'Orchestras concert not found');
  assert.equal(e.location, 'MVHS');
});

test('the generated ICS carries LOCATION lines and the calendar name', () => {
  const ics = buildIcs(events, 'LAHS Performing Arts');
  assert.match(ics, /X-WR-CALNAME:LAHS Performing Arts\r\n/);
  assert.match(ics, /LOCATION:Zoom/);
  assert.match(ics, /LOCATION:MVHS/);
  assert.equal((ics.match(/BEGIN:VEVENT/g) ?? []).length, events.length);
  assert.equal((ics.match(/^LOCATION:/gm) ?? []).length, events.length);
});

// ---- unit checks for the 4-column / bare-start-time parsing this feed relies on ----

test('a 3-column table still parses with no location', () => {
  const md = '## Season calendar\n\n| Date | Time | Activity |\n|---|---|---|\n| Thu, Aug 27 | 6:00 PM | Thing |\n';
  const [e] = parseSeasonCalendar(md, 2026);
  assert.equal(e.location, null);
});

test('a bare start time on a date range repeats per day with a one-hour default', () => {
  const md = '## Season calendar\n\n| Date | Time | Event | Where |\n|---|---|---|---|\n| Fri–Sat, Nov 6 – 7 | 7:00 PM | Show | LAHS |\n';
  const two = parseSeasonCalendar(md, 2026);
  assert.equal(two.length, 2);
  assert.equal(two[0].end, '20261106T200000');
  assert.equal(two[1].start, '20261107T190000');
});

// ---- post-build assertions (require `npm run build` first, like build.test.mjs) ----

test('the calendar feed ships at /calendar/pab.ics', () => {
  assert.ok(existsSync('dist/calendar/pab.ics'), 'dist/calendar/pab.ics missing — run npm run build');
  const ics = readFileSync('dist/calendar/pab.ics', 'utf8');
  assert.match(ics, /^BEGIN:VCALENDAR\r\n/);
  assert.equal((ics.match(/BEGIN:VEVENT/g) ?? []).length, events.length);
});

test('the home page shows the season table and offers the subscribe links', () => {
  const html = readFileSync('dist/index.html', 'utf8');
  assert.match(html, /LAHS Choir Concert – A Season of Song/);
  assert.match(html, /href="https:\/\/calendar\.google\.com\/calendar\/render\?cid=webcal%3A%2F%2Flahsperformingartsboosters\.org%2Fcalendar%2Fpab\.ics"/,
    'no Google Calendar subscribe link');
  assert.match(html, /href="webcal:\/\/lahsperformingartsboosters\.org\/calendar\/pab\.ics"/, 'no Apple/webcal subscribe link');
});
