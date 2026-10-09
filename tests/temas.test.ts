import { describe, expect, it } from 'vitest';
import { TEMAS } from '@data/temas';
import { AREAS_INFO } from '@data/areas';
import { AREAS } from '@lib/schemas';

describe('temas y áreas', () => {
  it('los slugs de tema son únicos', () => {
    const slugs = TEMAS.map((t) => t.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
  });

  it('cada área del esquema tiene información', () => {
    for (const a of AREAS) expect(AREAS_INFO.find((i) => i.id === a), a).toBeDefined();
  });

  it('cada área tiene al menos un tema', () => {
    for (const a of AREAS) expect(TEMAS.some((t) => t.area === a), a).toBe(true);
  });

  it('las descripciones no usan rayas largas', () => {
    for (const t of TEMAS) expect(t.descripcion, t.slug).not.toMatch(/[—–]/);
    for (const a of AREAS_INFO) expect(a.descripcion, a.id).not.toMatch(/[—–]/);
  });
});
