import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import {
  parseSeasonCalendar, parseWeeklyRehearsals, buildSeasonEvents, buildIcs,
} from '../src/lib/season-calendar.mjs';

// The season-calendar table and rehearsal bullet list in mbcg.md are load-bearing: the
// /calendar/mbcg.ics feed is parsed out of them at build time (docs/mbcg-calendar-feed.md).
// These tests pin the parsing contract against the real content file, so an edit the
// parser cannot read fails here — and fails the build — instead of silently shipping a
// wrong calendar.

const source = readFileSync('src/content/programs/mbcg.md', 'utf8');
const seasonYear = Number(source.match(/^seasonYear:\s*(\d{4})\s*$/m)?.[1]);
const frontDate = (key) => source.match(new RegExp(`^${key}:\\s*(\\S+)\\s*$`, 'm'))?.[1];
const events = parseSeasonCalendar(source, seasonYear);
const feed = buildSeasonEvents(source, {
  seasonYear,
  rehearsalsFrom: frontDate('rehearsalsFrom'),
  rehearsalsThrough: frontDate('rehearsalsThrough'),
});

test('mbcg.md declares the frontmatter the feed needs', () => {
  assert.ok(Number.isInteger(seasonYear), 'mbcg.md frontmatter is missing seasonYear');
  assert.ok(frontDate('rehearsalsFrom'), 'missing rehearsalsFrom');
  assert.ok(frontDate('rehearsalsThrough'), 'missing rehearsalsThrough');
});

test('a dated single event parses with its link and the 9-to-9 competition window', () => {
  const e = events.find((ev) => ev.summary.includes('Independence Show'));
  assert.ok(e, 'Independence Show not found');
  assert.equal(e.start, '20261017T090000');
  assert.equal(e.end, '20261017T210000');
  assert.match(e.description ?? '', /at LAHS/);
  assert.match(e.url ?? '', /westernbands\.org.*ID=1517/);
});

test('a timed single-day event gets a local start time', () => {
  const e = events.find((ev) => ev.summary.includes('Back to School Night'));
  assert.ok(e, 'Back to School Night not found');
  assert.equal(e.allDay, false);
  assert.equal(e.start, '20260827T180000');
});

test('camp rows with daily hours expand to one timed event per day', () => {
  const camp = events.filter((ev) => ev.summary.includes('Home band camp'));
  assert.equal(camp.length, 6, 'Aug 3–8 should be six events');
  assert.equal(camp[0].start, '20260803T090000');
  assert.equal(camp[0].end, '20260803T160000');
  assert.equal(camp[5].start, '20260808T090000');
  const workshops = events.filter((ev) => ev.summary.includes('leadership workshops'));
  assert.equal(workshops.length, 3, 'Jul 30 – Aug 1 should be three events');
  assert.equal(workshops[2].start, '20260801T090000');
});

test('a weekday-prefixed time range becomes one continuous overnight event', () => {
  const e = events.find((ev) => ev.summary.includes('Camp Jones Gulch'));
  assert.ok(e, 'away camp not found');
  assert.equal(e.allDay, false);
  assert.equal(e.start, '20260925T160000');
  assert.equal(e.end, '20260927T160000');
});

test('a no-rehearsal range stays an all-day span', () => {
  const e = events.find((ev) => ev.summary.includes('Labor Day'));
  assert.ok(e, 'Labor Day not found');
  assert.equal(e.allDay, true);
  assert.equal(e.start, '20260904');
  assert.equal(e.end, '20260908'); // iCal all-day DTEND is exclusive
});

test('homecoming splits into a parade and a game event', () => {
  const oct30 = events.filter((ev) => ev.start.startsWith('20261030'));
  assert.equal(oct30.length, 2);
  const [parade, game] = oct30;
  assert.match(parade.summary, /Homecoming parade/);
  assert.equal(parade.start, '20261030T130000');
  assert.equal(parade.end, '20261030T140000');
  assert.match(game.summary, /homecoming football game/);
  assert.equal(game.start, '20261030T160000');
  assert.equal(game.end, '20261030T210000');
});

test('the Fall Festival Saturday is a shortened rehearsal then the festival', () => {
  const oct31 = events.filter((ev) => ev.start.startsWith('20261031'));
  assert.equal(oct31.length, 2, `expected rehearsal + festival, got: ${oct31.map((e) => e.summary).join('; ')}`);
  const [rehearsal, festival] = oct31;
  assert.match(rehearsal.summary, /Rehearsal/);
  assert.equal(rehearsal.start, '20261031T090000');
  assert.equal(rehearsal.end, '20261031T110000');
  assert.match(festival.summary, /Fall Festival/);
  assert.equal(festival.start, '20261031T110000');
  assert.equal(festival.end, '20261031T170000');
  // The table rows replace the generated 9-to-4 Saturday rehearsal that day.
  assert.equal(feed.filter((ev) => ev.start.startsWith('20261031')).length, 2);
});

test('the Festival of Lights window parses with the meet/parade note kept', () => {
  const e = events.find((ev) => ev.summary.includes('Festival of Lights'));
  assert.equal(e.start, '20261129T150000');
  assert.equal(e.end, '20261129T200000');
  assert.match(e.description, /meet 3:00, parade at 6:00/);
});

test('every event in the table now carries a concrete time except the no-rehearsal notice', () => {
  const allDay = events.filter((ev) => ev.allDay);
  assert.equal(allDay.length, 1, `unexpected all-day events: ${allDay.map((e) => e.summary).join('; ')}`);
  assert.match(allDay[0].summary, /no rehearsal/);
});

test('the weekly rehearsal bullet list parses', () => {
  const r = parseWeeklyRehearsals(source);
  assert.deepEqual(r.map((x) => [x.dow, x.label]), [
    [1, 'Brass & Woodwinds'], [3, 'Percussion & Color Guard'], [5, 'full ensemble'], [6, 'full ensemble'],
  ]);
  assert.equal(r[0].time.start.h, 16);
  assert.equal(r[3].time.start.h, 9);
  assert.equal(r[3].time.end.h, 16);
});

test('the feed generates rehearsals only on uncovered days inside the span', () => {
  const rehearsals = feed.filter((ev) => ev.summary.includes('Rehearsal —'));
  assert.ok(rehearsals.length > 30, `only ${rehearsals.length} rehearsals generated`);
  const days = rehearsals.map((ev) => ev.start.slice(0, 8));
  assert.ok(days.includes('20260810'), 'first Monday after band camp missing');
  assert.ok(!days.includes('20260808'), 'rehearsal generated before rehearsalsFrom');
  assert.ok(!days.some((d) => d > '20261120'), 'rehearsal generated after rehearsalsThrough');
  assert.ok(!days.includes('20261002'), 'football Friday should override rehearsal');
  assert.ok(!days.includes('20260905'), 'Labor Day Saturday should override rehearsal');
  assert.ok(!days.includes('20260926'), 'away-camp Saturday should override rehearsal');
  assert.ok(!days.includes('20261111'), 'the Veterans Day row already covers that Wednesday');
  assert.equal(feed.filter((ev) => ev.start.startsWith('20261111')).length, 1);
});

test('every feed entry is prefixed with MBCG', () => {
  assert.ok(feed.length > 0);
  for (const e of feed) assert.match(e.summary, /^MBCG: /, `unprefixed: ${e.summary}`);
});

test('the feed is sorted chronologically', () => {
  for (let i = 1; i < feed.length; i++) {
    assert.ok(feed[i - 1].start <= feed[i].start, `out of order at ${feed[i].summary}`);
  }
});

test('the year rolls over for spring months', () => {
  const md = '## Season calendar\n\n| Date | Time | Activity |\n|---|---|---|\n| Sat, Jan 9 | — | Winter thing |\n';
  const [e] = parseSeasonCalendar(md, 2026);
  assert.equal(e.start, '20270109');
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
  const ics = buildIcs(feed);
  assert.match(ics, /^BEGIN:VCALENDAR\r\n/);
  assert.match(ics, /END:VCALENDAR\r\n$/);
  assert.match(ics, /X-WR-CALNAME:LAHS Marching Band & Color Guard/);
  assert.match(ics, /BEGIN:VTIMEZONE/);
  assert.match(ics, /TZID:America\/Los_Angeles/);
  assert.equal((ics.match(/BEGIN:VEVENT/g) ?? []).length, feed.length);
  for (const line of ics.split('\r\n')) {
    assert.ok(Buffer.byteLength(line, 'utf8') <= 75, `ICS line over 75 octets: ${line}`);
  }
  // UIDs are stable across builds (derived from start + summary), so edits update
  // subscribers' events in place instead of duplicating them.
  const uids = [...ics.matchAll(/^UID:(.+)$/gm)].map((m) => m[1]);
  assert.equal(new Set(uids).size, feed.length, 'UIDs are not unique');
});

// ---- post-build assertions (require `npm run build` first, like build.test.mjs) ----

test('the calendar feed ships at /calendar/mbcg.ics', () => {
  assert.ok(existsSync('dist/calendar/mbcg.ics'), 'dist/calendar/mbcg.ics missing — run npm run build');
  const ics = readFileSync('dist/calendar/mbcg.ics', 'utf8');
  assert.match(ics, /^BEGIN:VCALENDAR\r\n/);
  assert.equal((ics.match(/BEGIN:VEVENT/g) ?? []).length, feed.length);
});

test('the MBCG page offers the subscribe links', () => {
  const html = readFileSync('dist/programs/mbcg/index.html', 'utf8');
  assert.match(html, /href="https:\/\/calendar\.google\.com\/calendar\/render\?cid=/, 'no Google Calendar subscribe link');
  assert.match(html, /href="webcal:\/\/lahsperformingartsboosters\.org\/calendar\/mbcg\.ics"/, 'no Apple/webcal subscribe link');
});
