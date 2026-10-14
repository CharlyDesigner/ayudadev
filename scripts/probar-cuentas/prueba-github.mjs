import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { crearPHP, Cliente, correos, vaciarCorreos, limpiarLimites } from './harness.mjs';

const API = fileURLToPath(new URL('../../public/api', import.meta.url));
let ok = 0, fallos = 0;
const t = (nombre, cond, extra) => { if (cond) ok++; else { fallos++; console.log('FALLA:', nombre, extra ?? ''); } };
const eq = (nombre, a, b) => t(nombre, JSON.stringify(a) === JSON.stringify(b), `esperado ${JSON.stringify(b)} y fue ${JSON.stringify(a)}`);
const b32 = (s) => { const A = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'; let bits = ''; for (const c of s) bits += A.indexOf(c).toString(2).padStart(5, '0'); const out = []; for (let i = 0; i + 8 <= bits.length; i += 8) out.push(parseInt(bits.slice(i, i + 8), 2)); return Buffer.from(out); };
const totp = (secreto, delta = 0) => { const paso = Math.floor(Date.now() / 1000 / 30) + delta; const buf = Buffer.alloc(8); buf.writeBigUInt64BE(BigInt(paso)); const h = crypto.createHmac('sha1', b32(secreto)).update(buf).digest(); const o = h[19] & 15; const n = ((h[o] & 0x7f) << 24) | (h[o + 1] << 16) | (h[o + 2] << 8) | h[o + 3]; return String(n % 1e6).padStart(6, '0'); };

const php = await crearPHP(API);
// Envoltorio de pruebas: sustituye las llamadas a GitHub por respuestas guardadas en /home/u/fake.json
php.writeFile('/www/api/gh-test.php', `<?php
$GLOBALS['AD_HTTP_FALSO'] = function (string $m, string $url, array $h, ?string $cuerpo) {
    $f = json_decode(file_get_contents('/home/u/fake.json'), true);
    file_put_contents('/home/u/ultima-llamada.json', json_encode(['m' => $m, 'url' => $url, 'h' => $h, 'cuerpo' => $cuerpo]), FILE_APPEND);
    foreach ($f as $parte => $resp) if (str_contains($url, $parte)) return $resp;
    return null;
};
require __DIR__ . '/cuenta-github.php';
`);
const fake = (o) => php.writeFile('/home/u/fake.json', JSON.stringify(o));
const perfil = (id, login, correos) => ({
  'login/oauth/access_token': { status: 200, json: { access_token: 'gho_falso', token_type: 'bearer' } },
  'api.github.com/user/emails': { status: 200, json: correos },
  'api.github.com/user': { status: 200, json: { id, login, name: 'Persona ' + login } },
});
const gh = (cli, consulta = '', opt = {}) => cli.peticion('GET', 'gh-test.php', { consulta, ...opt });
const hash = (loc) => (loc ?? '');

const c = new Cliente(php, '198.51.100.20');

// Sin configuración
let r = await gh(c);
eq('sin secretos redirige con error', [r.status, r.headers.location], [303, '/cuenta/?error=github_no']);
r = await c.get('estado'); eq('estado sin github', r.json.github, false);

// Configuración
php.mkdir('/home/u/ayudadev-data');
php.writeFile('/home/u/ayudadev-data/.cuentas.json', JSON.stringify({ github: { client_id: 'Iv1.abc123', client_secret: 'secreto-de-prueba' } }));
r = await c.get('estado'); eq('estado con github', r.json.github, true);

// POST no permitido
r = await c.peticion('POST', 'gh-test.php', { json: {} }); eq('POST rechazado', r.status, 405);

// Paso 1
r = await gh(c);
eq('paso 1 redirige a GitHub', [r.status, r.headers.location?.startsWith('https://github.com/login/oauth/authorize?')], [303, true]);
const url1 = new URL(r.headers.location);
eq('client_id', url1.searchParams.get('client_id'), 'Iv1.abc123');
eq('redirect_uri', url1.searchParams.get('redirect_uri'), 'https://dev.carlosnavarro.site/api/cuenta-github.php');
eq('scope', url1.searchParams.get('scope'), 'read:user user:email');
eq('PKCE S256', url1.searchParams.get('code_challenge_method'), 'S256');
t('código challenge y state presentes', !!url1.searchParams.get('code_challenge') && !!url1.searchParams.get('state'));
t('no filtra el client_secret', !r.headers.location.includes('secreto-de-prueba'));
const cookieOauth = r.setCookie.find((x) => x.startsWith('__Host-ayudadev_oauth='));
t('cookie oauth segura', /secure/i.test(cookieOauth) && /httponly/i.test(cookieOauth) && /samesite=lax/i.test(cookieOauth), cookieOauth);
const state1 = url1.searchParams.get('state');

// Retorno con state falso
r = await gh(c, 'code=abcdefghij1234&state=falso');
eq('state falso', r.headers.location, '/cuenta/?error=github_estado');
// Retorno sin cookie (otro navegador)
const otro = new Cliente(php, '198.51.100.21');
r = await gh(otro, 'code=abcdefghij1234&state=' + state1);
eq('sin cookie de oauth', r.headers.location, '/cuenta/?error=github_estado');

// Flujo nuevo: usuario nuevo con correo verificado
const nuevoFlujo = async (cli) => {
  const a = await gh(cli);
  return new URL(a.headers.location).searchParams.get('state');
};
limpiarLimites(php);
let st = await nuevoFlujo(c);
fake(perfil(1001, 'ana-gh', [{ email: 'Gh.Ana@Ejemplo.mx', primary: true, verified: true }, { email: 'otro@ejemplo.mx', primary: false, verified: true }]));
vaciarCorreos(php);
r = await gh(c, 'code=abcdefghij1234&state=' + st);
eq('usuario nuevo entra', [r.status, r.headers.location], [303, '/cuenta/?ok=entrada']);
t('cookie de sesión', Object.keys(c.cookies).includes('__Host-ayudadev_sesion'));
t('cookie oauth se borra', !Object.keys(c.cookies).includes('__Host-ayudadev_oauth'));
const llamadas = php.readFileAsText('/home/u/ultima-llamada.json');
t('el intercambio lleva code_verifier y secreto por POST', llamadas.includes('code_verifier') && llamadas.includes('client_secret') && llamadas.includes('"m":"POST"'));
r = await c.get('yo');
eq('yo tras GitHub', [r.json.usuario.email, r.json.usuario.tiene_clave, r.json.usuario.github, r.json.usuario.nombre], ['gh.ana@ejemplo.mx', false, 'ana-gh', 'Persona ana-gh']);
eq('sin correos por cuenta nueva con GitHub', correos(php).length, 0);

// El state no se reutiliza
r = await gh(c, 'code=abcdefghij1234&state=' + st);
eq('state de un solo uso', r.headers.location, '/cuenta/?error=github_estado');

// Segundo inicio con la misma identidad: entra a la misma cuenta
await c.api('salir', {});
limpiarLimites(php);
st = await nuevoFlujo(c);
r = await gh(c, 'code=abcdefghij1234&state=' + st);
eq('misma identidad entra', r.headers.location, '/cuenta/?ok=entrada');
r = await c.get('yo'); eq('misma cuenta', r.json.usuario.email, 'gh.ana@ejemplo.mx');

// GitHub-only: sin contraseña no se puede desvincular; puede crearla
const csrfDe = async () => (await c.get('yo')).json.csrf;
let csrf = await csrfDe();
const H = () => ({ headers: { 'x-csrf-token': csrf } });
r = await c.api('github_desvincular', {}, H()); eq('no desvincular sin contraseña', [r.status, r.json.code], [409, 'sin_clave']);
r = await c.api('clave_cambiar', { nueva: 'ClaveNuevaLarga#77' }, H()); eq('GitHub-only crea contraseña', r.json.ok, true);
r = await c.api('github_desvincular', { clave: 'mal' }, H()); eq('desvincular con clave mala', r.json.code, 'clave_incorrecta');
r = await c.api('github_desvincular', { clave: 'ClaveNuevaLarga#77' }, H()); eq('desvincular', r.json.ok, true);
r = await c.get('yo'); eq('sin GitHub', r.json.usuario.github, null);

// Cuenta existente con correo igual y verificado en GitHub: se vincula y avisa
await c.api('salir', {});
limpiarLimites(php);
st = await nuevoFlujo(c);
vaciarCorreos(php);
r = await gh(c, 'code=abcdefghij1234&state=' + st);
eq('se vincula a la cuenta por correo verificado', r.headers.location, '/cuenta/?ok=entrada');
r = await c.get('yo'); eq('misma cuenta y GitHub vinculado', [r.json.usuario.email, r.json.usuario.github, r.json.usuario.tiene_clave], ['gh.ana@ejemplo.mx', 'ana-gh', true]);
t('aviso de vinculación', correos(php).some((x) => /vinculamos a tu cuenta/.test(x.texto)));

// Correo no verificado o no primario: se rechaza
await c.api('salir', {});
limpiarLimites(php);
st = await nuevoFlujo(c);
fake(perfil(2002, 'sin-verificar', [{ email: 'x@ejemplo.mx', primary: true, verified: false }, { email: 'y@ejemplo.mx', primary: false, verified: true }]));
r = await gh(c, 'code=abcdefghij1234&state=' + st);
eq('correo no verificado', r.headers.location, '/cuenta/?error=github_sin_correo');
t('no hay sesión', !Object.keys(c.cookies).includes('__Host-ayudadev_sesion'));

// Usuario cancela en GitHub
st = await nuevoFlujo(c);
r = await gh(c, 'error=access_denied&state=' + st);
eq('cancelado', r.headers.location, '/cuenta/?error=github_cancelado');

// Falla del intercambio
st = await nuevoFlujo(c);
fake({ 'login/oauth/access_token': { status: 200, json: { error: 'bad_verification_code' } } });
r = await gh(c, 'code=abcdefghij1234&state=' + st);
eq('intercambio falla', r.headers.location, '/cuenta/?error=github_fallo');

// Con doble factor: pide código, el reto va en el fragmento
limpiarLimites(php);
fake(perfil(1001, 'ana-gh', [{ email: 'gh.ana@ejemplo.mx', primary: true, verified: true }]));
st = await nuevoFlujo(c);
await gh(c, 'code=abcdefghij1234&state=' + st);
csrf = await csrfDe();
r = await c.api('tfa_iniciar', { clave: 'ClaveNuevaLarga#77' }, H());
const secreto = r.json.secreto;
r = await c.api('tfa_activar', { codigo: totp(secreto) }, H()); eq('2fa activado', r.json.ok, true);
await c.api('salir', {});
limpiarLimites(php);
st = await nuevoFlujo(c);
r = await gh(c, 'code=abcdefghij1234&state=' + st);
const m = /^\/cuenta\/#reto=(.+)$/.exec(r.headers.location ?? '');
t('con 2FA redirige con reto en el fragmento', !!m, r.headers.location);
t('sin sesión hasta el código', !Object.keys(c.cookies).includes('__Host-ayudadev_sesion'));
r = await c.api('entrar_2fa', { reto: m[1], codigo: totp(secreto, 1) }); eq('el reto sirve con el código', r.json.ok, true);

// Vincular desde la cuenta abierta
const otra = new Cliente(php, '198.51.100.30');
vaciarCorreos(php);
let rr = await otra.api('registro', { email: 'luis@ejemplo.mx', consentimiento: true });
const tk = /registro\/\?t=([A-Za-z0-9_-]{43})/.exec(correos(php)[0].texto)[1];
rr = await otra.api('completar', { t: tk, clave: 'Vientos-Fuertes#2026' });
st = await nuevoFlujo(otra);
// sin ?vincular=1 sería inicio de sesión; con vincular=1 se liga a Luis
const a2 = await gh(otra, 'vincular=1');
const st2 = new URL(a2.headers.location).searchParams.get('state');
fake(perfil(1001, 'ana-gh', [{ email: 'gh.ana@ejemplo.mx', primary: true, verified: true }]));
rr = await gh(otra, 'code=abcdefghij1234&state=' + st2);
eq('no se vincula una identidad de otra persona', rr.headers.location, '/cuenta/?error=github_ocupado');
limpiarLimites(php);
const a3 = await gh(otra, 'vincular=1');
const st3 = new URL(a3.headers.location).searchParams.get('state');
fake(perfil(3003, 'luis-gh', [{ email: 'distinto@ejemplo.mx', primary: true, verified: true }]));
rr = await gh(otra, 'code=abcdefghij1234&state=' + st3);
eq('vincular desde la sesión', rr.headers.location, '/cuenta/?ok=github_vinculado');
rr = await otra.get('yo'); eq('Luis ahora tiene GitHub', [rr.json.usuario.email, rr.json.usuario.github], ['luis@ejemplo.mx', 'luis-gh']);

// Límite de peticiones
let ult;
for (let i = 0; i < 22; i++) ult = await gh(new Cliente(php, '198.51.100.99'));
eq('límite por IP', ult.headers.location, '/cuenta/?error=rate_limit');

console.log(`\n${ok} bien, ${fallos} fallas`);
process.exit(fallos ? 1 : 0);
