import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const programs = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/programs' }),
  schema: z.object({
    title: z.string(),
    order: z.number(),
    donateSlug: z.string(),
    summary: z.string(),
    icon: z.string().optional(),
    googleGroupUrl: z.string().url().optional(),
    volunteerSheetUrl: z.string().url().optional(),
  }),
});

const pages = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/pages' }),
  schema: z.object({ title: z.string(), description: z.string().optional() }),
});

export const collections = { programs, pages };
