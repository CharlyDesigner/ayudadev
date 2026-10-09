import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { RECURSOS } from '@data/library';
import { TEMAS } from '@data/temas';

const raiz = join(process.cwd(), 'src', 'content');
const ids = new Set(RECURSOS.map((r) => r.id));
const temas = new Set(TEMAS.map((t) => t.slug));

const archivos = (carpeta: string, ext: string[]) => {
  const dir = join(raiz, carpeta);
  if (!existsSync(dir)) return [] as string[];
  return readdirSync(dir).filter((f) => ext.some((e) => f.endsWith(e))).map((f) => join(dir, f));
};

const frontmatter = (archivo: string): string => {
  const texto = readFileSync(archivo, 'utf8');
  const m = texto.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  return m?.[1] ?? '';
};

const cuerpo = (archivo: string): string => readFileSync(archivo, 'utf8').replace(/^---\r?\n[\s\S]*?\r?\n---/, '');

/** Quita bloques de código para revisar solo la prosa. */
const prosa = (texto: string): string => texto.replace(/```[\s\S]*?```/g, '').replace(/`[^`\n]*`/g, '');

describe('guías', () => {
  const guias = archivos('guias', ['.mdx']);

  it('apuntan a temas existentes', () => {
    for (const g of guias) {
      const tema = frontmatter(g).match(/^tema:\s*['"]?([a-z0-9-]+)['"]?/m)?.[1];
      expect(tema && temas.has(tema), `${g}: tema ${tema}`).toBe(true);
    }
  });

  it('sus libros existen en el catálogo', () => {
    for (const g of guias) {
      const fm = frontmatter(g);
      const lista = fm.match(/^libros:\s*\[([^\]]*)\]/m)?.[1] ?? '';
      for (const id of lista.split(',').map((s) => s.trim().replace(/^['"]|['"]$/g, '')).filter(Boolean)) {
        expect(ids.has(id), `${g}: libro ${id}`).toBe(true);
      }
    }
  });

  it('tienen las secciones obligatorias', () => {
    for (const g of guias) {
      const texto = cuerpo(g);
      for (const h of ['## Qué es', '## Instálalo', '## Ejemplos', '## Errores comunes', '## Siguiente paso']) {
        expect(texto.includes(h), `${g}: falta "${h}"`).toBe(true);
      }
      expect(texto.includes('<LibrosRecomendados'), `${g}: falta LibrosRecomendados`).toBe(true);
    }
  });
});

describe('contenido en general', () => {
  const todos = [
    ...archivos('guias', ['.mdx']),
    ...archivos('ia', ['.mdx']),
    ...archivos('aprende', ['.mdx']),
    ...archivos('noticias', ['.md', '.mdx']),
  ];

  it('no usa rayas largas en la prosa', () => {
    for (const f of todos) {
      const texto = prosa(cuerpo(f));
      expect(texto, f).not.toMatch(/[—]/);
    }
  });

  it('el frontmatter no usa rayas largas', () => {
    for (const f of todos) expect(frontmatter(f), f).not.toMatch(/[—]/);
  });
});
