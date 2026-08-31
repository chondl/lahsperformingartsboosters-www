# The MBCG calendar feed (`/calendar/mbcg.ics`)

The Marching Band & Color Guard page offers a **subscribable calendar** built from the
season-calendar table in [src/content/programs/mbcg.md](../src/content/programs/mbcg.md),
plus the weekly rehearsals generated from the page's rehearsal bullet list (rehearsals are
deliberately **not** table rows — that would overwhelm the page). There is no second copy
of the schedule to maintain: at build time the page is parsed into an iCalendar feed, so
**editing it updates the web page and every subscriber's calendar in the same deploy**
(Google refreshes subscribed calendars on its own schedule, typically within a day).
Every event title is prefixed `MBCG:` so entries are recognizable on a family calendar.

- Feed URL: `https://lahsperformingartsboosters.org/calendar/mbcg.ics`
- Subscribe links live at the bottom of the page's *Season calendar* section: a Google
  Calendar link (`calendar.google.com/calendar/render?cid=…`) and an Apple Calendar link
  (`webcal://…`). Other apps take the plain `https://` URL.

## How it works

| Piece | File |
|---|---|
| Parser + ICS renderer | [src/lib/season-calendar.mjs](../src/lib/season-calendar.mjs) |
| Static endpoint (build-time) | [src/pages/calendar/mbcg.ics.js](../src/pages/calendar/mbcg.ics.js) |
| Tests (parsing contract + post-build) | [test/mbcg-calendar.test.mjs](../test/mbcg-calendar.test.mjs) |

## The table is now load-bearing — what edits must respect

Everything below `## Season calendar` in `mbcg.md` that is a 3-column table row becomes
one calendar event (month rows like `| **October** | | |` are skipped).

**Date cells are strict.** Accepted shapes (any dash style works):

- `Thu, Aug 27` — single day
- `Mon–Sat, Aug 3 – 8` — range within a month
- `Thu–Sat, Jul 30 – Aug 1` — range across months

Anything else — or a weekday label that contradicts the date — **fails the build on
purpose**: a wrong date pushed to subscribers' calendars is worse than a failed deploy.
If a deploy fails after a calendar edit, check the build log; the error names the bad row.

**Time cells are forgiving.** Recognized shapes:

- `6:00 PM` — timed event, one-hour block by default
- `4:00 PM - 9:00 PM`, or `4:00 – 7:00 PM` (start inherits PM from the end) — timed event
- `9:00 AM – 9:00 PM at LAHS` — trailing text moves to the event description
- On a **date range**: `9:00 AM – 4:00 PM` (or a bare start time, one-hour default)
  repeats as one timed event per day (camps, multi-night shows);
  `Fri 4:00 PM – Sun 4:00 PM` (weekday-prefixed) becomes one continuous event (overnight
  trips)

**A fourth `Where` column is optional.** Three-column tables (this one) produce events
with no location; a four-column table (the home page's — see
[pab-calendar-feed.md](pab-calendar-feed.md)) turns the fourth cell into the event's
`LOCATION`.

Any other time text — `TBD`, `—`, prose — produces an **all-day event with the original
time text in the description**. So a "weird" time never breaks the build; it just
degrades to all-day.

**Years come from frontmatter.** The table's dates carry no year, so `mbcg.md` declares
`seasonYear: 2026`. Months July–December belong to that year, January–June to the next.

## Weekly rehearsals are generated, not listed

The feed adds Mon/Wed/Fri/Sat rehearsal events built from the page's
"regular weekly rehearsal schedule" bullet list (`- **Monday** — Brass & Woodwinds,
4:00 – 7:00 PM` — that exact shape). They run from `rehearsalsFrom:` through
`rehearsalsThrough:` (frontmatter dates, inclusive) and are **skipped on any day a table
event covers** — a football Friday, a competition Saturday, a camp day, or a
"no rehearsal" span. Editing the bullet list changes the generated events; removing both
frontmatter dates turns rehearsal generation off entirely.

## Each season's refresh

1. Update the table (and, if changed, the rehearsal bullet list) in `mbcg.md` as usual.
2. Bump `seasonYear:`, `rehearsalsFrom:`, and `rehearsalsThrough:` in the frontmatter.
3. Push. The build regenerates the feed; subscribers keep their subscription — events are
   identified by date + title, so edits update rather than duplicate.
