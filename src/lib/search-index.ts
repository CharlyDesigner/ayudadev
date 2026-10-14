import type { Recurso, Tema } from './schemas';
import { NAV, FOOTER_LINKS } from '@data/site';

export type TipoBusqueda =
  | 'pagina'
  | 'tema'
  | 'recurso'
  | 'guia'
  | 'ruta'
  | 'ia'
  | 'noticia'
  | 'prompt'
  | 'fundamento'
  | 'hoja'
  | 'reto'
  | 'proyecto'
  | 'carrera'
  | 'herramienta'
  | 'comunidad'
  | 'termino';

export interface SearchItem {
  tipo: TipoBusqueda;
  titulo: string;
  url: string;
  sub?: string;
  tags?: string;
  /** nombre del logo en /logos (opcional) */
  logo?: string;
}

interface Basico {
  slug: string;
  titulo: string;
  descripcion: string;
}

export interface FuentesIndice {
  temas: Tema[];
  recursos: Recurso[];
  guias: (Basico & { etiquetas: string[] })[];
  ia: { slug: string; nombre: string; descripcion: string; empresa: string; logo?: string }[];
  aprende: Basico[];
  noticias: Basico[];
  prompts: { id: string; titulo: string; categoria: string }[];
  fundamentos?: Basico[];
  hojas?: Basico[];
  retos?: Basico[];
  proyectos?: Basico[];
  carrera?: Basico[];
  rutas?: Basico[];
  herramientas?: { id: string; nombre: string; descripcion: string; url: string; categoria: string }[];
  comunidad?: { id: string; nombre: string; descripcion: string; url: string; tipo: string }[];
  glosario?: { id: string; termino: string; definicion: string }[];
}

const PAGINAS_EXTRA = [
  { label: 'Empieza aquí: encuentra tu ruta', href: '/empieza-aqui/' },
  { label: 'Explorar todo el sitio', href: '/explorar/' },
  { label: 'Rutas de estudio', href: '/rutas/' },
  { label: 'Glosario de programación', href: '/glosario/' },
  { label: 'Hojas de referencia', href: '/hojas/' },
  { label: 'Retos de práctica', href: '/retos/' },
  { label: 'Proyectos para practicar', href: '/proyectos/' },
  { label: 'Fundamentos explicados', href: '/fundamentos/' },
  { label: 'Carrera en programación', href: '/carrera/' },
  { label: 'Herramientas para programar', href: '/herramientas/' },
  { label: 'Comunidad y canales', href: '/comunidad/' },
  { label: 'Comparativa de herramientas de IA', href: '/ia/comparativa/' },
  { label: 'Biblioteca de prompts', href: '/ia/prompts/' },
  { label: 'Aprende con IA', href: '/ia/aprende/' },
  { label: 'Mi progreso', href: '/progreso/' },
  { label: 'Mis favoritos', href: '/biblioteca/favoritos/' },
];

export const construirIndice = (f: FuentesIndice): SearchItem[] => {
  const items: SearchItem[] = [];
  const vistos = new Set<string>();
  const nuevo = (it: SearchItem) => {
    if (vistos.has(it.url)) return;
    vistos.add(it.url);
    items.push(it);
  };
  const lista = (l: Basico[] | undefined, tipo: TipoBusqueda, prefijo: string, titulo = (t: string) => t) => {
    for (const x of l ?? []) nuevo({ tipo, titulo: titulo(x.titulo), url: `${prefijo}${x.slug}/`, sub: x.descripcion });
  };

  for (const p of [...NAV.flatMap((n) => ('hijos' in n && n.hijos ? [n, ...n.hijos] : [n])), ...FOOTER_LINKS, ...PAGINAS_EXTRA]) {
    if (p.href.endsWith('.xml')) continue;
    nuevo({ tipo: 'pagina', titulo: p.label, url: p.href });
  }
  for (const t of f.temas) nuevo({ tipo: 'tema', titulo: t.nombre, url: `/biblioteca/${t.slug}/`, sub: t.descripcion, tags: t.area, logo: t.logo });
  for (const g of f.guias) nuevo({ tipo: 'guia', titulo: `Guía: ${g.titulo}`, url: `/guias/${g.slug}/`, sub: g.descripcion, tags: g.etiquetas.join(' ') });
  lista(f.rutas, 'ruta', '/rutas/', (t) => `Ruta: ${t}`);
  for (const h of f.ia) nuevo({ tipo: 'ia', titulo: h.nombre, url: `/ia/${h.slug}/`, sub: h.descripcion, tags: h.empresa, logo: h.logo });
  lista(f.aprende, 'ia', '/ia/aprende/');
  lista(f.fundamentos, 'fundamento', '/fundamentos/');
  lista(f.hojas, 'hoja', '/hojas/');
  lista(f.retos, 'reto', '/retos/', (t) => `Reto: ${t}`);
  lista(f.proyectos, 'proyecto', '/proyectos/', (t) => `Proyecto: ${t}`);
  lista(f.carrera, 'carrera', '/carrera/');
  for (const r of f.recursos) nuevo({ tipo: 'recurso', titulo: r.titulo, url: `/biblioteca/${r.tema}/#${r.id}`, sub: r.autor, tags: `${r.etiquetas.join(' ')} ${r.tema} ${r.tipo}` });
  for (const h of f.herramientas ?? []) nuevo({ tipo: 'herramienta', titulo: h.nombre, url: `/herramientas/#cat-${h.categoria}`, sub: h.descripcion, tags: h.categoria });
  for (const c of f.comunidad ?? []) nuevo({ tipo: 'comunidad', titulo: c.nombre, url: `/comunidad/#tipo-${c.tipo}`, sub: c.descripcion, tags: c.tipo });
  for (const t of f.glosario ?? []) nuevo({ tipo: 'termino', titulo: t.termino, url: `/glosario/#${t.id}`, sub: t.definicion });
  lista(f.noticias, 'noticia', '/noticias/');
  for (const p of f.prompts) nuevo({ tipo: 'prompt', titulo: p.titulo, url: `/ia/prompts/#${p.id}`, sub: p.categoria });
  return items;
};
