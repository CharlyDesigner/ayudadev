/** Quita acentos y pasa a minúsculas para comparar o buscar. */
export const normalizar = (texto: string): string =>
  texto
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim();

export const aSlug = (texto: string): string =>
  normalizar(texto)
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

export const truncar = (texto: string, max = 160): string =>
  texto.length <= max ? texto : `${texto.slice(0, max - 1).trimEnd()}…`;

export const plural = (n: number, singular: string, pluralForm: string): string =>
  `${n} ${n === 1 ? singular : pluralForm}`;
