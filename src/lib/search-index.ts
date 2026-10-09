import type { Recurso, Tema } from './schemas';
import { NAV, FOOTER_LINKS } from '@data/site';

export interface SearchItem {
  tipo: 'pagina' | 'tema' | 'recurso' | 'guia' | 'ia' | 'noticia' | 'prompt';
  titulo: string;
  url: string;
  sub?: string;
  tags?: string;
}

export interface FuentesIndice {
  temas: Tema[];
  recursos: Recurso[];
  guias: { slug: string; titulo: string; descripcion: string; etiquetas: string[] }[];
  ia: { slug: string; nombre: string; descripcion: string; empresa: string }[];
  aprende: { slug: string; titulo: string; descripcion: string }[];
  noticias: { slug: string; titulo: string; descripcion: string }[];
  prompts: { id: string; titulo: string; categoria: string }[];
}

const PAGINAS_EXTRA = [
  { label: 'Comparativa de herramientas de IA', href: '/ia/comparativa/' },
  { label: 'Biblioteca de prompts', href: '/ia/prompts/' },
  { label: 'Aprende con IA', href: '/ia/aprende/' },
  { label: 'Mis favoritos', href: '/biblioteca/favoritos/' },
];

export const construirIndice = (f: FuentesIndice): SearchItem[] => {
  const items: SearchItem[] = [];
  for (const p of [...NAV, ...FOOTER_LINKS, ...PAGINAS_EXTRA]) {
    if (p.href.endsWith('.xml')) continue;
    items.push({ tipo: 'pagina', titulo: p.label, url: p.href });
  }
  for (const t of f.temas) items.push({ tipo: 'tema', titulo: t.nombre, url: `/biblioteca/${t.slug}/`, sub: t.descripcion, tags: t.area });
  for (const g of f.guias) items.push({ tipo: 'guia', titulo: `Guía: ${g.titulo}`, url: `/guias/${g.slug}/`, sub: g.descripcion, tags: g.etiquetas.join(' ') });
  for (const h of f.ia) items.push({ tipo: 'ia', titulo: h.nombre, url: `/ia/${h.slug}/`, sub: h.descripcion, tags: h.empresa });
  for (const a of f.aprende) items.push({ tipo: 'ia', titulo: a.titulo, url: `/ia/aprende/${a.slug}/`, sub: a.descripcion });
  for (const r of f.recursos) items.push({ tipo: 'recurso', titulo: r.titulo, url: `/biblioteca/${r.tema}/#${r.id}`, sub: r.autor, tags: `${r.etiquetas.join(' ')} ${r.tema} ${r.tipo}` });
  for (const n of f.noticias) items.push({ tipo: 'noticia', titulo: n.titulo, url: `/noticias/${n.slug}/`, sub: n.descripcion });
  for (const p of f.prompts) items.push({ tipo: 'prompt', titulo: p.titulo, url: `/ia/prompts/#${p.id}`, sub: p.categoria });
  return items;
};
