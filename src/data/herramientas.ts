import { z } from 'astro/zod';

export const CATEGORIAS_HERRAMIENTA = ['editor', 'terminal', 'navegador', 'playground', 'diseno', 'datos', 'control-de-versiones', 'despliegue', 'aprendizaje', 'documentacion', 'productividad'] as const;
export const ETIQUETAS_CATEGORIA: Record<(typeof CATEGORIAS_HERRAMIENTA)[number], string> = {
  editor: 'Editores y entornos',
  terminal: 'Terminal y línea de comandos',
  navegador: 'Navegador y DevTools',
  playground: 'Playgrounds en línea',
  diseno: 'Diseño y prototipos',
  datos: 'Bases de datos y APIs',
  'control-de-versiones': 'Control de versiones',
  despliegue: 'Despliegue y hosting',
  aprendizaje: 'Práctica y aprendizaje',
  documentacion: 'Documentación y referencias',
  productividad: 'Productividad',
};

export const herramientaSchema = z.object({
  id: z.string().regex(/^[a-z0-9-]+$/),
  nombre: z.string().min(2),
  categoria: z.enum(CATEGORIAS_HERRAMIENTA),
  descripcion: z.string().min(20).max(220),
  url: z.string().url().startsWith('https://'),
  /** nombre del logo en public/logos (opcional). */
  logo: z.string().optional(),
  gratis: z.enum(['si', 'limitado', 'no']),
  sistemas: z.array(z.enum(['windows', 'macos', 'linux', 'web'])).default([]),
  idioma: z.enum(['es', 'en']).default('en'),
  destacado: z.boolean().default(false),
  verificado: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});
export type Herramienta = z.infer<typeof herramientaSchema>;
export type HerramientaInput = z.input<typeof herramientaSchema>;

/** Las herramientas viven en src/data/herramientas/*.ts (un archivo por categoría), cada uno con export default. */
const modulos = import.meta.glob<{ default: unknown[] }>('./herramientas/*.ts', { eager: true });
export const HERRAMIENTAS: Herramienta[] = Object.values(modulos)
  .flatMap((m) => m.default)
  .map((h) => herramientaSchema.parse(h));
