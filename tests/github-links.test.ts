import { describe, expect, it } from 'vitest';
import { issueUrl } from '@lib/github';
import { SITE } from '@data/site';

describe('enlaces a GitHub', () => {
  it('construye issues prellenados', () => {
    const url = new URL(issueUrl('nuevo-recurso', { title: '[Recurso] JavaScript: ', tema: 'JavaScript' }));
    expect(url.origin + url.pathname).toBe(`${SITE.repo}/issues/new`);
    expect(url.searchParams.get('template')).toBe('nuevo-recurso.yml');
    expect(url.searchParams.get('title')).toBe('[Recurso] JavaScript: ');
    expect(url.searchParams.get('tema')).toBe('JavaScript');
  });

  it('omite campos vacíos', () => {
    expect(issueUrl('enlace-roto', { nueva: '' })).not.toContain('nueva=');
  });
});
