/**
 * Datos abiertos del sitio para IA (servidor MCP de solo lectura, llms.txt).
 * Funciones puras: se prueban en tests/mcp-data.test.ts.
 */
import { SITE } from '@data/site';

export type TipoDoc = 'guia' | 'fundamento' | 'hoja' | 'reto' | 'proyecto' | 'carrera' | 'ruta' | 'ia' | 'aprende' | 'noticia';

export const TIPOS_DOC: TipoDoc[] = ['guia', 'fundamento', 'hoja', 'reto', 'proyecto', 'carrera', 'ruta', 'ia', 'aprende', 'noticia'];

/** Prefijo de URL pública de cada tipo de documento. */
export const RUTA_DOC: Record<TipoDoc, string> = {
  guia: '/guias/',
  fundamento: '/fundamentos/',
  hoja: '/hojas/',
  reto: '/retos/',
  proyecto: '/proyectos/',
  carrera: '/carrera/',
  ruta: '/rutas/',
  ia: '/ia/',
  aprende: '/ia/aprende/',
  noticia: '/noticias/',
};

export interface DocMeta {
  tipo: TipoDoc;
  id: string;
  titulo: string;
  descripcion: string;
  url: string;
  etiquetas: string[];
  tema?: string;
  nivel?: string;
}

export const urlDoc = (tipo: TipoDoc, id: string): string => `${SITE.url}${RUTA_DOC[tipo]}${id}/`;

const atributo = (tag: string, nombre: string): string | undefined => {
  const m = tag.match(new RegExp(`${nombre}=(?:"([^"]*)"|'([^']*)'|\\{([^}]*)\\})`));
  return m ? (m[1] ?? m[2] ?? m[3]) : undefined;
};

/**
 * Convierte el cuerpo MDX en Markdown legible para una IA:
 * quita imports y convierte los componentes del sitio en texto plano.
 */
export const limpiarMdx = (cuerpo: string): string => {
  let t = cuerpo.replace(/\r\n/g, '\n');
  t = t.replace(/^import\s.+$/gm, '');
  t = t.replace(/<Ejemplo\b([^>]*)>/g, (_m, attrs: string) => {
    const titulo = atributo(attrs, 'titulo') ?? 'Ejemplo';
    const lineas = [`#### Ejemplo: ${titulo}`];
    const archivo = atributo(attrs, 'archivo');
    const ejecutar = atributo(attrs, 'ejecutar');
    const salida = atributo(attrs, 'salida');
    if (archivo) lineas.push(`Archivo: \`${archivo}\``);
    if (ejecutar) lineas.push(`Cómo correrlo: \`${ejecutar}\``);
    if (salida) lineas.push(`Salida esperada: \`${salida.replace(/\n/g, ' ')}\``);
    return `\n${lineas.join('\n')}\n`;
  });
  t = t.replace(/<Callout\b([^>]*)>/g, (_m, attrs: string) => {
    const tipo = atributo(attrs, 'tipo') ?? 'info';
    const titulo = atributo(attrs, 'titulo');
    const etiqueta = tipo === 'warning' ? 'Cuidado' : tipo === 'tip' ? 'Consejo' : 'Nota';
    return `\n> **${titulo ?? etiqueta}**\n> `;
  });
  t = t.replace(/<Solucion\b([^>]*)>/g, (_m, attrs: string) => `\n#### ${atributo(attrs, 'titulo') ?? 'Solución'}\n`);
  t = t.replace(/<Pista\b([^>]*)>/g, (_m, attrs: string) => `\n**Pista ${atributo(attrs, 'n') ?? ''}**\n`);
  t = t.replace(/<LibrosRecomendados\b[^>]*\/>/g, '');
  t = t.replace(/<\/?(Ejemplo|Callout|Pasos|Solucion|Pista)>/g, '');
  t = t.replace(/<\/?Fragment[^>]*>/g, '');
  return t.replace(/\n{3,}/g, '\n\n').trim();
};

/** Documento completo en Markdown con cabecera. */
export const documentoMarkdown = (meta: DocMeta, cuerpo: string): string => {
  const cabecera = [`# ${meta.titulo}`, '', `> ${meta.descripcion}`, '', `URL: ${meta.url}`];
  if (meta.nivel) cabecera.push(`Nivel: ${meta.nivel}`);
  if (meta.tema) cabecera.push(`Tema: ${meta.tema}`);
  cabecera.push(`Licencia del texto: CC BY 4.0 (${SITE.nombre})`, '');
  return `${cabecera.join('\n')}\n${cuerpo.trim()}\n`;
};

export interface PasoRuta {
  titulo: string;
  descripcion: string;
  duracion?: string;
  guia?: string;
  tema?: string;
  recursos: string[];
  retos: string[];
  proyectos: string[];
  meta?: string;
}

/** Una ruta de estudio como Markdown (sus pasos viven en el frontmatter). */
export const rutaMarkdown = (pasos: PasoRuta[], cuerpo: string): string => {
  const lista = pasos.map((p, i) => {
    const l = [`### Paso ${i + 1}: ${p.titulo}`, '', p.descripcion];
    if (p.duracion) l.push(`Duración: ${p.duracion}`);
    if (p.guia) l.push(`Guía: ${urlDoc('guia', p.guia)}`);
    if (p.tema) l.push(`Biblioteca: ${SITE.url}/biblioteca/${p.tema}/`);
    if (p.recursos.length) l.push(`Recursos (ids del catálogo): ${p.recursos.join(', ')}`);
    if (p.retos.length) l.push(`Retos: ${p.retos.map((r) => urlDoc('reto', r)).join(', ')}`);
    if (p.proyectos.length) l.push(`Proyectos: ${p.proyectos.map((r) => urlDoc('proyecto', r)).join(', ')}`);
    if (p.meta) l.push(`Al terminar podrás: ${p.meta}`);
    return l.join('\n');
  });
  return `## Pasos\n\n${lista.join('\n\n')}\n\n${cuerpo.trim()}`;
};

/** Normaliza para buscar: minúsculas y sin acentos (misma regla que el PHP del servidor MCP). */
export const normalizarBusqueda = (s: string): string =>
  s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .trim();
