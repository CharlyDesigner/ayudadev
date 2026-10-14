import { z } from 'astro/zod';

export const AREAS = [
  'fundamentos',
  'lenguajes',
  'desarrollo-web',
  'frameworks',
  'plataformas',
  'herramientas',
  'bases-de-datos',
  'ia-y-datos',
] as const;
export type AreaId = (typeof AREAS)[number];

export const TIPOS = ['libro', 'curso', 'documentacion', 'tutorial', 'interactivo', 'video'] as const;
export const NIVELES = ['principiante', 'intermedio', 'avanzado'] as const;
export const FORMATOS = ['web', 'pdf', 'epub', 'repo', 'video'] as const;
export const LICENCIAS = [
  'cc-by',
  'cc-by-sa',
  'cc-by-nc',
  'cc-by-nc-sa',
  'cc-by-nc-nd',
  'mit',
  'gpl',
  'apache',
  'bsd',
  'psf',
  'dominio-publico',
  'gratuita-propietaria',
  'desconocida',
] as const;

export type Tipo = (typeof TIPOS)[number];
export type Nivel = (typeof NIVELES)[number];
export type Formato = (typeof FORMATOS)[number];
export type Licencia = (typeof LICENCIAS)[number];

const slug = z.string().regex(/^[a-z0-9-]+$/, 'slug en minúsculas con guiones');
const fechaISO = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'fecha AAAA-MM-DD');

export const temaSchema = z.object({
  slug,
  nombre: z.string().min(1),
  area: z.enum(AREAS),
  descripcion: z.string().min(10).max(200),
  icono: z.string().optional(),
  /** Monograma corto (1 a 4 caracteres): se muestra si el tema no tiene logo. */
  abrev: z.string().min(1).max(4),
  /** Nombre del archivo en public/logos (sin extensión). */
  logo: z.string().optional(),
  /** Slug de la guía en src/content/guias, si existe. */
  guia: z.string().optional(),
  /** Slug equivalente en librosgratis.dev para el enlace "ver más". */
  librosgratis: z.string().optional(),
  orden: z.number().int().optional(),
});
export type Tema = z.infer<typeof temaSchema>;

/** Hosts a los que nunca enlazamos (espejos o redistribución de terceros). */
export const HOSTS_BLOQUEADOS = ['librosgratis.dev', 'www.librosgratis.dev'];

export const recursoSchema = z
  .object({
    id: slug,
    titulo: z.string().min(3).max(120),
    autor: z.string().min(1).max(120),
    url: z.string().url().startsWith('https://'),
    tema: slug,
    tipo: z.enum(TIPOS),
    nivel: z.enum(NIVELES),
    formato: z.enum(FORMATOS),
    idioma: z.enum(['es', 'en']).default('es'),
    licencia: z.enum(LICENCIAS),
    descripcion: z.string().min(20).max(240),
    anio: z.number().int().min(1990).max(2030).optional(),
    destacado: z.boolean().default(false),
    etiquetas: z.array(z.string()).default([]),
    agregado: fechaISO,
    verificado: fechaISO,
  })
  .refine((r) => !HOSTS_BLOQUEADOS.includes(new URL(r.url).hostname), {
    message: 'host bloqueado: enlaza siempre a la fuente original',
  })
  .refine((r) => r.licencia !== 'desconocida' || r.formato === 'web', {
    message: 'solo recursos web pueden tener licencia desconocida',
  });
export type Recurso = z.infer<typeof recursoSchema>;
export type RecursoInput = z.input<typeof recursoSchema>;

export const ETIQUETAS_TIPO: Record<Tipo, string> = {
  libro: 'Libro',
  curso: 'Curso',
  documentacion: 'Documentación',
  tutorial: 'Tutorial',
  interactivo: 'Interactivo',
  video: 'Video',
};
export const ETIQUETAS_NIVEL: Record<Nivel, string> = {
  principiante: 'Principiante',
  intermedio: 'Intermedio',
  avanzado: 'Avanzado',
};
export const ETIQUETAS_FORMATO: Record<Formato, string> = {
  web: 'Web',
  pdf: 'PDF',
  epub: 'EPUB',
  repo: 'Repositorio',
  video: 'Video',
};
export const ETIQUETAS_LICENCIA: Record<Licencia, string> = {
  'cc-by': 'CC BY',
  'cc-by-sa': 'CC BY-SA',
  'cc-by-nc': 'CC BY-NC',
  'cc-by-nc-sa': 'CC BY-NC-SA',
  'cc-by-nc-nd': 'CC BY-NC-ND',
  mit: 'MIT',
  gpl: 'GPL',
  apache: 'Apache 2.0',
  bsd: 'BSD',
  psf: 'Licencia PSF',
  'dominio-publico': 'Dominio público',
  'gratuita-propietaria': 'Gratuita (propietaria)',
  desconocida: 'Gratis para leer',
};
