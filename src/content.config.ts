import { defineCollection, z } from 'astro:content';
import { glob, file } from 'astro/loaders';
import { NIVELES } from './lib/schemas';

const guias = defineCollection({
  loader: glob({ pattern: '**/*.mdx', base: './src/content/guias' }),
  schema: z.object({
    titulo: z.string(),
    descripcion: z.string().max(170),
    tema: z.string(),
    nivel: z.enum(NIVELES).default('principiante'),
    tiempoLectura: z.number().int().optional(),
    publicado: z.coerce.date(),
    actualizado: z.coerce.date().optional(),
    /** ids de recursos del catálogo para "Libros gratis para seguir". */
    libros: z.array(z.string()).default([]),
    requisitos: z.array(z.string()).default([]),
    etiquetas: z.array(z.string()).default([]),
    orden: z.number().int().default(100),
    borrador: z.boolean().default(false),
  }),
});

const ia = defineCollection({
  loader: glob({ pattern: '**/*.mdx', base: './src/content/ia' }),
  schema: z.object({
    nombre: z.string(),
    empresa: z.string(),
    descripcion: z.string().max(170),
    tipo: z.enum(['chat', 'ide', 'cli', 'asistente-codigo', 'api', 'local']),
    sitio: z.string().url(),
    docs: z.string().url().optional(),
    planGratis: z.enum(['si', 'limitado', 'no', 'pendiente']).default('pendiente'),
    precioUrl: z.string().url().optional(),
    logo: z.string().optional(),
    publicado: z.coerce.date(),
    verificado: z.coerce.date(),
    orden: z.number().int().default(100),
    borrador: z.boolean().default(false),
  }),
});

const aprende = defineCollection({
  loader: glob({ pattern: '**/*.mdx', base: './src/content/aprende' }),
  schema: z.object({
    titulo: z.string(),
    descripcion: z.string().max(170),
    publicado: z.coerce.date(),
    actualizado: z.coerce.date().optional(),
    herramientas: z.array(z.string()).default([]),
    orden: z.number().int().default(100),
    borrador: z.boolean().default(false),
  }),
});

const noticias = defineCollection({
  loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/noticias' }),
  schema: z.object({
    titulo: z.string(),
    descripcion: z.string().max(200),
    publicado: z.coerce.date(),
    actualizado: z.coerce.date().optional(),
    etiquetas: z.array(z.string()).default([]),
    fuentes: z.array(z.object({ titulo: z.string(), url: z.string().url() })).default([]),
    borrador: z.boolean().default(false),
  }),
});

const prompts = defineCollection({
  loader: file('./src/content/prompts/prompts.json'),
  schema: z.object({
    id: z.string(),
    titulo: z.string(),
    categoria: z.enum(['aprender', 'depurar', 'explicar', 'refactorizar', 'escribir', 'estudiar']),
    prompt: z.string().min(20),
    herramientas: z.array(z.string()).default([]),
    nota: z.string().optional(),
  }),
});

export const collections = { guias, ia, aprende, noticias, prompts };
