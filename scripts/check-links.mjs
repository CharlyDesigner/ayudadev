// Comprueba que cada URL del catálogo responde. Se ejecuta a mano: npm run check:links
// Lee dist/recursos.json, así que primero corre npm run build.
import { readFile } from 'node:fs/promises';

const recursos = JSON.parse(await readFile(new URL('../dist/recursos.json', import.meta.url), 'utf8'));
const CONCURRENCIA = 6;
const TIMEOUT = 15000;
const UA = 'Mozilla/5.0 (compatible; AyudaDevLinkCheck/1.0; +https://dev.carlosnavarro.site)';

const probar = async (url) => {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), TIMEOUT);
  try {
    let res = await fetch(url, { method: 'HEAD', redirect: 'follow', signal: ctrl.signal, headers: { 'User-Agent': UA } });
    if (res.status === 405 || res.status === 403 || res.status >= 500) {
      res = await fetch(url, { method: 'GET', redirect: 'follow', signal: ctrl.signal, headers: { 'User-Agent': UA } });
    }
    return { ok: res.ok, status: res.status, final: res.url };
  } catch (e) {
    return { ok: false, status: 0, error: e.name === 'AbortError' ? 'timeout' : e.message };
  } finally {
    clearTimeout(t);
  }
};

const cola = [...recursos];
const fallos = [];
let hechos = 0;
await Promise.all(
  Array.from({ length: CONCURRENCIA }, async () => {
    while (cola.length) {
      const r = cola.shift();
      const res = await probar(r.url);
      hechos++;
      if (!res.ok) {
        fallos.push({ id: r.id, url: r.url, ...res });
        console.log(`✗ ${r.id} (${res.status || res.error}) ${r.url}`);
      } else if (res.final && res.final.replace(/\/$/, '') !== r.url.replace(/\/$/, '')) {
        console.log(`↪ ${r.id} redirige a ${res.final}`);
      }
    }
  })
);

console.log(`\n${hechos} enlaces probados, ${fallos.length} con problemas.`);
if (fallos.length) {
  console.log('\nRevisa a mano los que fallaron: algunos sitios bloquean bots aunque funcionen en el navegador.');
  process.exitCode = 1;
}
