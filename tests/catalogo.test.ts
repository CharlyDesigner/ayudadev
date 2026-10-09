import { describe, expect, it } from 'vitest';
import { RECURSOS } from '@data/library';
import { TEMAS } from '@data/temas';
import { HOSTS_BLOQUEADOS, recursoSchema } from '@lib/schemas';

const temas = new Set(TEMAS.map((t) => t.slug));

describe('catálogo de recursos', () => {
  it('tiene recursos', () => {
    expect(RECURSOS.length).toBeGreaterThan(0);
  });

  it('cada recurso cumple el esquema', () => {
    for (const r of RECURSOS) expect(() => recursoSchema.parse(r), r.id).not.toThrow();
  });

  it('los ids son únicos', () => {
    const ids = RECURSOS.map((r) => r.id);
    const repetidos = ids.filter((id, i) => ids.indexOf(id) !== i);
    expect(repetidos).toEqual([]);
  });

  it('las URLs son únicas', () => {
    const urls = RECURSOS.map((r) => r.url.replace(/\/$/, ''));
    const repetidas = urls.filter((u, i) => urls.indexOf(u) !== i);
    expect(repetidas).toEqual([]);
  });

  it('cada recurso pertenece a un tema existente', () => {
    for (const r of RECURSOS) expect(temas.has(r.tema), `${r.id} apunta al tema ${r.tema}`).toBe(true);
  });

  it('nunca enlaza a hosts bloqueados ni a http', () => {
    for (const r of RECURSOS) {
      const host = new URL(r.url).hostname;
      expect(HOSTS_BLOQUEADOS.includes(host), `${r.id} enlaza a ${host}`).toBe(false);
      expect(r.url.startsWith('https://'), r.id).toBe(true);
    }
  });

  it('el id empieza con el slug del tema', () => {
    for (const r of RECURSOS) expect(r.id.startsWith(`${r.tema}-`), r.id).toBe(true);
  });

  it('hay como máximo 3 destacados por tema', () => {
    const conteo = new Map<string, number>();
    for (const r of RECURSOS) if (r.destacado) conteo.set(r.tema, (conteo.get(r.tema) ?? 0) + 1);
    for (const [tema, n] of conteo) expect(n, `tema ${tema}`).toBeLessThanOrEqual(3);
  });

  it('no usa rayas largas en títulos ni descripciones', () => {
    for (const r of RECURSOS) expect(`${r.titulo}${r.descripcion}${r.autor}`, r.id).not.toMatch(/[—–]/);
  });
});
