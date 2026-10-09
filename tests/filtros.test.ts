import { describe, expect, it } from 'vitest';
import { filtrarRecursos, ordenRecursos } from '@lib/catalog';
import { normalizar, aSlug } from '@lib/text';
import type { Recurso, Tema } from '@lib/schemas';

const tema = (slug: string, area: Tema['area']): Tema => ({ slug, nombre: slug, area, descripcion: 'descripción de prueba' });
const temas: Tema[] = [tema('javascript', 'lenguajes'), tema('git', 'herramientas')];

const r = (over: Partial<Recurso>): Recurso => ({
  id: 'javascript-x',
  titulo: 'Título',
  autor: 'Autor',
  url: 'https://ejemplo.com/',
  tema: 'javascript',
  tipo: 'libro',
  nivel: 'principiante',
  formato: 'web',
  idioma: 'es',
  licencia: 'mit',
  descripcion: 'descripción de prueba suficientemente larga',
  destacado: false,
  etiquetas: [],
  agregado: '2026-10-09',
  verificado: '2026-10-09',
  ...over,
});

const lista = [
  r({ id: 'javascript-a', titulo: 'JavaScript Elocuente', nivel: 'intermedio', etiquetas: ['dom'] }),
  r({ id: 'javascript-b', titulo: 'Aprende JS', tipo: 'curso', destacado: true }),
  r({ id: 'git-a', titulo: 'Pro Git', tema: 'git', nivel: 'avanzado' }),
];

describe('filtrarRecursos', () => {
  it('sin criterios devuelve todo', () => {
    expect(filtrarRecursos(lista, {}, temas)).toHaveLength(3);
  });
  it('filtra por área a través de los temas', () => {
    expect(filtrarRecursos(lista, { area: 'herramientas' }, temas).map((x) => x.id)).toEqual(['git-a']);
  });
  it('filtra por tema, tipo y nivel', () => {
    expect(filtrarRecursos(lista, { tema: 'javascript', tipo: 'curso' }, temas).map((x) => x.id)).toEqual(['javascript-b']);
    expect(filtrarRecursos(lista, { nivel: 'avanzado' }, temas).map((x) => x.id)).toEqual(['git-a']);
  });
  it('busca texto sin acentos y en etiquetas', () => {
    expect(filtrarRecursos(lista, { texto: 'ELOCUENTE' }, temas).map((x) => x.id)).toEqual(['javascript-a']);
    expect(filtrarRecursos(lista, { texto: 'dom' }, temas).map((x) => x.id)).toEqual(['javascript-a']);
    expect(filtrarRecursos(lista, { texto: 'nada-que-ver' }, temas)).toEqual([]);
  });
});

describe('ordenRecursos', () => {
  it('pone destacados primero y luego por nivel', () => {
    expect([...lista].sort(ordenRecursos).map((x) => x.id)).toEqual(['javascript-b', 'javascript-a', 'git-a']);
  });
});

describe('texto', () => {
  it('normaliza acentos y mayúsculas', () => {
    expect(normalizar('  Programación Ágil ')).toBe('programacion agil');
  });
  it('genera slugs', () => {
    expect(aSlug('HTML y CSS: desde cero')).toBe('html-y-css-desde-cero');
  });
});
