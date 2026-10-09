import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';
import { TEMAS } from '@data/temas';
import { RECURSOS } from '@data/library';
import { construirIndice } from '@lib/search-index';

export const GET: APIRoute = async () => {
  const [guias, ia, aprende, noticias, prompts] = await Promise.all([
    getCollection('guias', (e) => !e.data.borrador),
    getCollection('ia', (e) => !e.data.borrador),
    getCollection('aprende', (e) => !e.data.borrador),
    getCollection('noticias', (e) => !e.data.borrador),
    getCollection('prompts'),
  ]);
  const indice = construirIndice({
    temas: TEMAS,
    recursos: RECURSOS,
    guias: guias.map((g) => ({ slug: g.id, titulo: g.data.titulo, descripcion: g.data.descripcion, etiquetas: g.data.etiquetas })),
    ia: ia.map((h) => ({ slug: h.id, nombre: h.data.nombre, descripcion: h.data.descripcion, empresa: h.data.empresa })),
    aprende: aprende.map((a) => ({ slug: a.id, titulo: a.data.titulo, descripcion: a.data.descripcion })),
    noticias: noticias.map((n) => ({ slug: n.id, titulo: n.data.titulo, descripcion: n.data.descripcion })),
    prompts: prompts.map((p) => ({ id: p.data.id, titulo: p.data.titulo, categoria: p.data.categoria })),
  });
  return new Response(JSON.stringify(indice), { headers: { 'Content-Type': 'application/json; charset=utf-8' } });
};
