// Static endpoint: builds /calendar/mbcg.ics from the season-calendar table in
// src/content/programs/mbcg.md at build time. Editing the table updates this feed and the
// HTML page in the same deploy. See docs/mbcg-calendar-feed.md.
import { getEntry } from 'astro:content';
import { parseSeasonCalendar, buildIcs } from '../../lib/season-calendar.mjs';

export async function GET() {
  const mbcg = await getEntry('programs', 'mbcg');
  const events = parseSeasonCalendar(mbcg.body, mbcg.data.seasonYear);
  return new Response(buildIcs(events), {
    headers: { 'Content-Type': 'text/calendar; charset=utf-8' },
  });
}
