import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';
import { SITE } from '@data/site';
import { TEMAS } from '@data/temas';
import { RECURSOS } from '@data/library';
import { todosLosDocs } from '@lib/mcp-docs';
import { FORMATOS, HOSTS_BLOQUEADOS, LICENCIAS, NIVELES, TIPOS } from '@lib/schemas';

/** Índice compacto para el servidor MCP (public/api/mcp.php) y para cualquiera que quiera reutilizar los datos. */
export const GET: APIRoute = async () => {
  const [docs, glosario, guias] = await Promise.all([todosLosDocs(), getCollection('glosario'), getCollection('guias', (g) => !g.data.borrador)]);
  const guiaPorTema = new Map(guias.map((g) => [g.data.tema, g.id]));

  const datos = {
    esquema: 1,
    enums: { tipos: TIPOS, niveles: NIVELES, formatos: FORMATOS, licencias: LICENCIAS, hostsProhibidos: HOSTS_BLOQUEADOS },
    sitio: { nombre: SITE.nombre, url: SITE.url, repo: SITE.repo, lema: SITE.lema },
    licencias: { codigo: 'MIT', textos: 'CC BY 4.0', catalogo: 'CC0', recursos: 'cada recurso conserva la licencia de su autor' },
    temas: TEMAS.map((t) => ({ slug: t.slug, nombre: t.nombre, area: t.area, descripcion: t.descripcion, guia: guiaPorTema.get(t.slug) ?? null, url: `${SITE.url}/biblioteca/${t.slug}/` })),
    recursos: RECURSOS.map((r) => ({
      id: r.id, titulo: r.titulo, autor: r.autor, url: r.url, tema: r.tema, tipo: r.tipo, nivel: r.nivel, formato: r.formato,
      idioma: r.idioma, licencia: r.licencia, descripcion: r.descripcion, etiquetas: r.etiquetas, verificado: r.verificado,
    })),
    docs: docs.map((d) => d.meta),
    glosario: glosario.map((g) => ({ id: g.data.id, termino: g.data.termino, definicion: g.data.definicion, categoria: g.data.categoria, ejemplo: g.data.ejemplo ?? null, relacionados: g.data.relacionados, tema: g.data.tema ?? null })),
  };
  return new Response(JSON.stringify(datos), { headers: { 'Content-Type': 'application/json; charset=utf-8' } });
};
