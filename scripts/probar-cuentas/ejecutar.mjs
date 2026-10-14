// Corre las pruebas de la API de cuentas. Requiere PHP_WASM_DIR (ver harness.mjs).
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

let fallos = 0;
for (const archivo of ['prueba-cuentas.mjs', 'prueba-github.mjs']) {
  console.log(`
== ${archivo}`);
  const r = spawnSync(process.execPath, [fileURLToPath(new URL(archivo, import.meta.url))], { stdio: 'inherit', env: process.env });
  if (r.status !== 0) fallos++;
}
process.exit(fallos ? 1 : 0);
