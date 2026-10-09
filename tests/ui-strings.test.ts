import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const recorrer = (dir: string, ext: string[]): string[] => {
  const salida: string[] = [];
  for (const nombre of readdirSync(dir)) {
    const ruta = join(dir, nombre);
    if (statSync(ruta).isDirectory()) salida.push(...recorrer(ruta, ext));
    else if (ext.some((e) => nombre.endsWith(e))) salida.push(ruta);
  }
  return salida;
};

describe('textos de interfaz', () => {
  const archivos = [
    ...recorrer(join(process.cwd(), 'src', 'components'), ['.astro']),
    ...recorrer(join(process.cwd(), 'src', 'pages'), ['.astro']),
    ...recorrer(join(process.cwd(), 'src', 'layouts'), ['.astro']),
    join(process.cwd(), 'src', 'data', 'site.ts'),
    join(process.cwd(), 'src', 'scripts', 'newsletter.ts'),
  ];

  it('no usan rayas largas', () => {
    for (const f of archivos) {
      const texto = readFileSync(f, 'utf8');
      expect(texto, f).not.toMatch(/—/);
    }
  });
});
