// Genera las imágenes Open Graph (1200x630) y los favicons PNG a partir de SVG con sharp.
// Uso: node scripts/build-og.mjs
import sharp from 'sharp';
import { mkdir, writeFile } from 'node:fs/promises';

const BG = '#0b0b0c';
const SURFACE = '#151517';
const FG = '#f2f2ee';
const MUTED = '#a3a3a0';
const ACCENT = '#c6f24e';

const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

const logo = (x, y, s) => `
  <g transform="translate(${x} ${y}) scale(${s})">
    <rect width="64" height="64" rx="16" fill="${ACCENT}"/>
    <path d="M22 22 12 32l10 10M42 22l10 10-10 10M36 15 28 49" fill="none" stroke="${BG}" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"/>
  </g>`;

const og = ({ eyebrow, titulo, sub }) => `
<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <defs>
    <radialGradient id="g" cx="50%" cy="-10%" r="80%">
      <stop offset="0" stop-color="${ACCENT}" stop-opacity="0.22"/>
      <stop offset="1" stop-color="${ACCENT}" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect width="1200" height="630" fill="${BG}"/>
  <rect width="1200" height="630" fill="url(#g)"/>
  <rect x="48" y="48" width="1104" height="534" rx="32" fill="${SURFACE}" stroke="${FG}" stroke-opacity="0.12"/>
  ${logo(96, 96, 1.1)}
  <text x="190" y="146" font-family="Segoe UI, Arial, sans-serif" font-size="40" font-weight="700" fill="${FG}">Ayuda<tspan fill="${ACCENT}">Dev</tspan></text>
  <text x="96" y="250" font-family="Segoe UI, Arial, sans-serif" font-size="22" font-weight="700" letter-spacing="4" fill="${ACCENT}">${esc(eyebrow.toUpperCase())}</text>
  ${titulo
    .map((linea, i) => `<text x="96" y="${320 + i * 74}" font-family="Segoe UI, Arial, sans-serif" font-size="64" font-weight="700" fill="${FG}">${esc(linea)}</text>`)
    .join('')}
  <text x="96" y="520" font-family="Segoe UI, Arial, sans-serif" font-size="26" fill="${MUTED}">${esc(sub)}</text>
  <text x="1104" y="520" text-anchor="end" font-family="Segoe UI, Arial, sans-serif" font-size="22" fill="${MUTED}">dev.carlosnavarro.site</text>
</svg>`;

const imagenes = {
  default: { eyebrow: 'Gratis y en español', titulo: ['Aprende a programar con', 'recursos gratis, guías e IA'], sub: 'Un proyecto de Carlos Navarro · Mark House' },
  biblioteca: { eyebrow: 'Biblioteca', titulo: ['Libros, cursos y docs', 'gratuitos en español'], sub: 'Enlazados a su fuente original y verificados' },
  guias: { eyebrow: 'Guías con ejemplos', titulo: ['De cero a tu primer', 'programa, paso a paso'], sub: 'Código que puedes copiar y ejecutar' },
  ia: { eyebrow: 'Inteligencia artificial', titulo: ['Aprende con IA', 'sin depender de ella'], sub: 'Claude, ChatGPT, Gemini, Copilot y más' },
  noticias: { eyebrow: 'Noticias', titulo: ['Novedades para quien', 'está aprendiendo'], sub: 'Guías nuevas, recursos y mundo dev' },
};

await mkdir('public/og', { recursive: true });
for (const [nombre, datos] of Object.entries(imagenes)) {
  await sharp(Buffer.from(og(datos))).png({ compressionLevel: 9 }).toFile(`public/og/${nombre}.png`);
  console.log(`public/og/${nombre}.png`);
}

const favicon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">${logo(0, 0, 1)}</svg>`;
await sharp(Buffer.from(favicon)).resize(32, 32).png().toFile('public/favicon.png');
await sharp(Buffer.from(favicon)).resize(180, 180).png().toFile('public/apple-touch-icon.png');
await sharp(Buffer.from(favicon)).resize(512, 512).png().toFile('public/icon-512.png');
await writeFile(
  'public/manifest.webmanifest',
  JSON.stringify({ name: 'AyudaDev', short_name: 'AyudaDev', start_url: '/', display: 'standalone', background_color: BG, theme_color: BG, icons: [{ src: '/icon-512.png', sizes: '512x512', type: 'image/png' }] }, null, 2)
);
console.log('favicons y manifest listos');
