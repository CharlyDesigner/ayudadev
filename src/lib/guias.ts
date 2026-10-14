import { getCollection } from 'astro:content';

type EntradaGuia = Awaited<ReturnType<typeof getCollection<'guias'>>>[number];

let cache: Promise<EntradaGuia[]> | null = null;

/** Todas las guías publicadas (memoizado durante el build). */
export const todasLasGuias = (): Promise<EntradaGuia[]> => {
  cache ??= getCollection('guias', (g) => !g.data.borrador);
  return cache;
};

/** Slug de la guía de un tema, si existe. */
export const guiaDeTema = async (temaSlug: string): Promise<string | undefined> => {
  const guias = await todasLasGuias();
  return guias.find((g) => g.data.tema === temaSlug)?.id;
};
