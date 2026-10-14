// Arnés de pruebas de la API de cuentas con PHP en WebAssembly (@php-wasm/node).
// El paquete NO es dependencia del proyecto: se instala aparte, fuera del repo, y se indica con PHP_WASM_DIR.
//   mkdir ~/php-wasm-pruebas && cd ~/php-wasm-pruebas && npm init -y && npm i @php-wasm/node @php-wasm/universal
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';

const dirPhp = process.env.PHP_WASM_DIR;
if (!dirPhp) {
  console.error('Define PHP_WASM_DIR con la carpeta donde instalaste @php-wasm/node y @php-wasm/universal.');
  process.exit(2);
}
const requerir = createRequire(path.join(path.resolve(dirPhp), 'package.json'));
const { loadNodeRuntime } = requerir('@php-wasm/node');
const { PHP } = requerir('@php-wasm/universal');

export const SITIO = 'https://dev.carlosnavarro.site';

export async function crearPHP(apiDir) {
  const id = await loadNodeRuntime('8.3', { emscriptenOptions: { processId: 1 } });
  const php = new PHP(id);
  php.mkdir('/www/api');
  php.mkdir('/home/u');
  php.mkdir('/mail');
  const copiar = (origen, destino) => {
    for (const e of fs.readdirSync(origen, { withFileTypes: true })) {
      if (e.name === '_data' || e.name === 'panel') continue;
      const o = path.join(origen, e.name), d = destino + '/' + e.name;
      if (e.isDirectory()) { php.mkdir(d); copiar(o, d); }
      else if (e.name.endsWith('.php')) php.writeFile(d, fs.readFileSync(o));
    }
  };
  copiar(apiDir, '/www/api');
  return php;
}

export class Cliente {
  constructor(php, ip = '203.0.113.10') { this.php = php; this.ip = ip; this.cookies = {}; this.env = {}; }
  async peticion(metodo, archivo, { consulta = '', json, headers = {}, origen = true, extraServer = {} } = {}) {
    const h = { ...headers };
    if (origen) h.origin = SITIO;
    let body;
    if (json !== undefined) { body = new TextEncoder().encode(JSON.stringify(json)); h['content-type'] = 'application/json'; }
    const cookie = Object.entries(this.cookies).map(([k, v]) => `${k}=${v}`).join('; ');
    if (cookie) h.cookie = cookie;
    const r = await this.php.run({
      scriptPath: `/www/api/${archivo}`,
      relativeUri: `/api/${archivo}${consulta ? '?' + consulta : ''}`,
      method: metodo, headers: h, body,
      env: { HOME: '/home/u', AYUDADEV_PRUEBA: '1', AYUDADEV_BUZON_PRUEBA: '/mail', ...this.env },
      $_SERVER: { REMOTE_ADDR: this.ip, HTTPS: 'on', DOCUMENT_ROOT: '/www', HTTP_USER_AGENT: 'prueba', ...extraServer },
    });
    const sc = r.headers['set-cookie'] || [];
    for (const linea of sc) {
      const [par, ...resto] = linea.split(';');
      const [k, ...v] = par.split('=');
      const valor = v.join('=');
      const caducada = /expires=Thu, 01 Jan 1970/i.test(linea) || /max-age=0/i.test(linea);
      if (caducada || valor === '') delete this.cookies[k.trim()]; else this.cookies[k.trim()] = valor;
    }
    let datos = null;
    try { datos = JSON.parse(r.text); } catch {}
    const cab = Object.fromEntries(Object.entries(r.headers).map(([k, v]) => [k, k === 'set-cookie' ? v : (Array.isArray(v) ? v[0] : v)]));
    return { status: r.httpStatusCode, headers: cab, text: r.text, json: datos, setCookie: sc, errores: r.errors };
  }
  api(accion, json, opt = {}) { return this.peticion('POST', 'cuenta.php', { consulta: 'a=' + accion, json, ...opt }); }
  get(accion, opt = {}) { return this.peticion('GET', 'cuenta.php', { consulta: 'a=' + accion, ...opt }); }
}

export function correos(php) {
  const lista = php.listFiles('/mail').sort();
  return lista.map((f) => JSON.parse(php.readFileAsText('/mail/' + f)));
}
export function vaciarCorreos(php) { for (const f of php.listFiles('/mail')) php.unlink('/mail/' + f); }

export function limpiarLimites(php, prefijo = 'ad_guard_') { for (const f of php.listFiles('/tmp')) if (f.startsWith(prefijo)) php.unlink('/tmp/' + f); }
