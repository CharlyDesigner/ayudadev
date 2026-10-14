import { defineCollection, z } from 'astro:content';
import { glob, file } from 'astro/loaders';
import { NIVELES } from './lib/schemas';

const base = {
  publicado: z.coerce.date(),
  actualizado: z.coerce.date().optional(),
  orden: z.number().int().default(100),
  borrador: z.boolean().default(false),
};

/** Guías con ejemplos por lenguaje o herramienta. */
const guias = defineCollection({
  loader: glob({ pattern: '**/*.mdx', base: './src/content/guias' }),
  schema: z.object({
    titulo: z.string(),
    descripcion: z.string().max(170),
    tema: z.string(),
    nivel: z.enum(NIVELES).default('principiante'),
    tiempoLectura: z.number().int().optional(),
    /** ids de recursos del catálogo para "Libros gratis para seguir". */
    libros: z.array(z.string()).default([]),
    requisitos: z.array(z.string()).default([]),
    etiquetas: z.array(z.string()).default([]),
    ...base,
  }),
});

/** Fichas de herramientas de IA. */
const ia = defineCollection({
  loader: glob({ pattern: '**/*.mdx', base: './src/content/ia' }),
  schema: z.object({
    nombre: z.string(),
    empresa: z.string(),
    descripcion: z.string().max(170),
    tipo: z.enum(['chat', 'ide', 'cli', 'asistente-codigo', 'api', 'local', 'agente', 'busqueda', 'app-builder']),
    sitio: z.string().url(),
    docs: z.string().url().optional(),
    planGratis: z.enum(['si', 'limitado', 'no', 'pendiente']).default('pendiente'),
    precioUrl: z.string().url().optional(),
    /** Nombre del archivo en public/logos/ia (sin extensión). */
    logo: z.string().optional(),
    verificado: z.coerce.date(),
    publicado: z.coerce.date(),
    orden: z.number().int().default(100),
    borrador: z.boolean().default(false),
  }),
});

/** Guías para aprender con IA, uso responsable, agentes, prompts avanzados, etc. */
const aprende = defineCollection({
  loader: glob({ pattern: '**/*.mdx', base: './src/content/aprende' }),
  schema: z.object({
    titulo: z.string(),
    descripcion: z.string().max(170),
    categoria: z.enum(['basico', 'prompts', 'codigo', 'agentes', 'api', 'responsable', 'local']).default('basico'),
    nivel: z.enum(NIVELES).default('principiante'),
    tiempoLectura: z.number().int().optional(),
    herramientas: z.array(z.string()).default([]),
    ...base,
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
    categoria: z.enum(['aprender', 'depurar', 'explicar', 'refactorizar', 'escribir', 'estudiar', 'revisar', 'tests', 'carrera', 'agentes']),
    prompt: z.string().min(20),
    herramientas: z.array(z.string()).default([]),
    nota: z.string().optional(),
  }),
});

/** Artículos que explican conceptos: cómo funciona internet, qué es una API, Big O, etc. */
const fundamentos = defineCollection({
  loader: glob({ pattern: '**/*.mdx', base: './src/content/fundamentos' }),
  schema: z.object({
    titulo: z.string(),
    descripcion: z.string().max(170),
    categoria: z.enum(['internet', 'programacion', 'datos', 'seguridad', 'calidad', 'arquitectura', 'herramientas', 'ia']),
    nivel: z.enum(NIVELES).default('principiante'),
    tiempoLectura: z.number().int().optional(),
    /** slugs de temas relacionados (src/data/temas.ts). */
    temas: z.array(z.string()).default([]),
    etiquetas: z.array(z.string()).default([]),
    ...base,
  }),
});

/** Carrera profesional: portafolio, GitHub, entrevistas, freelance, inglés técnico. */
const carrera = defineCollection({
  loader: glob({ pattern: '**/*.mdx', base: './src/content/carrera' }),
  schema: z.object({
    titulo: z.string(),
    descripcion: z.string().max(170),
    tiempoLectura: z.number().int().optional(),
    etiquetas: z.array(z.string()).default([]),
    ...base,
  }),
});

/** Hojas de referencia rápidas (cheatsheets). */
const hojas = defineCollection({
  loader: glob({ pattern: '**/*.mdx', base: './src/content/hojas' }),
  schema: z.object({
    titulo: z.string(),
    descripcion: z.string().max(170),
    /** slug del tema (src/data/temas.ts) o 'general'. */
    tema: z.string(),
    etiquetas: z.array(z.string()).default([]),
    ...base,
  }),
});

/** Retos de práctica con pistas y solución. */
const retos = defineCollection({
  loader: glob({ pattern: '**/*.mdx', base: './src/content/retos' }),
  schema: z.object({
    titulo: z.string(),
    descripcion: z.string().max(170),
    tema: z.string(),
    nivel: z.enum(NIVELES).default('principiante'),
    /** minutos aproximados. */
    tiempo: z.number().int().default(15),
    conceptos: z.array(z.string()).default([]),
    ...base,
  }),
});

/** Ideas de proyectos para practicar y llenar tu portafolio. */
const proyectos = defineCollection({
  loader: glob({ pattern: '**/*.mdx', base: './src/content/proyectos' }),
  schema: z.object({
    titulo: z.string(),
    descripcion: z.string().max(170),
    nivel: z.enum(NIVELES).default('principiante'),
    /** texto libre, p. ej. "1 a 2 días". */
    tiempo: z.string(),
    /** nombres de logos en public/logos (javascript, python, react...). */
    tecnologias: z.array(z.string()).default([]),
    /** slugs de temas relacionados. */
    temas: z.array(z.string()).default([]),
    habilidades: z.array(z.string()).default([]),
    ...base,
  }),
});

/** Rutas de estudio con pasos ordenados. */
const rutas = defineCollection({
  loader: glob({ pattern: '**/*.mdx', base: './src/content/rutas' }),
  schema: z.object({
    titulo: z.string(),
    descripcion: z.string().max(170),
    nivel: z.enum(NIVELES).default('principiante'),
    /** texto libre, p. ej. "8 a 12 semanas". */
    duracion: z.string(),
    /** a quién le sirve, en una frase. */
    para: z.string(),
    /** nombres de logos en public/logos que representan la ruta. */
    logos: z.array(z.string()).default([]),
    /** slug del objetivo para el cuestionario "Empieza aquí". */
    objetivo: z.enum(['web', 'movil', 'datos-ia', 'sistemas', 'juegos', 'general']).default('general'),
    pasos: z
      .array(
        z.object({
          titulo: z.string(),
          descripcion: z.string(),
          /** p. ej. "2 semanas". */
          duracion: z.string().optional(),
          /** slug de una guía de src/content/guias. */
          guia: z.string().optional(),
          /** slug de un tema de src/data/temas.ts. */
          tema: z.string().optional(),
          /** ids de recursos del catálogo. */
          recursos: z.array(z.string()).default([]),
          /** slugs de retos o proyectos para practicar este paso. */
          retos: z.array(z.string()).default([]),
          proyectos: z.array(z.string()).default([]),
          /** qué deberías poder hacer al terminar. */
          meta: z.string().optional(),
        })
      )
      .min(3),
    ...base,
  }),
});

/** Glosario: términos en lenguaje sencillo. */
const glosario = defineCollection({
  loader: file('./src/content/glosario/terminos.json'),
  schema: z.object({
    id: z.string(),
    termino: z.string(),
    definicion: z.string().min(20),
    categoria: z.enum(['web', 'programacion', 'datos', 'ia', 'herramientas', 'seguridad', 'redes', 'general']),
    ejemplo: z.string().optional(),
    /** ids de otros términos. */
    relacionados: z.array(z.string()).default([]),
    /** slug de tema relacionado. */
    tema: z.string().optional(),
  }),
});

export const collections = { guias, ia, aprende, noticias, prompts, fundamentos, carrera, hojas, retos, proyectos, rutas, glosario };
