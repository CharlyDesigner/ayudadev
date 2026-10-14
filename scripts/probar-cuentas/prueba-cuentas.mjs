import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { crearPHP, Cliente, correos, vaciarCorreos, limpiarLimites } from './harness.mjs';

const API = fileURLToPath(new URL('../../public/api', import.meta.url));
let ok = 0, fallos = 0;
const t = (nombre, cond, extra) => { if (cond) ok++; else { fallos++; console.log('FALLA:', nombre, extra ?? ''); } };
const eq = (nombre, a, b) => t(nombre, JSON.stringify(a) === JSON.stringify(b), `esperado ${JSON.stringify(b)} y fue ${JSON.stringify(a)}`);

// TOTP en Node (RFC 6238, SHA-1)
const b32 = (s) => { const A = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'; let bits = ''; for (const c of s) bits += A.indexOf(c).toString(2).padStart(5, '0'); const out = []; for (let i = 0; i + 8 <= bits.length; i += 8) out.push(parseInt(bits.slice(i, i + 8), 2)); return Buffer.from(out); };
const totp = (secreto, delta = 0) => { const paso = Math.floor(Date.now() / 1000 / 30) + delta; const buf = Buffer.alloc(8); buf.writeBigUInt64BE(BigInt(paso)); const h = crypto.createHmac('sha1', b32(secreto)).update(buf).digest(); const o = h[19] & 15; const n = ((h[o] & 0x7f) << 24) | (h[o + 1] << 16) | (h[o + 2] << 8) | h[o + 3]; return String(n % 1e6).padStart(6, '0'); };

const php = await crearPHP(API);

// --- Vectores de RFC 6238 contra _totp.php (6 dígitos = últimos 6 de los de 8)
let r = await php.run({ code: `<?php require '/www/api/_totp.php';
$s='12345678901234567890';
foreach ([59=>'287082',1111111109=>'081804',1234567890=>'005924',2000000000=>'279037'] as $t=>$esp) echo ad_totp_codigo($s, intdiv($t,30))===$esp ? 'ok ' : 'MAL('.$t.') ';
echo ad_base32_decode(ad_base32_encode('hola mundo 123'))==='hola mundo 123' ? 'b32ok ' : 'b32MAL ';
echo ad_totp_verificar(ad_base32_encode($s),'287082',0,59)===1 ? 'ver1 ':'verMAL ';
echo ad_totp_verificar(ad_base32_encode($s),'287082',1,59)===null ? 'replay ':'replayMAL ';
echo ad_totp_verificar(ad_base32_encode($s),'287082',0,59+90)===null ? 'caduca ':'caducaMAL ';
echo ad_totp_verificar(ad_base32_encode($s),'287082',0,59+30)===1 ? 'ventana ':'ventanaMAL ';` });
console.log('TOTP:', r.text);
t('vectores RFC 6238', !r.text.includes('MAL'), r.text);

const c = new Cliente(php, '198.51.100.1');

// --- Básicos y protecciones
r = await c.get('estado'); eq('estado', [r.status, r.json.disponible, r.json.github], [200, true, false]);
t('Cache-Control no-store', /no-store/.test(r.headers['cache-control'] ?? ''));
r = await c.get('registro'); eq('GET a acción POST', r.status, 405);
r = await c.get('nada'); eq('acción inexistente', r.status, 404);
r = await c.peticion('PUT', 'cuenta.php', { consulta: 'a=registro' }); eq('PUT', r.status, 405);
r = await c.peticion('POST', 'cuenta.php', { consulta: 'a=entrar', headers: { 'content-type': 'application/x-www-form-urlencoded' }, origen: true }); eq('form clásico 415', r.status, 415);
r = await c.api('entrar', { email: 'a@b.co', clave: 'x' }, { origen: false }); eq('sin origen 403', r.status, 403);
r = await c.api('entrar', { email: 'a@b.co', clave: 'x' }, { headers: { origin: 'https://malo.example' }, origen: false }); eq('origen ajeno 403', r.status, 403);
r = await c.get('datos'); eq('datos sin sesión', r.status, 401);

// --- Registro
const EMAIL = 'ana@ejemplo.mx';
r = await c.api('registro', { email: 'no-es-correo', consentimiento: true }); eq('registro correo inválido', [r.status, r.json.code], [422, 'invalid']);
r = await c.api('registro', { email: EMAIL }); eq('registro sin consentimiento', [r.status, r.json.code], [422, 'consent']);
r = await c.api('registro', { email: EMAIL, consentimiento: true, website: 'bot' }); eq('honeypot finge éxito', [r.status, r.json.ok], [200, true]);
eq('honeypot no envía correo', correos(php).length, 0);
r = await c.api('registro', { email: EMAIL, consentimiento: true }); eq('registro ok', [r.status, r.json.code], [200, 'ok']);
let mails = correos(php);
eq('un correo de registro', mails.length, 1);
t('correo a la persona', mails[0].para === EMAIL);
const m = /registro\/\?t=([A-Za-z0-9_-]{43})/.exec(mails[0].texto);
t('enlace con token de 43 caracteres', !!m, mails[0].texto);
const tokenRegistro = m[1];
t('texto sin rayas largas', !/—/.test(mails[0].texto));
t('el token no está en claro en la base', !(php.readFileAsText('/home/u/ayudadev-data/cuentas.sqlite').includes(tokenRegistro)));

// completar
r = await c.api('completar', { t: 'x'.repeat(43), clave: 'UnaClaveLarga#2026' }); eq('token falso', [r.status, r.json.code], [400, 'token']);
r = await c.api('completar', { t: tokenRegistro, clave: 'corta' }); eq('clave corta', r.json.code, 'clave_corta');
r = await c.api('completar', { t: tokenRegistro, clave: 'password123' }); eq('clave común', r.json.code, 'clave_comun');
r = await c.api('completar', { t: tokenRegistro, clave: 'aaaaaaaaaaaa' }); eq('clave repetida', r.json.code, 'clave_comun');
r = await c.api('completar', { t: tokenRegistro, clave: 'ana@ejemplo.mx' }); eq('clave igual al correo', r.json.code, 'clave_correo');
r = await c.api('completar', { t: tokenRegistro, clave: 'UnaClaveLarga#2026', nombre: '<b>Ana</b>' }); eq('completar ok', [r.status, r.json.ok], [200, true]);
t('cookie __Host- segura', r.setCookie.some((x) => x.startsWith('__Host-ayudadev_sesion=') && /secure/i.test(x) && /httponly/i.test(x) && /samesite=lax/i.test(x) && /path=\//i.test(x) && !/domain=/i.test(x)), JSON.stringify(r.setCookie));
let csrf = r.json.csrf;
r = await c.api('completar', { t: tokenRegistro, clave: 'UnaClaveLarga#2026' }); eq('token de un solo uso', r.json.code, 'token');

r = await c.get('yo'); eq('yo', [r.status, r.json.usuario.email, r.json.usuario.nombre, r.json.usuario.tiene_clave, r.json.usuario.totp], [200, EMAIL, 'Ana', true, false]);
t('yo no filtra hashes', !/pass|hash|secreto/i.test(r.text));

// registro de un correo existente: no revela, manda aviso distinto
vaciarCorreos(php);
const c2 = new Cliente(php, '198.51.100.2');
r = await c2.api('registro', { email: EMAIL, consentimiento: true }); eq('registro de existente mismo resultado', [r.status, r.json.code], [200, 'ok']);
mails = correos(php); eq('aviso de cuenta existente', [mails.length, /Ya tienes una cuenta/.test(mails[0].texto)], [1, true]);

// --- Datos
r = await c.api('datos', { progreso: { add: ['guia:a'] } }, { origen: true }); eq('datos sin csrf', r.status, 403);
const H = () => ({ headers: { 'x-csrf-token': csrf } });
r = await c.api('datos', { progreso: { add: ['guia:a', 'guia:b', 'guia:a', '<script>', 'ruta:x:1'] }, favoritos: { add: ['recurso-1'] } }, H());
eq('datos add', [r.status, r.json.progreso, r.json.favoritos], [200, ['guia:a', 'guia:b', 'ruta:x:1'], ['recurso-1']]);
r = await c.api('datos', { progreso: { remove: ['guia:a'] }, favoritos: { add: ['recurso-2'], remove: ['nada'] } }, H());
eq('datos remove', [r.json.progreso, r.json.favoritos], [['guia:b', 'ruta:x:1'], ['recurso-1', 'recurso-2']]);
r = await c.get('datos'); eq('datos GET', r.json.progreso.length, 2);
const muchos = Array.from({ length: 2001 }, (_, i) => 'x' + i);
r = await c.api('datos', { favoritos: { add: muchos } }, H()); eq('tope por tipo', [r.status, r.json.code], [413, 'limite']);
r = await c.get('datos'); eq('tope no cambió nada', r.json.favoritos.length, 2);

// --- Salir y entrar
r = await c.api('salir', {}); eq('salir', r.json.ok, true);
eq('cookie borrada', Object.keys(c.cookies).length, 0);
r = await c.get('yo'); eq('sin sesión tras salir', r.status, 401);
r = await c.api('entrar', { email: EMAIL, clave: 'incorrecta-123' }); eq('entrar mal', [r.status, r.json.code], [401, 'credenciales']);
r = await c.api('entrar', { email: 'nadie@ejemplo.mx', clave: 'incorrecta-123' }); eq('entrar correo inexistente igual', [r.status, r.json.code], [401, 'credenciales']);
r = await c.api('entrar', { email: EMAIL.toUpperCase(), clave: 'UnaClaveLarga#2026' }); eq('entrar bien (mayúsculas)', [r.status, r.json.code], [200, 'ok']);
csrf = r.json.csrf;
r = await c.get('datos'); eq('datos persisten', r.json.progreso.length, 2);

// --- Cambiar contraseña
r = await c.api('clave_cambiar', { clave: 'mal', nueva: 'OtraClaveLarga#1' }, H()); eq('cambiar con clave mala', r.json.code, 'clave_incorrecta');
r = await c.api('clave_cambiar', { clave: 'UnaClaveLarga#2026', nueva: 'corta' }, H()); eq('cambiar a clave corta', r.json.code, 'clave_corta');

// --- Recuperación
vaciarCorreos(php);
const cR = new Cliente(php, '198.51.100.4');
r = await cR.api('recuperar', { email: 'nadie@ejemplo.mx' }); eq('recuperar inexistente', [r.status, r.json.code], [200, 'ok']);
eq('sin correo si no existe', correos(php).length, 0);
r = await cR.api('recuperar', { email: EMAIL }); eq('recuperar existente', [r.status, r.json.code], [200, 'ok']);
mails = correos(php); eq('correo de recuperación', mails.length, 1);
const tokenRec = /clave\/\?t=([A-Za-z0-9_-]{43})/.exec(mails[0].texto)[1];
r = await cR.api('restablecer', { t: tokenRec, clave: 'corta' }); eq('restablecer clave corta', r.json.code, 'clave_corta');
r = await cR.api('restablecer', { t: tokenRegistro, clave: 'NuevaClaveLarga#9' }); eq('token de otro propósito', r.json.code, 'token');
r = await cR.api('restablecer', { t: tokenRec, clave: 'NuevaClaveLarga#9' }); eq('restablecer ok', r.json.ok, true);
r = await cR.api('restablecer', { t: tokenRec, clave: 'NuevaClaveLarga#9' }); eq('restablecer una sola vez', r.json.code, 'token');
r = await c.get('yo'); eq('sesiones cerradas tras restablecer', r.status, 401);
mails = correos(php); t('aviso de cambio de contraseña', mails.some((x) => /Cambió la seguridad/.test(x.texto)));
r = await c.api('entrar', { email: EMAIL, clave: 'UnaClaveLarga#2026' }); eq('clave vieja ya no sirve', r.status, 401);
r = await c.api('entrar', { email: EMAIL, clave: 'NuevaClaveLarga#9' }); eq('clave nueva sirve', r.status, 200);
csrf = r.json.csrf;

// --- Límite de intentos por correo
const cF = new Cliente(php, '198.51.100.50');
let ultimo;
for (let i = 0; i < 10; i++) ultimo = await cF.api('entrar', { email: 'fuerza@ejemplo.mx', clave: 'intento-' + i + '-abc' });
eq('límite de intentos por correo', ultimo.status, 429);

// --- Doble factor
vaciarCorreos(php);
r = await c.api('tfa_iniciar', { clave: 'mal' }, H()); eq('2fa iniciar con clave mala', r.json.code, 'clave_incorrecta');
r = await c.api('tfa_activar', { codigo: '000000' }, H()); eq('2fa activar sin pendiente', r.json.code, 'sin_pendiente');
r = await c.api('tfa_iniciar', { clave: 'NuevaClaveLarga#9' }, H());
eq('2fa iniciar', [r.status, /^[A-Z2-7]{32}$/.test(r.json.secreto), r.json.uri.startsWith('otpauth://totp/AyudaDev%3Aana%40ejemplo.mx?secret=')], [200, true, true]);
const secreto = r.json.secreto;
t('el secreto no está en claro en la base', !php.readFileAsText('/home/u/ayudadev-data/cuentas.sqlite').includes(secreto));
r = await c.api('tfa_activar', { codigo: '123456' }, H()); eq('2fa activar código malo', r.json.code, 'codigo');
const codigoActivar = totp(secreto);
r = await c.api('tfa_activar', { codigo: codigoActivar }, H()); eq('2fa activar', [r.status, r.json.respaldo?.length], [200, 10]);
const respaldo = r.json.respaldo;
t('códigos de respaldo con formato', respaldo.every((x) => /^[A-Z2-7]{5}-[A-Z2-7]{5}$/.test(x)));
t('los códigos de respaldo no están en claro', !php.readFileAsText('/home/u/ayudadev-data/cuentas.sqlite').includes(respaldo[0].replace('-', '')));
r = await c.get('yo'); eq('yo con 2fa', [r.json.usuario.totp, r.json.usuario.respaldo], [true, 10]);

await c.api('salir', {});
r = await c.api('entrar', { email: EMAIL, clave: 'NuevaClaveLarga#9' });
eq('entrar pide código', [r.status, r.json.code, typeof r.json.reto, Object.keys(c.cookies).length], [200, 'totp', 'string', 0]);
const reto = r.json.reto;
r = await c.api('entrar_2fa', { reto: 'falso.falso', codigo: totp(secreto, 1) }); eq('reto falso', r.status, 401);
r = await c.api('entrar_2fa', { reto, codigo: '000000' }); eq('código malo', [r.status, r.json.code], [401, 'codigo']);
r = await c.api('entrar_2fa', { reto, codigo: codigoActivar }); eq('código ya usado en la activación', r.status, 401);
r = await c.api('entrar_2fa', { reto, codigo: totp(secreto, 1) }); eq('código siguiente sirve', [r.status, r.json.ok], [200, true]);
csrf = r.json.csrf;
await c.api('salir', {});
r = await c.api('entrar', { email: EMAIL, clave: 'NuevaClaveLarga#9' });
r = await c.api('entrar_2fa', { reto: r.json.reto, codigo: totp(secreto, 1) }); eq('el mismo código no se reutiliza', r.status, 401);
r = await c.api('entrar', { email: EMAIL, clave: 'NuevaClaveLarga#9' });
const reto2 = r.json.reto;
r = await c.api('entrar_2fa', { reto: reto2, codigo: respaldo[0].toLowerCase() }); eq('código de respaldo sirve', r.json.ok, true);
csrf = r.json.csrf;
await c.api('salir', {});
r = await c.api('entrar', { email: EMAIL, clave: 'NuevaClaveLarga#9' });
r = await c.api('entrar_2fa', { reto: r.json.reto, codigo: respaldo[0] }); eq('código de respaldo solo una vez', r.status, 401);
r = await c.api('entrar', { email: EMAIL, clave: 'NuevaClaveLarga#9' });
limpiarLimites(php);
r = await c.api('entrar', { email: EMAIL, clave: 'NuevaClaveLarga#9' });
r = await c.api('entrar_2fa', { reto: r.json.reto, codigo: respaldo[1] }); eq('otro respaldo sirve', r.json.ok, true);
csrf = r.json.csrf;
r = await c.get('yo'); eq('quedan 8 respaldos', r.json.usuario.respaldo, 8);
// regenerar respaldo / desactivar
r = await c.api('tfa_respaldo', { codigo: '111111' }, H()); eq('regenerar con código malo', r.status, 403);
r = await c.api('tfa_respaldo', { codigo: respaldo[2] }, H()); eq('regenerar con respaldo', [r.status, r.json.respaldo?.length], [200, 10]);
const nuevos = r.json.respaldo;
r = await c.api('tfa_desactivar', { clave: 'NuevaClaveLarga#9', codigo: respaldo[3] }, H()); eq('respaldo viejo ya no sirve', r.status, 403);
r = await c.api('tfa_desactivar', { clave: 'NuevaClaveLarga#9', codigo: nuevos[0] }, H()); eq('desactivar 2fa', r.json.ok, true);
r = await c.get('yo'); eq('2fa desactivado', [r.json.usuario.totp, r.json.usuario.respaldo], [false, 0]);
t('avisos por correo de seguridad', correos(php).filter((x) => /Cambió la seguridad/.test(x.texto)).length >= 3);

// --- Exportar y borrar
r = await c.get('exportar'); eq('exportar', [r.status, /attachment/.test(r.headers['content-disposition'] ?? ''), r.json.cuenta.correo, r.json.datos.progreso.length], [200, true, EMAIL, 2]);
t('exportar no filtra hashes', !/pass_hash|argon|\$2y\$|secreto/i.test(r.text));
r = await c.api('borrar', { clave: 'NuevaClaveLarga#9', confirmacion: 'borrar' }, H()); eq('borrar sin confirmar', r.json.code, 'confirmacion');
r = await c.api('borrar', { clave: 'mal', confirmacion: 'BORRAR' }, H()); eq('borrar con clave mala', r.json.code, 'clave_incorrecta');
r = await c.api('borrar', { clave: 'NuevaClaveLarga#9', confirmacion: 'BORRAR' }, H()); eq('borrar', r.json.ok, true);
r = await c.get('yo'); eq('sesión muerta tras borrar', r.status, 401);
r = await c.api('entrar', { email: EMAIL, clave: 'NuevaClaveLarga#9' }); eq('no se puede entrar tras borrar', r.status, 401);
const db = await php.run({ code: `<?php $d=new PDO('sqlite:/home/u/ayudadev-data/cuentas.sqlite'); foreach (['usuarios','sesiones','datos','respaldo','identidades'] as $t) echo $t,'=',$d->query("select count(*) from $t")->fetchColumn(),' ';` });
console.log('tablas tras borrar:', db.text);
t('cascada de borrado', /usuarios=0 sesiones=0 datos=0 respaldo=0/.test(db.text), db.text);
const ev = php.readFileAsText('/home/u/ayudadev-data/.cuentas-eventos.jsonl');
t('registro de eventos sin correos', !ev.includes('@') && ev.includes('cuenta_borrada'));

console.log(`\n${ok} bien, ${fallos} fallas`);
process.exit(fallos ? 1 : 0);
