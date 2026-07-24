import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';

export default defineConfig({
  site: 'https://lahsperformingartsboosters.org',
  // static output (default). Pages handles redirects via public/_redirects.
  // MDX powers the content-block palette in src/components/content/ — see CLAUDE.md.
  integrations: [mdx()],
});
