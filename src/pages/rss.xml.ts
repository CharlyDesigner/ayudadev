import rss from '@astrojs/rss';
import type { APIContext } from 'astro';
import { getCollection } from 'astro:content';
import { SITE } from '@data/site';

export async function GET(context: APIContext) {
  const [noticias, guias, aprende] = await Promise.all([
    getCollection('noticias', (n) => !n.data.borrador),
    getCollection('guias', (g) => !g.data.borrador),
    getCollection('aprende', (a) => !a.data.borrador),
  ]);
  const items = [
    ...noticias.map((n) => ({ title: n.data.titulo, description: n.data.descripcion, pubDate: n.data.publicado, link: `/noticias/${n.id}/`, categories: ['noticias', ...n.data.etiquetas] })),
    ...guias.map((g) => ({ title: `Guía: ${g.data.titulo}`, description: g.data.descripcion, pubDate: g.data.publicado, link: `/guias/${g.id}/`, categories: ['guias', g.data.tema] })),
    ...aprende.map((a) => ({ title: a.data.titulo, description: a.data.descripcion, pubDate: a.data.publicado, link: `/ia/aprende/${a.id}/`, categories: ['ia'] })),
  ]
    .sort((a, b) => b.pubDate.getTime() - a.pubDate.getTime())
    .slice(0, 30);

  return rss({
    title: `${SITE.nombre}: novedades`,
    description: SITE.descripcion,
    site: context.site ?? SITE.url,
    items,
    customData: '<language>es-mx</language>',
    stylesheet: false,
  });
}
