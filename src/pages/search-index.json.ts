import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';
import { TEMAS } from '@data/temas';
import { RECURSOS } from '@data/library';
import { HERRAMIENTAS } from '@data/herramientas';
import { COMUNIDAD } from '@data/comunidad';
import { construirIndice } from '@lib/search-index';

const visibles = <T extends { data: { borrador?: boolean } }>(e: T) => !e.data.borrador;

export const GET: APIRoute = async () => {
  const [guias, ia, aprende, noticias, prompts, fundamentos, hojas, retos, proyectos, carrera, rutas, glosario] = await Promise.all([
    getCollection('guias', visibles),
    getCollection('ia', visibles),
    getCollection('aprende', visibles),
    getCollection('noticias', visibles),
    getCollection('prompts'),
    getCollection('fundamentos', visibles),
    getCollection('hojas', visibles),
    getCollection('retos', visibles),
    getCollection('proyectos', visibles),
    getCollection('carrera', visibles),
    getCollection('rutas', visibles),
    getCollection('glosario'),
  ]);
  const basico = (l: { id: string; data: { titulo: string; descripcion: string } }[]) => l.map((e) => ({ slug: e.id, titulo: e.data.titulo, descripcion: e.data.descripcion }));

  const indice = construirIndice({
    temas: TEMAS,
    recursos: RECURSOS,
    guias: guias.map((g) => ({ slug: g.id, titulo: g.data.titulo, descripcion: g.data.descripcion, etiquetas: g.data.etiquetas })),
    ia: ia.map((h) => ({ slug: h.id, nombre: h.data.nombre, descripcion: h.data.descripcion, empresa: h.data.empresa, logo: h.data.logo ? `ia/${h.data.logo}` : undefined })),
    aprende: basico(aprende),
    noticias: basico(noticias),
    prompts: prompts.map((p) => ({ id: p.data.id, titulo: p.data.titulo, categoria: p.data.categoria })),
    fundamentos: basico(fundamentos),
    hojas: basico(hojas),
    retos: basico(retos),
    proyectos: basico(proyectos),
    carrera: basico(carrera),
    rutas: basico(rutas),
    herramientas: HERRAMIENTAS.map((h) => ({ id: h.id, nombre: h.nombre, descripcion: h.descripcion, url: h.url, categoria: h.categoria })),
    comunidad: COMUNIDAD.map((c) => ({ id: c.id, nombre: c.nombre, descripcion: c.descripcion, url: c.url, tipo: c.tipo })),
    glosario: glosario.map((t) => ({ id: t.data.id, termino: t.data.termino, definicion: t.data.definicion })),
  });
  return new Response(JSON.stringify(indice), { headers: { 'Content-Type': 'application/json; charset=utf-8' } });
};
