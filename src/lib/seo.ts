import { SITE } from '@data/site';

const abs = (path: string): string => new URL(path, SITE.url).toString();

export const organizacionLd = () => ({
  '@context': 'https://schema.org',
  '@type': 'Organization',
  name: SITE.nombre,
  url: SITE.url,
  logo: abs('/favicon.svg'),
  founder: { '@type': 'Person', name: SITE.autor.nombre, url: SITE.autor.url },
  parentOrganization: { '@type': 'Organization', name: SITE.organizacion.nombre, url: SITE.organizacion.url },
  sameAs: [SITE.repo, ...SITE.redes.map((r) => r.url)],
});

export const sitioLd = () => ({
  '@context': 'https://schema.org',
  '@type': 'WebSite',
  name: SITE.nombre,
  url: SITE.url,
  description: SITE.descripcion,
  inLanguage: 'es-MX',
  potentialAction: {
    '@type': 'SearchAction',
    target: { '@type': 'EntryPoint', urlTemplate: `${SITE.url}/buscar/?q={search_term_string}` },
    'query-input': 'required name=search_term_string',
  },
});

export interface Miga {
  nombre: string;
  href: string;
}

export const migasLd = (migas: Miga[]) => ({
  '@context': 'https://schema.org',
  '@type': 'BreadcrumbList',
  itemListElement: migas.map((m, i) => ({
    '@type': 'ListItem',
    position: i + 1,
    name: m.nombre,
    item: abs(m.href),
  })),
});

export const articuloLd = (opts: {
  tipo: 'TechArticle' | 'NewsArticle' | 'Article';
  titulo: string;
  descripcion: string;
  path: string;
  publicado: Date;
  actualizado?: Date;
  imagen?: string;
}) => ({
  '@context': 'https://schema.org',
  '@type': opts.tipo,
  headline: opts.titulo,
  description: opts.descripcion,
  url: abs(opts.path),
  mainEntityOfPage: abs(opts.path),
  inLanguage: 'es-MX',
  image: abs(opts.imagen ?? SITE.ogDefault),
  datePublished: opts.publicado.toISOString(),
  dateModified: (opts.actualizado ?? opts.publicado).toISOString(),
  author: { '@type': 'Person', name: SITE.autor.nombre, url: SITE.autor.url },
  publisher: { '@type': 'Organization', name: SITE.nombre, url: SITE.url, logo: { '@type': 'ImageObject', url: abs('/favicon.svg') } },
});

export const coleccionLd = (opts: { nombre: string; descripcion: string; path: string; items: { nombre: string; url: string }[] }) => ({
  '@context': 'https://schema.org',
  '@type': 'CollectionPage',
  name: opts.nombre,
  description: opts.descripcion,
  url: abs(opts.path),
  inLanguage: 'es-MX',
  mainEntity: {
    '@type': 'ItemList',
    numberOfItems: opts.items.length,
    itemListElement: opts.items.slice(0, 50).map((it, i) => ({ '@type': 'ListItem', position: i + 1, name: it.nombre, url: it.url })),
  },
});
