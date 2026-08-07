import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const programs = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/programs' }),
  schema: z.object({
    title: z.string(),
    order: z.number(),
    summary: z.string(),
    icon: z.string().optional(),
    // Home-page card photo, e.g. /images/programs/choir.jpg. Falls back to `icon` when
    // absent, so a program without a photo still builds. See docs/program-card-images.md.
    cardImage: z.string().optional(),
    // false hides the Donate button (a program running its own separate campaign).
    showDonate: z.boolean().default(true),
    // The year the fall season starts. Required by pages that carry a "## Season calendar"
    // table: it anchors the table's year-less dates for the .ics feed (Jul–Dec = this year,
    // Jan–Jun = the next). Bump it with each season refresh. See docs/mbcg-calendar-feed.md.
    seasonYear: z.number().int().optional(),
    // Span of the generated weekly-rehearsal events in the .ics feed (inclusive). The
    // rehearsal times come from the page's bullet list; days a table event covers are
    // skipped. Omit both to turn rehearsal generation off. Update each season.
    rehearsalsFrom: z.coerce.date().optional(),
    rehearsalsThrough: z.coerce.date().optional(),
    // Both render a button at the bottom of the program page when set. Omitted for now —
    // add the line back per program once the real URLs exist.
    googleGroupUrl: z.string().url().optional(),
    volunteerSheetUrl: z.string().url().optional(),
    // Sign-up form for program news (schedule changes, performances, volunteer calls).
    // Renders a button at the bottom of the page when set; the label is per-program so
    // the button can name the program (e.g. "Sign up for MBCG updates").
    updatesFormUrl: z.string().url().optional(),
    updatesFormLabel: z.string().default('Sign up for updates'),
  }),
});

const pages = defineCollection({
  // {md,mdx}: page bodies may use the content-block palette (src/components/content/).
  loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/pages' }),
  schema: z.object({
    title: z.string(),
    description: z.string().optional(),
  }),
});

export const collections = { programs, pages };
