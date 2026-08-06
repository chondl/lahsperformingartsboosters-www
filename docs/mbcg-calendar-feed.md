# The MBCG calendar feed (`/calendar/mbcg.ics`)

The Marching Band & Color Guard page offers a **subscribable calendar** built from the
season-calendar table in [src/content/programs/mbcg.md](../src/content/programs/mbcg.md).
There is no second copy of the schedule to maintain: at build time the table is parsed
into an iCalendar feed, so **editing the table updates the web page and every subscriber's
calendar in the same deploy** (Google refreshes subscribed calendars on its own schedule,
typically within a day).

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

**Time cells are forgiving.** `6:00 PM`, `4:00 PM - 9:00 PM`, and `4:00 – 7:00 PM`
(start inherits PM from the end) become timed events; a lone start time gets a one-hour
block; trailing text like `at LAHS` moves to the event description. Any other time text —
`TBD`, `Parade 1:00 PM · Game 7:00 PM`, a multi-day range — produces an **all-day event
with the original time text in the description**. So a "weird" time never breaks the
build; it just degrades to all-day.

**Years come from frontmatter.** The table's dates carry no year, so `mbcg.md` declares
`seasonYear: 2026`. Months July–December belong to that year, January–June to the next.

## Each season's refresh

1. Update the table in `mbcg.md` as usual.
2. Bump `seasonYear:` in the same file's frontmatter.
3. Push. The build regenerates the feed; subscribers keep their subscription — events are
   identified by date + title, so edits update rather than duplicate.
