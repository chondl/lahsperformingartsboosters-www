# The PAB season-calendar feed (`/calendar/pab.ics`)

The home page carries a **"## Season calendar" table** — every concert, show, and
Boosters meeting for the year, *except* Marching Band & Color Guard's season (which has
[its own feed](mbcg-calendar-feed.md)). At build time the table is parsed into a
subscribable iCalendar feed, exactly like the MBCG one: **editing the table updates the
web page and every subscriber's calendar in the same deploy.** There is no second copy of
the schedule to maintain.

- Feed URL: `https://lahsperformingartsboosters.org/calendar/pab.ics`
- Subscribe links live under the table on the home page (Google Calendar + Apple
  Calendar/webcal); other apps take the plain `https://` URL.
- Calendar name shown to subscribers: **LAHS Performing Arts**.

| Piece | File |
|---|---|
| The table (single source of truth) | [src/content/pages/home.mdx](../src/content/pages/home.mdx) |
| Parser + ICS renderer (shared with MBCG) | [src/lib/season-calendar.mjs](../src/lib/season-calendar.mjs) |
| Static endpoint (build-time) | [src/pages/calendar/pab.ics.js](../src/pages/calendar/pab.ics.js) |
| Tests (parsing contract + post-build) | [test/pab-calendar.test.mjs](../test/pab-calendar.test.mjs) |

## How this feed differs from MBCG's

The parsing contract — strict date cells that **fail the build** on a bad date or a
weekday label that contradicts the date, forgiving time cells that degrade to all-day
events — is the MBCG contract; read
[mbcg-calendar-feed.md](mbcg-calendar-feed.md) for the full rules. On top of that:

- **The table has a fourth column, `Where`** (`LAHS`, `MVHS`, or `Zoom`), which becomes
  each event's `LOCATION`.
- **Event titles are written out in full in the table and used verbatim** — no automatic
  prefix. Every title starts with `LAHS` + who is performing
  (`LAHS Choir Concert – A Season of Song`, `LAHS Broken Box – Cinderella: A Dream Come
  True`, `LAHS Performing Arts Boosters Meeting`) so entries read clearly when truncated
  on a family calendar. A test enforces the `LAHS` prefix.
- **Time cells carry start times only** (the page intentionally shows no end times);
  timed events default to a one-hour block in the feed. A start time on a **date range**
  (`Fri–Sat, Nov 6 – 7` + `7:00 PM`) repeats as one event per night.
- **No generated rehearsals.** The feed is exactly the table rows.
- **Years come from `seasonYear:`** in `home.mdx` frontmatter (Jul–Dec = that year,
  Jan–Jun = the next). Bump it each season.

## Where the dates come from

The 2026–27 table was compiled (Aug 2026) from, in order of authority:

1. **The program teachers' own lists** on our pages — Broken Box season on
   `programs/drama.md`, choir concerts on `programs/choir.md`.
2. **The PAB board** — Boosters meeting dates on the home page.
3. **The LAHS school calendar** — a single public Google Calendar behind
   `lahs.mvla.net`; queryable as JSON at
   `https://lahs.mvla.net/api/calendars/147995/events?start_date=…&end_date=…`. It
   confirms dates but is sparse (spring events get added mid-year) and rarely carries
   locations.
4. **The MVHS calendar** (same API, calID `143691` on `mvhs.mvla.net`) — much more
   complete, and the place where joint MVLA concerts show up with locations.

## Each season's refresh

1. Rewrite the table in `home.mdx` for the new season (and the meeting dates in the
   "Boosters meetings" prose above it — they must agree).
2. Bump `seasonYear:` in the frontmatter.
3. Push. Subscribers keep their subscription; events are identified by date + title, so
   edits update rather than duplicate.
