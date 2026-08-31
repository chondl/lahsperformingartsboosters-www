// Static endpoint: builds /calendar/pab.ics from the season-calendar table on the home
// page (src/content/pages/home.mdx) at build time — every concert, show, and Boosters
// meeting except MBCG's own season (which has /calendar/mbcg.ics). Editing the page
// updates this feed and the HTML in the same deploy. See docs/pab-calendar-feed.md.
import { getEntry } from 'astro:content';
import { parseSeasonCalendar, buildIcs } from '../../lib/season-calendar.mjs';

export async function GET() {
  const home = await getEntry('pages', 'home');
  const events = parseSeasonCalendar(home.body, home.data.seasonYear);
  events.sort((a, b) => (a.start < b.start ? -1 : a.start > b.start ? 1 : 0));
  return new Response(buildIcs(events, 'LAHS Performing Arts'), {
    headers: { 'Content-Type': 'text/calendar; charset=utf-8' },
  });
}
