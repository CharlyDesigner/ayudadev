import rss from '@astrojs/rss';
import type { APIContext } from 'astro';
import { getCollection } from 'astro:content';
import { SITE } from '@data/site';

export async function GET(context: APIContext) {
  const noticias = (await getCollection('noticias', (n) => !n.data.borrador)).sort((a, b) => b.data.publicado.getTime() - a.data.publicado.getTime());
  return rss({
    title: `${SITE.nombre}: noticias`,
    description: 'Novedades de AyudaDev y del mundo del desarrollo y la IA, contadas para quien está aprendiendo.',
    site: context.site ?? SITE.url,
    items: noticias.map((n) => ({ title: n.data.titulo, description: n.data.descripcion, pubDate: n.data.publicado, link: `/noticias/${n.id}/`, categories: n.data.etiquetas })),
    customData: '<language>es-mx</language>',
  });
}
