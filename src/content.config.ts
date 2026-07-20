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
    // Both render a button at the bottom of the program page when set. Omitted for now —
    // add the line back per program once the real URLs exist.
    googleGroupUrl: z.string().url().optional(),
    volunteerSheetUrl: z.string().url().optional(),
  }),
});

const pages = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/pages' }),
  schema: z.object({
    title: z.string(),
    description: z.string().optional(),
    // Donate page only: the call-to-action panel above the fold.
    ctaHref: z.string().optional(),
    ctaLabel: z.string().optional(),
    reasons: z.array(z.string()).optional(),
  }),
});

export const collections = { programs, pages };
