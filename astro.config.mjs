// @ts-check
import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';
import tailwindcss from '@tailwindcss/vite';

const EXCLUIDAS = ['/404', '/newsletter/gracias/', '/newsletter/confirmado/', '/newsletter/baja/', '/biblioteca/favoritos/', '/buscar/'];

export default defineConfig({
  site: 'https://dev.carlosnavarro.site',
  trailingSlash: 'always',
  compressHTML: true,
  devToolbar: { enabled: false },
  integrations: [
    mdx(),
    sitemap({
      filter: (page) => !EXCLUIDAS.some((ruta) => page.endsWith(ruta) || page.endsWith(ruta.replace(/\/$/, ''))),
    }),
  ],
  markdown: {
    shikiConfig: {
      themes: { light: 'github-light-default', dark: 'github-dark-default' },
      defaultColor: false,
    },
  },
  vite: {
    plugins: [tailwindcss()],
  },
});
