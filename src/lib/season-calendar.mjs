// Parses the "## Season calendar" Markdown table in a program page into calendar events,
// and renders them as an iCalendar (.ics) feed. The table stays the single source of truth:
// editing it updates both the HTML page and /calendar/mbcg.ics in the same build.
//
// Contract (also documented for maintainers in docs/mbcg-calendar-feed.md):
// - Date cells MUST parse and their weekday label must match the actual date, or the build
//   fails loudly — a wrong date on a subscribed calendar is worse than a failed deploy.
// - Time cells are best-effort: anything that isn't a plain "H:MM AM[– H:MM PM]" (or spans
//   multiple days) becomes an all-day event with the original time text in the description.

const MONTHS = { Jan: 1, Feb: 2, Mar: 3, Apr: 4, May: 5, Jun: 6, Jul: 7, Aug: 8, Sep: 9, Oct: 10, Nov: 11, Dec: 12 };
const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const TZID = 'America/Los_Angeles';
const DOMAIN = 'lahsperformingartsboosters.org';

const normalize = (s) => s.replace(/[–—]/g, '-').replace(/\s+/g, ' ').trim();
const pad = (n) => String(n).padStart(2, '0');
const ymd = (y, m, d) => `${y}${pad(m)}${pad(d)}`;

// Fall-season rule: months Jul–Dec belong to seasonYear, Jan–Jun to the spring after it.
const yearFor = (month, seasonYear) => (month >= 7 ? seasonYear : seasonYear + 1);

function addDays(y, m, d, days) {
  const t = new Date(Date.UTC(y, m - 1, d + days));
  return { y: t.getUTCFullYear(), m: t.getUTCMonth() + 1, d: t.getUTCDate() };
}

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
  if (weekday) {
    const actual = WEEKDAYS[new Date(Date.UTC(start.y, start.m - 1, start.d)).getUTCDay()];
    if (actual !== weekday) {
      throw new Error(
        `Season calendar: ${mon1} ${day1}, ${start.y} is a ${actual}, not a ${weekday} (row: ${row})`,
      );
    }
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
  const to24 = (h, mer) => (Number(h) % 12) + (mer.toUpperCase() === 'PM' ? 12 : 0);
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
    const time = end ? null : parseTimeCell(timeCell);
    const timeText = /^[-—]?$/.test(normalize(timeCell)) ? '' : timeCell.trim();

    const description = [
      time ? time.note : timeText, // times we could not model live in the description
      url ? `Details: ${url}` : '',
    ].filter(Boolean).join('\n');

    if (time) {
      const date = ymd(start.y, start.m, start.d);
      const endTime = time.end ?? { h: time.start.h + 1, min: time.start.min }; // default 1 h
      events.push({
        summary, url, description, allDay: false,
        start: `${date}T${pad(time.start.h)}${time.start.min}00`,
        end: `${date}T${pad(Math.min(endTime.h, 23))}${endTime.min}00`,
      });
    } else {
      const last = end ?? start;
      const next = addDays(last.y, last.m, last.d, 1); // iCal all-day DTEND is exclusive
      events.push({
        summary, url, description, allDay: true,
        start: ymd(start.y, start.m, start.d),
        end: ymd(next.y, next.m, next.d),
      });
    }
  }
  if (events.length === 0) throw new Error('Season calendar: the table has no event rows');
  return events;
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
      `UID:${e.start.slice(0, 8)}-${slug}@${DOMAIN}`,
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
