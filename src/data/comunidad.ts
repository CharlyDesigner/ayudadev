import { z } from 'astro/zod';

export const TIPOS_COMUNIDAD = ['youtube', 'podcast', 'newsletter', 'comunidad', 'curso', 'evento', 'blog'] as const;
export const ETIQUETAS_TIPO_COMUNIDAD: Record<(typeof TIPOS_COMUNIDAD)[number], string> = {
  youtube: 'Canales de YouTube',
  podcast: 'Podcasts',
  newsletter: 'Newsletters',
  comunidad: 'Comunidades',
  curso: 'Plataformas de cursos gratuitos',
  evento: 'Eventos y charlas',
  blog: 'Blogs',
};

export const comunidadSchema = z.object({
  id: z.string().regex(/^[a-z0-9-]+$/),
  nombre: z.string().min(2),
  tipo: z.enum(TIPOS_COMUNIDAD),
  descripcion: z.string().min(20).max(220),
  url: z.string().url().startsWith('https://'),
  /** temas que cubre, slugs de src/data/temas.ts (opcional). */
  temas: z.array(z.string()).default([]),
  idioma: z.enum(['es', 'en']).default('es'),
  destacado: z.boolean().default(false),
  verificado: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});
export type Comunidad = z.infer<typeof comunidadSchema>;
export type ComunidadInput = z.input<typeof comunidadSchema>;

/** Viven en src/data/comunidad/*.ts (un archivo por tipo), cada uno con export default. */
const modulos = import.meta.glob<{ default: unknown[] }>('./comunidad/*.ts', { eager: true });
export const COMUNIDAD: Comunidad[] = Object.values(modulos)
  .flatMap((m) => m.default)
  .map((c) => comunidadSchema.parse(c));
