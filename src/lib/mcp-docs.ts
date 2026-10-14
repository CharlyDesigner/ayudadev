import { getCollection } from 'astro:content';
import { documentoMarkdown, limpiarMdx, rutaMarkdown, urlDoc, type DocMeta, type TipoDoc } from './mcp-data';

export interface Doc {
  meta: DocMeta;
  markdown: string;
}

const visibles = <T extends { data: { borrador?: boolean } }>(e: T) => !e.data.borrador;

/** Todos los documentos de texto del sitio, listos para IA. Se memoiza durante el build. */
let cache: Promise<Doc[]> | null = null;
export const todosLosDocs = (): Promise<Doc[]> => {
  cache ??= construir();
  return cache;
};

const construir = async (): Promise<Doc[]> => {
  const [guias, fundamentos, hojas, retos, proyectos, carrera, rutas, ia, aprende, noticias] = await Promise.all([
    getCollection('guias', visibles),
    getCollection('fundamentos', visibles),
    getCollection('hojas', visibles),
    getCollection('retos', visibles),
    getCollection('proyectos', visibles),
    getCollection('carrera', visibles),
    getCollection('rutas', visibles),
    getCollection('ia', visibles),
    getCollection('aprende', visibles),
    getCollection('noticias', visibles),
  ]);

  const docs: Doc[] = [];
  const agregar = (
    tipo: TipoDoc,
    id: string,
    titulo: string,
    descripcion: string,
    cuerpo: string,
    extra: { etiquetas?: string[]; tema?: string; nivel?: string } = {}
  ) => {
    const meta: DocMeta = { tipo, id, titulo, descripcion, url: urlDoc(tipo, id), etiquetas: extra.etiquetas ?? [], tema: extra.tema, nivel: extra.nivel };
    docs.push({ meta, markdown: documentoMarkdown(meta, cuerpo) });
  };

  for (const g of guias) agregar('guia', g.id, g.data.titulo, g.data.descripcion, limpiarMdx(g.body ?? ''), { etiquetas: g.data.etiquetas, tema: g.data.tema, nivel: g.data.nivel });
  for (const f of fundamentos) agregar('fundamento', f.id, f.data.titulo, f.data.descripcion, limpiarMdx(f.body ?? ''), { etiquetas: f.data.etiquetas, tema: f.data.temas[0], nivel: f.data.nivel });
  for (const h of hojas) agregar('hoja', h.id, h.data.titulo, h.data.descripcion, limpiarMdx(h.body ?? ''), { etiquetas: h.data.etiquetas, tema: h.data.tema });
  for (const r of retos) agregar('reto', r.id, r.data.titulo, r.data.descripcion, limpiarMdx(r.body ?? ''), { etiquetas: r.data.conceptos, tema: r.data.tema, nivel: r.data.nivel });
  for (const p of proyectos) agregar('proyecto', p.id, p.data.titulo, p.data.descripcion, limpiarMdx(p.body ?? ''), { etiquetas: [...p.data.habilidades, ...p.data.tecnologias], tema: p.data.temas[0], nivel: p.data.nivel });
  for (const c of carrera) agregar('carrera', c.id, c.data.titulo, c.data.descripcion, limpiarMdx(c.body ?? ''), { etiquetas: c.data.etiquetas });
  for (const r of rutas) agregar('ruta', r.id, r.data.titulo, r.data.descripcion, rutaMarkdown(r.data.pasos, limpiarMdx(r.body ?? '')), { etiquetas: r.data.logos, nivel: r.data.nivel });
  for (const h of ia) agregar('ia', h.id, h.data.nombre, h.data.descripcion, limpiarMdx(h.body ?? ''), { etiquetas: [h.data.empresa, h.data.tipo] });
  for (const a of aprende) agregar('aprende', a.id, a.data.titulo, a.data.descripcion, limpiarMdx(a.body ?? ''), { etiquetas: a.data.herramientas, nivel: a.data.nivel });
  for (const n of noticias) agregar('noticia', n.id, n.data.titulo, n.data.descripcion, limpiarMdx(n.body ?? ''), { etiquetas: n.data.etiquetas });
  return docs;
};
