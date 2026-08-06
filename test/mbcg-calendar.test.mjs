import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { parseSeasonCalendar, buildIcs } from '../src/lib/season-calendar.mjs';

// The season-calendar table in mbcg.md is now load-bearing: the /calendar/mbcg.ics feed is
// parsed out of it at build time (see docs/mbcg-calendar-feed.md). These tests pin the
// parsing contract against the real content file, so a table edit that the parser cannot
// read fails here — and fails the build — instead of silently shipping a wrong calendar.

const source = readFileSync('src/content/programs/mbcg.md', 'utf8');
const seasonYear = Number(source.match(/^seasonYear:\s*(\d{4})\s*$/m)?.[1]);
const events = parseSeasonCalendar(source, seasonYear);

function eventRowCount(md) {
  const section = md.split(/^## /m).find((s) => s.startsWith('Season calendar')) ?? '';
  return section
    .split('\n')
    .filter((l) => l.trim().startsWith('|'))
    .map((l) => l.split('|').slice(1, -1).map((c) => c.trim()))
    .filter((c) => c.length === 3 && c[0] !== 'Date' && !/^[-: ]+$/.test(c[0]) && !/^\*\*.+\*\*$/.test(c[0]))
    .length;
}

test('mbcg.md declares the seasonYear the feed needs', () => {
  assert.ok(Number.isInteger(seasonYear), 'mbcg.md frontmatter is missing seasonYear');
});

test('every event row in the table becomes exactly one calendar event', () => {
  const rows = eventRowCount(source);
  assert.ok(rows > 0, 'found no event rows in the season-calendar table');
  assert.equal(events.length, rows);
});

test('a dated single event parses with its link', () => {
  const e = events.find((ev) => ev.summary.includes('Independence Show'));
  assert.ok(e, 'Independence Show not found');
  assert.equal(e.start, '20261017T090000'); // "9:00 AM at LAHS" → 9 AM report time
  assert.match(e.description ?? '', /at LAHS/);
  assert.match(e.url ?? '', /westernbands\.org.*ID=1517/);
});

test('a timed single-day event gets a local start time', () => {
  const e = events.find((ev) => ev.summary.includes('Back to School Night'));
  assert.ok(e, 'Back to School Night not found');
  assert.equal(e.allDay, false);
  assert.equal(e.start, '20260827T180000');
});

test('a timed event with an end time keeps it', () => {
  const e = events.find((ev) => ev.start === '20261002T160000');
  assert.ok(e, 'Oct 2 football game not found');
  assert.equal(e.end, '20261002T210000');
});

test('a multi-day row becomes an all-day span with its times in the description', () => {
  const e = events.find((ev) => ev.summary.includes('Home band camp'));
  assert.ok(e, 'band camp not found');
  assert.equal(e.allDay, true);
  assert.equal(e.start, '20260803');
  assert.equal(e.end, '20260809'); // iCal all-day DTEND is exclusive: Aug 3–8 ends on the 9th
  assert.match(e.description ?? '', /9:00 AM/);
});

test('a TBD time falls back to an all-day event', () => {
  const e = events.find((ev) => ev.summary.includes('Class Championships'));
  assert.ok(e, 'championships not found');
  assert.equal(e.allDay, true);
  assert.match(e.description ?? '', /TBD/);
});

test('a start time with no meridiem inherits it from the end time', () => {
  // "4:00 – 7:00 PM" (Nov 20) must read as 4 PM, not 4 AM.
  const e = events.find((ev) => ev.summary.includes('depart for championships'));
  assert.ok(e, 'Nov 20 rehearsal not found');
  assert.equal(e.start, '20261120T160000');
  assert.equal(e.end, '20261120T190000');
});

test('the year rolls over for spring months', () => {
  const md = '## Season calendar\n\n| Date | Time | Activity |\n|---|---|---|\n| Sat, Jan 9 | — | Winter thing |\n';
  const [e] = parseSeasonCalendar(md, 2026);
  assert.equal(e.start, '20270109'); // Jan belongs to the spring following the fall season
});

test('a weekday that contradicts the date fails the build', () => {
  const md = '## Season calendar\n\n| Date | Time | Activity |\n|---|---|---|\n| Fri, Aug 27 | — | Mislabeled |\n';
  assert.throws(() => parseSeasonCalendar(md, 2026), /Aug 27/); // Aug 27 2026 is a Thursday
});

test('an unreadable date cell fails the build', () => {
  const md = '## Season calendar\n\n| Date | Time | Activity |\n|---|---|---|\n| sometime in fall | — | Vague |\n';
  assert.throws(() => parseSeasonCalendar(md, 2026), /sometime in fall/);
});

test('the generated ICS is structurally sound', () => {
  const ics = buildIcs(events);
  assert.match(ics, /^BEGIN:VCALENDAR\r\n/);
  assert.match(ics, /END:VCALENDAR\r\n$/);
  assert.match(ics, /X-WR-CALNAME:LAHS Marching Band & Color Guard/);
  assert.match(ics, /BEGIN:VTIMEZONE/);
  assert.match(ics, /TZID:America\/Los_Angeles/);
  assert.equal((ics.match(/BEGIN:VEVENT/g) ?? []).length, events.length);
  for (const line of ics.split('\r\n')) {
    assert.ok(Buffer.byteLength(line, 'utf8') <= 75, `ICS line over 75 octets: ${line}`);
  }
  // UIDs are stable across builds (derived from date + summary), so edits update
  // subscribers' events in place instead of duplicating them.
  const uids = [...ics.matchAll(/^UID:(.+)$/gm)].map((m) => m[1]);
  assert.equal(new Set(uids).size, events.length, 'UIDs are not unique');
});

// ---- post-build assertions (require `npm run build` first, like build.test.mjs) ----

test('the calendar feed ships at /calendar/mbcg.ics', () => {
  assert.ok(existsSync('dist/calendar/mbcg.ics'), 'dist/calendar/mbcg.ics missing — run npm run build');
  const ics = readFileSync('dist/calendar/mbcg.ics', 'utf8');
  assert.match(ics, /^BEGIN:VCALENDAR\r\n/);
  assert.equal((ics.match(/BEGIN:VEVENT/g) ?? []).length, events.length);
});

test('the MBCG page offers the subscribe links', () => {
  const html = readFileSync('dist/programs/mbcg/index.html', 'utf8');
  assert.match(html, /href="https:\/\/calendar\.google\.com\/calendar\/render\?cid=/, 'no Google Calendar subscribe link');
  assert.match(html, /href="webcal:\/\/lahsperformingartsboosters\.org\/calendar\/mbcg\.ics"/, 'no Apple/webcal subscribe link');
});
