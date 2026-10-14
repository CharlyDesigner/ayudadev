/**
 * Generador de propuestas de recursos.
 *
 * No escribe nada en el repositorio. Valida con las mismas reglas del catálogo (recursoSchema) y arma
 * el contenido de un archivo nuevo más un enlace al editor de GitHub. Quien contribuye inicia sesión
 * en GitHub, GitHub crea el fork y el pull request a su nombre, y una persona mantenedora lo revisa.
 */
import { AREAS, FORMATOS, LICENCIAS, NIVELES, TIPOS } from './schemas';

export interface Propuesta {
  titulo: string;
  autor: string;
  url: string;
  tema: string;
  tipo: string;
  nivel: string;
  formato: string;
  idioma: string;
  licencia: string;
  descripcion: string;
  etiquetas: string[];
}

export interface ContextoValidacion {
  temas: string[];
  urlsExistentes: string[];
}

export const HOSTS_PROHIBIDOS = ['librosgratis.dev', 'www.librosgratis.dev'];
export const CARPETA_COMUNIDAD = 'src/data/recursos/comunidad';

const sinSlash = (u: string): string => u.replace(/\/+$/, '').toLowerCase();

export const aSlug = (s: string): string =>
  s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

export const idRecurso = (tema: string, titulo: string): string => `${tema}-${aSlug(titulo)}`.slice(0, 80).replace(/-+$/, '');

export const validarPropuesta = (p: Propuesta, ctx: ContextoValidacion): string[] => {
  const e: string[] = [];
  const largo = (v: string, min: number, max: number, nombre: string) => {
    if (v.trim().length < min || v.trim().length > max) e.push(`${nombre}: entre ${min} y ${max} caracteres.`);
  };
  largo(p.titulo, 3, 120, 'Título');
  largo(p.autor, 1, 120, 'Autor');
  largo(p.descripcion, 20, 240, 'Descripción');

  try {
    const u = new URL(p.url);
    if (u.protocol !== 'https:') e.push('El enlace debe empezar con https://');
    if (u.username || u.password) e.push('El enlace no debe incluir usuario ni contraseña.');
    if (HOSTS_PROHIBIDOS.includes(u.hostname)) e.push('Enlaza a la fuente original, no a librosgratis.dev.');
    if (ctx.urlsExistentes.some((x) => sinSlash(x) === sinSlash(p.url))) e.push('Ese enlace ya está en el catálogo.');
  } catch {
    e.push('El enlace no es una URL válida.');
  }

  if (!ctx.temas.includes(p.tema)) e.push('Elige un tema de la lista.');
  if (!(TIPOS as readonly string[]).includes(p.tipo)) e.push('Tipo no válido.');
  if (!(NIVELES as readonly string[]).includes(p.nivel)) e.push('Nivel no válido.');
  if (!(FORMATOS as readonly string[]).includes(p.formato)) e.push('Formato no válido.');
  if (!['es', 'en'].includes(p.idioma)) e.push('Idioma no válido.');
  if (!(LICENCIAS as readonly string[]).includes(p.licencia)) e.push('Licencia no válida.');
  if (p.licencia === 'desconocida' && p.formato !== 'web') e.push('Si no conoces la licencia, el recurso debe ser de lectura web, no PDF, EPUB ni repositorio.');
  if (p.etiquetas.length > 8) e.push('Máximo 8 etiquetas.');
  if (p.etiquetas.some((t) => !/^[a-z0-9-]{2,30}$/.test(t))) e.push('Etiquetas: minúsculas, números y guiones (2 a 30 caracteres).');
  if (/[—–]/.test(`${p.titulo}${p.autor}${p.descripcion}`)) e.push('Evita las rayas largas: usa coma, punto o dos puntos.');
  return e;
};

/** Cadena TypeScript entre comillas simples. */
export const tsStr = (s: string): string => `'${s.replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/\r?\n/g, ' ')}'`;

export const archivoRecurso = (p: Propuesta, fecha: string): string => {
  const id = idRecurso(p.tema, p.titulo);
  const lineas = [
    `import type { RecursoInput } from '@lib/schemas';`,
    ``,
    `const recursos: RecursoInput[] = [`,
    `  {`,
    `    id: ${tsStr(id)},`,
    `    titulo: ${tsStr(p.titulo.trim())},`,
    `    autor: ${tsStr(p.autor.trim())},`,
    `    url: ${tsStr(p.url.trim())},`,
    `    tema: ${tsStr(p.tema)},`,
    `    tipo: ${tsStr(p.tipo)},`,
    `    nivel: ${tsStr(p.nivel)},`,
    `    formato: ${tsStr(p.formato)},`,
    `    idioma: ${tsStr(p.idioma)},`,
    `    licencia: ${tsStr(p.licencia)},`,
    `    descripcion: ${tsStr(p.descripcion.trim())},`,
    `    etiquetas: [${p.etiquetas.map(tsStr).join(', ')}],`,
    `    agregado: ${tsStr(fecha)},`,
    `    verificado: ${tsStr(fecha)},`,
    `  },`,
    `];`,
    ``,
    `export default recursos;`,
    ``,
  ];
  return lineas.join('\n');
};

/** Enlace al editor web de GitHub con el archivo ya escrito. GitHub pide iniciar sesión y crea el fork y el PR. */
export const urlNuevoArchivoGitHub = (repo: string, p: Propuesta, fecha: string): string => {
  const id = idRecurso(p.tema, p.titulo);
  const params = {
    filename: `${id}.ts`,
    value: archivoRecurso(p, fecha),
    message: `Recurso: ${p.titulo.trim()}`,
    description: `Propuesta de recurso para la biblioteca (${p.tema}).`,
  };
  const query = Object.entries(params)
    .map(([k, v]) => `${k}=${encodeURIComponent(v)}`)
    .join('&');
  return `${repo}/new/main/${CARPETA_COMUNIDAD}?${query}`;
};

export const AREAS_VALIDAS: readonly string[] = AREAS;
