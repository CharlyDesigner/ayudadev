// Revisa el sitio compilado en dist/: enlaces internos, anclas, ids repetidos y comentarios filtrados.
import { readFile, readdir, stat } from 'node:fs/promises';
import { resolve, relative, join } from 'node:path';

const SITE = 'https://dev.carlosnavarro.site';
const root = resolve('dist');

async function walk(folder) {
  const files = [];
  for (const entry of await readdir(folder, { withFileTypes: true })) {
    const file = join(folder, entry.name);
    if (entry.isDirectory()) files.push(...(await walk(file)));
    else if (entry.name.endsWith('.html')) files.push(file);
  }
  return files;
}

const pages = await walk(root);
const errors = [];
let checked = 0;
const htmlCache = new Map();
const readHTML = async (file) => {
  if (!htmlCache.has(file)) htmlCache.set(file, await readFile(file, 'utf8'));
  return htmlCache.get(file);
};

for (const file of pages) {
  const html = await readHTML(file);
  const rel = relative(root, file).replaceAll('\\', '/');
  const visible = html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '');
  if (/\/\/ src\/(?:components|layouts|pages)\/[\w/.-]+\.astro/.test(visible)) errors.push(`${rel}: se filtró un comentario de código`);
  if (visible.includes('localhost:43')) errors.push(`${rel}: contiene enlaces a localhost`);

  const ids = [...html.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]);
  const repetidos = ids.filter((id, i) => ids.indexOf(id) !== i);
  if (repetidos.length) errors.push(`${rel}: ids repetidos (${[...new Set(repetidos)].join(', ')})`);

  for (const match of html.matchAll(/(?:href|src|poster|action)="([^"<>]+)"/g)) {
    const value = match[1].replaceAll('&amp;', '&');
    if (!value.startsWith('/') && !value.startsWith('#')) continue;
    if (value.startsWith('/api/')) continue; // PHP, no existe en dist como página
    const url = new URL(value, `${SITE}/${rel}`);
    let target = join(root, decodeURIComponent(url.pathname));
    try {
      const info = await stat(target);
      if (info.isDirectory()) target = join(target, 'index.html');
      await stat(target);
      if (url.hash && target.endsWith('.html')) {
        const targetHTML = await readHTML(target);
        const ancla = decodeURIComponent(url.hash.slice(1));
        if (ancla && !targetHTML.includes(`id="${ancla}"`)) errors.push(`${rel}: ancla inexistente ${value}`);
      }
      checked++;
    } catch {
      errors.push(`${rel}: ruta o recurso inexistente ${value}`);
    }
  }
}

if (errors.length) {
  console.error(errors.join('\n'));
  process.exitCode = 1;
} else {
  console.log(`${pages.length} páginas revisadas; ${checked} enlaces internos válidos; sin ids repetidos.`);
}
