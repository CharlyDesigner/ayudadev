import { describe, expect, it } from 'vitest';
import { construirIndice } from '@lib/search-index';
import { TEMAS } from '@data/temas';
import { RECURSOS } from '@data/library';

describe('índice de búsqueda', () => {
  const indice = construirIndice({
    temas: TEMAS,
    recursos: RECURSOS,
    guias: [{ slug: 'javascript', titulo: 'JavaScript desde cero', descripcion: 'd', etiquetas: ['node'] }],
    ia: [{ slug: 'claude', nombre: 'Claude', descripcion: 'd', empresa: 'Anthropic' }],
    aprende: [],
    noticias: [{ slug: 'nace', titulo: 'Nace AyudaDev', descripcion: 'd' }],
    prompts: [{ id: 'p1', titulo: 'Prompt', categoria: 'aprender' }],
  });

  it('incluye un elemento por tema y por recurso', () => {
    expect(indice.filter((i) => i.tipo === 'tema')).toHaveLength(TEMAS.length);
    expect(indice.filter((i) => i.tipo === 'recurso')).toHaveLength(RECURSOS.length);
  });

  it('todas las URLs son relativas al sitio', () => {
    for (const i of indice) expect(i.url.startsWith('/'), i.url).toBe(true);
  });

  it('no repite URLs', () => {
    const urls = indice.map((i) => i.url);
    expect(new Set(urls).size).toBe(urls.length);
  });

  it('incluye páginas, guías, IA, noticias y prompts', () => {
    for (const tipo of ['pagina', 'guia', 'ia', 'noticia', 'prompt']) expect(indice.some((i) => i.tipo === tipo), tipo).toBe(true);
  });
});
