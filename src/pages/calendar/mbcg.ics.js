// Static endpoint: builds /calendar/mbcg.ics from the season-calendar table (plus the
// generated weekly rehearsals) in src/content/programs/mbcg.md at build time. Editing the
// page updates this feed and the HTML in the same deploy. See docs/mbcg-calendar-feed.md.
import { getEntry } from 'astro:content';
import { buildSeasonEvents, buildIcs } from '../../lib/season-calendar.mjs';

export async function GET() {
  const mbcg = await getEntry('programs', 'mbcg');
  const events = buildSeasonEvents(mbcg.body, mbcg.data);
  return new Response(buildIcs(events), {
    headers: { 'Content-Type': 'text/calendar; charset=utf-8' },
  });
}
