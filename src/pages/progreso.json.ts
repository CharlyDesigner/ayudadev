import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';

/** Títulos de todo lo que puede marcarse como completado, para la página /progreso/. */
export const GET: APIRoute = async () => {
  const [guias, retos, proyectos, fundamentos, carrera, rutas] = await Promise.all([
    getCollection('guias', (e) => !e.data.borrador),
    getCollection('retos', (e) => !e.data.borrador),
    getCollection('proyectos', (e) => !e.data.borrador),
    getCollection('fundamentos', (e) => !e.data.borrador),
    getCollection('carrera', (e) => !e.data.borrador),
    getCollection('rutas', (e) => !e.data.borrador),
  ]);
  const mapa = (l: { id: string; data: { titulo: string } }[], prefijo: string, ruta: string) =>
    l.map((e) => ({ id: `${prefijo}:${e.id}`, titulo: e.data.titulo, href: `${ruta}${e.id}/` }));

  const datos = {
    guias: mapa(guias, 'guia', '/guias/'),
    retos: mapa(retos, 'reto', '/retos/'),
    proyectos: mapa(proyectos, 'proyecto', '/proyectos/'),
    fundamentos: mapa(fundamentos, 'fundamento', '/fundamentos/'),
    carrera: mapa(carrera, 'carrera', '/carrera/'),
    rutas: rutas.map((r) => ({ id: r.id, titulo: r.data.titulo, href: `/rutas/${r.id}/`, pasos: r.data.pasos.length })),
  };
  return new Response(JSON.stringify(datos), { headers: { 'Content-Type': 'application/json; charset=utf-8' } });
};
