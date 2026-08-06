// Parses the "## Season calendar" Markdown table (and the weekly-rehearsal bullet list)
// in a program page into calendar events, and renders them as an iCalendar (.ics) feed.
// The page stays the single source of truth: editing it updates both the HTML page and
// /calendar/mbcg.ics in the same build.
//
// Contract (also documented for maintainers in docs/mbcg-calendar-feed.md):
// - Date cells MUST parse and their weekday label must match the actual date, or the build
//   fails loudly — a wrong date on a subscribed calendar is worse than a failed deploy.
// - Time cells are best-effort: anything that isn't a recognized shape becomes an all-day
//   event with the original time text in the description.
// - Weekly rehearsals are generated (never listed in the table) between rehearsalsFrom and
//   rehearsalsThrough, skipping any day already covered by a table event.

const MONTHS = { Jan: 1, Feb: 2, Mar: 3, Apr: 4, May: 5, Jun: 6, Jul: 7, Aug: 8, Sep: 9, Oct: 10, Nov: 11, Dec: 12 };
const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const TZID = 'America/Los_Angeles';
const DOMAIN = 'lahsperformingartsboosters.org';

const normalize = (s) => s.replace(/[–—]/g, '-').replace(/\s+/g, ' ').trim();
const pad = (n) => String(n).padStart(2, '0');
const ymd = ({ y, m, d }) => `${y}${pad(m)}${pad(d)}`;
const to24 = (h, mer) => (Number(h) % 12) + (mer.toUpperCase() === 'PM' ? 12 : 0);
const dowOf = ({ y, m, d }) => new Date(Date.UTC(y, m - 1, d)).getUTCDay();
const atTime = (day, t) => `${ymd(day)}T${pad(t.h)}${t.min}00`;

// Fall-season rule: months Jul–Dec belong to seasonYear, Jan–Jun to the spring after it.
const yearFor = (month, seasonYear) => (month >= 7 ? seasonYear : seasonYear + 1);

function addDays({ y, m, d }, days) {
  const t = new Date(Date.UTC(y, m - 1, d + days));
  return { y: t.getUTCFullYear(), m: t.getUTCMonth() + 1, d: t.getUTCDate() };
}

// Accepts a YAML/frontmatter date (already a Date at UTC midnight) or an ISO string.
const toDay = (v) => {
  const t = v instanceof Date ? v : new Date(`${v}T00:00:00Z`);
  if (Number.isNaN(t.getTime())) throw new Error(`Season calendar: bad date "${v}"`);
  return { y: t.getUTCFullYear(), m: t.getUTCMonth() + 1, d: t.getUTCDate() };
};

function parseDateCell(cell, seasonYear, row) {
  const m = normalize(cell).match(
    /^(?:([A-Z][a-z]{2})(?:-[A-Z][a-z]{2})?, )?([A-Z][a-z]{2}) (\d{1,2})(?: ?- ?(?:([A-Z][a-z]{2}) )?(\d{1,2}))?$/,
  );
  if (!m || !(m[2] in MONTHS) || (m[4] && !(m[4] in MONTHS))) {
    throw new Error(`Season calendar: cannot parse date "${cell}" (row: ${row})`);
  }
  const [, weekday, mon1, day1, mon2, day2] = m;
  const start = { m: MONTHS[mon1], d: Number(day1) };
  start.y = yearFor(start.m, seasonYear);
  if (weekday && WEEKDAYS[dowOf(start)] !== weekday) {
    throw new Error(
      `Season calendar: ${mon1} ${day1}, ${start.y} is a ${WEEKDAYS[dowOf(start)]}, not a ${weekday} (row: ${row})`,
    );
  }
  let end = null;
  if (day2) {
    end = { m: mon2 ? MONTHS[mon2] : start.m, d: Number(day2) };
    end.y = yearFor(end.m, seasonYear);
  }
  return { start, end };
}

// "4:00 PM", "9:00 AM - 4:00 PM", "4:00 - 7:00 PM" (start inherits the end's AM/PM),
// with any trailing text ("at LAHS") returned as a note. Null when it isn't that shape.
function parseTimeCell(cell) {
  const m = normalize(cell).match(/^(\d{1,2}):(\d{2}) ?(AM|PM)?(?: ?- ?(\d{1,2}):(\d{2}) ?(AM|PM))?\b(.*)$/i);
  if (!m || (!m[3] && !m[6])) return null;
  let end = null;
  if (m[4]) end = { h: to24(m[4], m[6]), min: m[5] };
  let start = { h: to24(m[1], m[3] ?? m[6]), min: m[2] };
  if (end && start.h >= end.h) start = { h: to24(m[1], m[3] ?? (m[6].toUpperCase() === 'PM' ? 'AM' : 'PM')), min: m[2] };
  if (end && start.h >= end.h) return null; // still inverted — treat as unparseable
  return { start, end, note: m[7].trim() };
}

// Markdown → plain text: first link URL kept aside, link syntax and emphasis stripped.
function parseActivityCell(cell) {
  const url = cell.match(/\]\((https?:\/\/[^)]+)\)/)?.[1] ?? null;
  const text = cell.replace(/\[([^\]]*)\]\([^)]*\)/g, '$1').replace(/\*+/g, '').trim();
  return { text, url };
}

const describe = (note, url) => [note, url ? `Details: ${url}` : ''].filter(Boolean).join('\n');

export function parseSeasonCalendar(markdown, seasonYear) {
  if (!Number.isInteger(seasonYear)) {
    throw new Error('Season calendar: seasonYear frontmatter is missing — add e.g. "seasonYear: 2026"');
  }
  const section = markdown.split(/^## /m).find((s) => s.startsWith('Season calendar'));
  if (!section) throw new Error('Season calendar: no "## Season calendar" section found');

  const events = [];
  for (const line of section.split('\n')) {
    if (!line.trim().startsWith('|')) continue;
    const cells = line.split('|').slice(1, -1).map((c) => c.trim());
    if (cells.length !== 3) continue;
    const [dateCell, timeCell, activityCell] = cells;
    if (dateCell === 'Date' || /^[-: ]+$/.test(dateCell) || /^\*\*.+\*\*$/.test(dateCell)) continue;

    const { start, end } = parseDateCell(dateCell, seasonYear, line.trim());
    const { text: summary, url } = parseActivityCell(activityCell);
    const timeText = /^[-—]?$/.test(normalize(timeCell)) ? '' : timeCell.trim();
    const base = { summary, url };

    if (!end) {
      const time = parseTimeCell(timeCell);
      if (time) {
        const endTime = time.end ?? { h: Math.min(time.start.h + 1, 23), min: time.start.min }; // default 1 h
        events.push({ ...base, description: describe(time.note, url), allDay: false,
          start: atTime(start, time.start), end: atTime(start, endTime) });
      } else {
        events.push({ ...base, description: describe(timeText, url), allDay: true,
          start: ymd(start), end: ymd(addDays(start, 1)) });
      }
      continue;
    }

    // Multi-day rows, most specific shape first:
    // "Fri 4:00 PM – Sun 4:00 PM" → one continuous event across the range.
    const span = normalize(timeCell).match(
      /^[A-Z][a-z]{2} (\d{1,2}):(\d{2}) ?(AM|PM) ?- ?[A-Z][a-z]{2} (\d{1,2}):(\d{2}) ?(AM|PM)$/i,
    );
    // "9:00 AM – 4:00 PM" → those hours repeated as one event per day.
    const daily = span ? null : parseTimeCell(timeCell);
    if (span) {
      events.push({ ...base, description: describe('', url), allDay: false,
        start: atTime(start, { h: to24(span[1], span[3]), min: span[2] }),
        end: atTime(end, { h: to24(span[4], span[6]), min: span[5] }) });
    } else if (daily?.end && !daily.note) {
      for (let day = start; ymd(day) <= ymd(end); day = addDays(day, 1)) {
        events.push({ ...base, description: describe('', url), allDay: false,
          start: atTime(day, daily.start), end: atTime(day, daily.end) });
      }
    } else {
      events.push({ ...base, description: describe(timeText, url), allDay: true,
        start: ymd(start), end: ymd(addDays(end, 1)) }); // iCal all-day DTEND is exclusive
    }
  }
  if (events.length === 0) throw new Error('Season calendar: the table has no event rows');
  return events;
}

// The "regular weekly rehearsal schedule" bullet list:
//   - **Monday** — Brass & Woodwinds, 4:00 – 7:00 PM
export function parseWeeklyRehearsals(markdown) {
  const rehearsals = [];
  for (const m of markdown.matchAll(/^- \*\*(\w+day)\*\* [-–—] (.+), (\d{1,2}:\d{2}.*)$/gm)) {
    const dow = DAY_NAMES.indexOf(m[1]);
    const time = parseTimeCell(m[3]);
    if (dow < 0 || !time?.end) {
      throw new Error(`Rehearsal schedule: cannot parse "- **${m[1]}** — ${m[2]}, ${m[3]}"`);
    }
    rehearsals.push({ dow, label: m[2], time });
  }
  return rehearsals;
}

const isoOf = (basic) => `${basic.slice(0, 4)}-${basic.slice(4, 6)}-${basic.slice(6, 8)}`;

// Every calendar day a table event touches — rehearsals on those days are overridden.
function coveredDates(events) {
  const covered = new Set();
  for (const e of events) {
    const last = e.allDay ? ymd(addDays(toDay(isoOf(e.end)), -1)) : e.end.slice(0, 8);
    for (let day = toDay(isoOf(e.start)); ymd(day) <= last; day = addDays(day, 1)) covered.add(ymd(day));
  }
  return covered;
}

// The full feed: table events plus generated weekly rehearsals (between rehearsalsFrom and
// rehearsalsThrough inclusive, skipping covered days), sorted, every title MBCG-prefixed.
export function buildSeasonEvents(markdown, { seasonYear, rehearsalsFrom, rehearsalsThrough }) {
  const events = parseSeasonCalendar(markdown, seasonYear);
  if (rehearsalsFrom && rehearsalsThrough) {
    const rehearsals = parseWeeklyRehearsals(markdown);
    const covered = coveredDates(events);
    for (let day = toDay(rehearsalsFrom); ymd(day) <= ymd(toDay(rehearsalsThrough)); day = addDays(day, 1)) {
      if (covered.has(ymd(day))) continue;
      for (const r of rehearsals.filter((r) => r.dow === dowOf(day))) {
        events.push({ summary: `Rehearsal — ${r.label}`, url: null, description: '', allDay: false,
          start: atTime(day, r.time.start), end: atTime(day, r.time.end) });
      }
    }
  }
  events.sort((a, b) => (a.start < b.start ? -1 : a.start > b.start ? 1 : 0));
  return events.map((e) => ({ ...e, summary: `MBCG: ${e.summary}` }));
}

// ---- iCalendar rendering ----

const escapeText = (s) =>
  s.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\n/g, '\\n');

// RFC 5545 line folding: max 75 octets per line, continuations start with a space.
function fold(line) {
  const out = [];
  let current = '';
  for (const ch of line) {
    if (Buffer.byteLength(current + ch, 'utf8') > (out.length ? 74 : 75)) {
      out.push(current);
      current = ' ';
    }
    current += ch;
  }
  out.push(current);
  return out;
}

const VTIMEZONE = [
  'BEGIN:VTIMEZONE', `TZID:${TZID}`,
  'BEGIN:DAYLIGHT', 'TZOFFSETFROM:-0800', 'TZOFFSETTO:-0700', 'TZNAME:PDT',
  'DTSTART:19700308T020000', 'RRULE:FREQ=YEARLY;BYMONTH=3;BYDAY=2SU', 'END:DAYLIGHT',
  'BEGIN:STANDARD', 'TZOFFSETFROM:-0700', 'TZOFFSETTO:-0800', 'TZNAME:PST',
  'DTSTART:19701101T020000', 'RRULE:FREQ=YEARLY;BYMONTH=11;BYDAY=1SU', 'END:STANDARD',
  'END:VTIMEZONE',
];

export function buildIcs(events, calName = 'LAHS Marching Band & Color Guard') {
  const dtstamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d+Z$/, 'Z');
  const lines = [
    'BEGIN:VCALENDAR', 'VERSION:2.0',
    'PRODID:-//LAHS Performing Arts Boosters//Season Calendar//EN',
    'CALSCALE:GREGORIAN', 'METHOD:PUBLISH',
    `X-WR-CALNAME:${escapeText(calName)}`, `X-WR-TIMEZONE:${TZID}`,
    'REFRESH-INTERVAL;VALUE=DURATION:P1D',
    ...VTIMEZONE,
  ];
  for (const e of events) {
    const slug = e.summary.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40);
    lines.push(
      'BEGIN:VEVENT',
      `UID:${e.start.replace('T', '-')}-${slug}@${DOMAIN}`,
      `DTSTAMP:${dtstamp}`,
      `SUMMARY:${escapeText(e.summary)}`,
      e.allDay ? `DTSTART;VALUE=DATE:${e.start}` : `DTSTART;TZID=${TZID}:${e.start}`,
      e.allDay ? `DTEND;VALUE=DATE:${e.end}` : `DTEND;TZID=${TZID}:${e.end}`,
      ...(e.description ? [`DESCRIPTION:${escapeText(e.description)}`] : []),
      ...(e.url ? [`URL:${e.url}`] : []),
      'END:VEVENT',
    );
  }
  lines.push('END:VCALENDAR');
  return lines.flatMap(fold).join('\r\n') + '\r\n';
}
