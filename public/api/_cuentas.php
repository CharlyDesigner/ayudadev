<?php
/**
 * Núcleo de las cuentas de AyudaDev: base SQLite, sesiones, contraseñas, tokens de correo,
 * doble factor y avisos. Este archivo se bloquea por completo desde .htaccess.
 *
 * Los datos viven en ~/ayudadev-data (fuera del web root cuando es posible):
 *   cuentas.sqlite        usuarios, sesiones, tokens y datos sincronizados
 *   .cuentas-clave        clave maestra autogenerada (pimienta, cifrado TOTP, firmas)
 *   .cuentas.json         secretos de OAuth de GitHub, los crea Carlos a mano (ver docs/CUENTAS.md)
 *   .cuentas-eventos.jsonl  registro de eventos de seguridad, sin correos
 */

declare(strict_types=1);

require_once __DIR__ . '/_newsletter.php';
require_once __DIR__ . '/_totp.php';

const AD_COOKIE_SESION = '__Host-ayudadev_sesion';
const AD_COOKIE_OAUTH = '__Host-ayudadev_oauth';
const AD_SESION_INACTIVIDAD = 1209600; // 14 días sin usarla
const AD_SESION_MAXIMA = 5184000;      // 60 días desde que se creó
const AD_VIGENCIA_REGISTRO = 86400;    // 24 h
const AD_VIGENCIA_RECUPERAR = 3600;    // 1 h
const AD_VIGENCIA_RETO = 300;          // 5 min para escribir el código del doble factor
const AD_MAX_ITEMS = 2000;             // por tipo y por cuenta
const AD_CLAVE_MIN = 10;
const AD_CLAVE_MAX = 200;
const AD_DATOS_TIPOS = ['progreso', 'favoritos'];

/** Modo de pruebas automáticas: lo activa solo el entorno del servidor, nunca una petición. */
function ad_cuenta_modo_prueba(): bool
{
    return getenv('AYUDADEV_PRUEBA') === '1';
}

/* ------------------------------------------------------------------ respuestas */

function ad_json_salir(bool $ok, string $code, int $status = 200, array $extra = []): never
{
    http_response_code($status);
    if ($status === 429) header('Retry-After: 900');
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode(['ok' => $ok, 'code' => $code] + $extra, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

/** Cuerpo JSON de un POST: exige application/json (los formularios de otros sitios no pueden enviarlo). */
function ad_json_entrada(int $maxBytes = 16384): array
{
    $contentType = strtolower((string) ($_SERVER['CONTENT_TYPE'] ?? ''));
    if (!str_starts_with($contentType, 'application/json')) ad_json_salir(false, 'content_type', 415);
    if (ad_request_too_large($maxBytes)) ad_json_salir(false, 'too_large', 413);
    $crudo = file_get_contents('php://input', false, null, 0, $maxBytes + 1);
    if ($crudo === false || strlen($crudo) > $maxBytes) ad_json_salir(false, 'too_large', 413);
    $datos = json_decode($crudo, true);
    if (!is_array($datos)) ad_json_salir(false, 'invalid', 400);
    return $datos;
}

/** Texto corto limpio (sin etiquetas ni caracteres de control). No sirve para contraseñas. */
function ad_dato_texto(array $d, string $clave, int $max = 200): string
{
    $v = $d[$clave] ?? '';
    if (!is_string($v)) return '';
    $v = strip_tags($v);
    $v = preg_replace('/[\x00-\x1F\x7F]/u', '', $v) ?? '';
    $v = trim($v);
    return function_exists('mb_substr') ? mb_substr($v, 0, $max) : substr($v, 0, $max);
}

/** La contraseña se toma tal cual, sin recortar ni limpiar. */
function ad_dato_clave(array $d, string $clave): string
{
    $v = $d[$clave] ?? '';
    return is_string($v) ? $v : '';
}

function ad_limite_o_salir(string $bucket, string $identidad, int $ventana, int $limite): void
{
    if (ad_rate_limited($bucket, $identidad, $ventana, $limite)) ad_json_salir(false, 'rate_limit', 429);
}

/**
 * Origen propio y trampas invisibles de bots. Devuelve true si es un bot (se le finge éxito).
 * No se mide el tiempo desde que se dibujó el formulario: el reloj del navegador puede ir desfasado.
 */
function ad_formulario_publico(array $d): bool
{
    if (!ad_is_same_origin()) ad_json_salir(false, 'security', 403);
    return ad_dato_texto($d, 'website') !== '' || ad_dato_texto($d, 'address_line_2') !== '';
}

function ad_correo_valido(string $email): bool
{
    if (strlen($email) > 160 || !filter_var($email, FILTER_VALIDATE_EMAIL)) return false;
    if (ad_cuenta_modo_prueba()) return true;
    $dominio = substr($email, strrpos($email, '@') + 1);
    if (function_exists('checkdnsrr') && !checkdnsrr($dominio, 'MX') && !checkdnsrr($dominio, 'A')) return false;
    return true;
}

/* --------------------------------------------------------------- configuración */

function ad_cuenta_config(): array
{
    static $config = null;
    if ($config !== null) return $config;
    $config = [];
    $archivo = ad_data_dir() . '/.cuentas.json';
    if (is_file($archivo)) {
        $datos = json_decode((string) @file_get_contents($archivo), true);
        if (is_array($datos)) $config = $datos;
    }
    return $config;
}

/** Credenciales de la OAuth App de GitHub, o null si Carlos aún no las ha puesto. */
function ad_github_config(): ?array
{
    $g = ad_cuenta_config()['github'] ?? null;
    if (!is_array($g)) return null;
    $id = (string) ($g['client_id'] ?? '');
    $secreto = (string) ($g['client_secret'] ?? '');
    return ($id !== '' && $secreto !== '') ? ['client_id' => $id, 'client_secret' => $secreto] : null;
}

/** Clave derivada por propósito a partir de la clave maestra. 32 bytes binarios. */
function ad_cuenta_clave(string $proposito): string
{
    static $maestra = null;
    if ($maestra === null) {
        $archivo = ad_data_dir() . '/.cuentas-clave';
        $hex = is_file($archivo) ? trim((string) @file_get_contents($archivo)) : '';
        if (!preg_match('/^[a-f0-9]{64}$/', $hex)) {
            $nuevo = bin2hex(random_bytes(32));
            // 'x' falla si otra petición la creó un instante antes; entonces se lee la suya.
            $fh = @fopen($archivo, 'x');
            if ($fh !== false) {
                fwrite($fh, $nuevo);
                fclose($fh);
                @chmod($archivo, 0600);
            }
            $hex = trim((string) @file_get_contents($archivo));
        }
        $bin = preg_match('/^[a-f0-9]{64}$/', $hex) ? hex2bin($hex) : false;
        if ($bin === false) throw new RuntimeException('sin clave maestra');
        $maestra = $bin;
    }
    return hash_hmac('sha256', $proposito, $maestra, true);
}

/* -------------------------------------------------------------------- base SQLite */

function ad_db(): ?PDO
{
    static $pdo = null;
    static $intentado = false;
    if ($intentado) return $pdo;
    $intentado = true;
    if (!extension_loaded('pdo_sqlite') || !extension_loaded('openssl')) return null;
    try {
        $dir = ad_data_dir();
        if ($dir === sys_get_temp_dir()) return null; // sin carpeta propia no hay cuentas
        ad_cuenta_clave('prueba');
        $archivo = $dir . '/cuentas.sqlite';
        $nuevo = !is_file($archivo);
        $pdo = new PDO('sqlite:' . $archivo, null, null, [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        ]);
        if ($nuevo) @chmod($archivo, 0600);
        $pdo->exec('PRAGMA foreign_keys = ON');
        $pdo->exec('PRAGMA busy_timeout = 5000');
        ad_db_migrar($pdo);
    } catch (Throwable) {
        $pdo = null;
    }
    return $pdo;
}

function ad_db_migrar(PDO $db): void
{
    $version = (int) $db->query('PRAGMA user_version')->fetchColumn();
    if ($version >= 1) return;
    $db->beginTransaction();
    $db->exec('CREATE TABLE IF NOT EXISTS usuarios (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        email TEXT NOT NULL UNIQUE COLLATE NOCASE,
        nombre TEXT NOT NULL DEFAULT \'\',
        pass_hash TEXT,
        creado_en INTEGER NOT NULL,
        ultimo_acceso INTEGER,
        totp_secreto TEXT,
        totp_pendiente TEXT,
        totp_activo INTEGER NOT NULL DEFAULT 0,
        totp_ultimo_paso INTEGER NOT NULL DEFAULT 0
    )');
    $db->exec('CREATE TABLE IF NOT EXISTS identidades (
        proveedor TEXT NOT NULL,
        externo TEXT NOT NULL,
        usuario_id INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
        login TEXT NOT NULL DEFAULT \'\',
        creado_en INTEGER NOT NULL,
        PRIMARY KEY (proveedor, externo)
    )');
    $db->exec('CREATE INDEX IF NOT EXISTS identidades_usuario ON identidades(usuario_id)');
    $db->exec('CREATE TABLE IF NOT EXISTS sesiones (
        id_hash TEXT PRIMARY KEY,
        usuario_id INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
        csrf TEXT NOT NULL,
        creado_en INTEGER NOT NULL,
        ultimo_uso INTEGER NOT NULL,
        expira_en INTEGER NOT NULL,
        ip_hash TEXT NOT NULL,
        ua_hash TEXT NOT NULL
    )');
    $db->exec('CREATE INDEX IF NOT EXISTS sesiones_usuario ON sesiones(usuario_id)');
    $db->exec('CREATE TABLE IF NOT EXISTS tokens (
        hash TEXT PRIMARY KEY,
        proposito TEXT NOT NULL,
        email TEXT NOT NULL COLLATE NOCASE,
        creado_en INTEGER NOT NULL,
        expira_en INTEGER NOT NULL
    )');
    $db->exec('CREATE INDEX IF NOT EXISTS tokens_email ON tokens(proposito, email)');
    $db->exec('CREATE TABLE IF NOT EXISTS respaldo (
        usuario_id INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
        hash TEXT NOT NULL,
        PRIMARY KEY (usuario_id, hash)
    )');
    $db->exec('CREATE TABLE IF NOT EXISTS datos (
        usuario_id INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
        tipo TEXT NOT NULL,
        item TEXT NOT NULL,
        creado_en INTEGER NOT NULL,
        PRIMARY KEY (usuario_id, tipo, item)
    )');
    $db->exec('PRAGMA user_version = 1');
    $db->commit();
}

/** Limpieza barata de lo caducado; se llama al azar desde las rutas de entrada. */
function ad_cuenta_limpiar(PDO $db): void
{
    $ahora = time();
    $db->prepare('DELETE FROM sesiones WHERE expira_en < ?')->execute([$ahora]);
    $db->prepare('DELETE FROM tokens WHERE expira_en < ?')->execute([$ahora]);
}

function ad_cuenta_evento(string $tipo, ?int $uid = null): void
{
    $fila = ['ts' => gmdate('c'), 'tipo' => $tipo, 'ip' => substr(hash('sha256', ad_client_ip()), 0, 16)];
    if ($uid !== null) $fila['u'] = $uid;
    $archivo = ad_data_dir() . '/.cuentas-eventos.jsonl';
    if (is_file($archivo) && (int) @filesize($archivo) > 524288) @rename($archivo, ad_data_dir() . '/.cuentas-eventos.1.jsonl');
    @file_put_contents($archivo, json_encode($fila) . "\n", FILE_APPEND | LOCK_EX);
    @chmod($archivo, 0600);
}

/* ----------------------------------------------------------------- contraseñas */

const AD_CLAVES_COMUNES = [
    'password', 'password1', 'password123', '1234567890', '12345678910', '0123456789', 'qwertyuiop', 'qwerty12345',
    'contraseña', 'contrasena', 'contraseña1', 'contrasena1', 'contrasena123', 'iloveyou123', 'abc1234567', 'admin12345',
    'letmein1234', 'welcome1234', 'monkey12345', 'ayudadev123', 'ayudadev1234', 'mexico12345', 'carlos12345',
];

/** Devuelve '' si la contraseña sirve, o el código del problema. */
function ad_clave_problema(string $clave, string $email = ''): string
{
    $largo = function_exists('mb_strlen') ? mb_strlen($clave) : strlen($clave);
    if ($largo < AD_CLAVE_MIN) return 'clave_corta';
    if ($largo > AD_CLAVE_MAX) return 'clave_larga';
    $minuscula = function_exists('mb_strtolower') ? mb_strtolower($clave) : strtolower($clave);
    if (in_array($minuscula, AD_CLAVES_COMUNES, true) || count(array_unique(preg_split('//u', $clave, -1, PREG_SPLIT_NO_EMPTY) ?: [])) < 4) return 'clave_comun';
    $local = strtolower(strstr($email, '@', true) ?: '');
    if ($email !== '' && (strtolower($clave) === strtolower($email) || (strlen($local) >= 4 && str_contains($minuscula, $local)))) return 'clave_correo';
    return '';
}

/** La pimienta se aplica antes del hash: una base filtrada sin la clave del servidor no permite probar contraseñas. */
function ad_clave_preparar(string $clave): string
{
    return base64_encode(hash_hmac('sha256', $clave, ad_cuenta_clave('pimienta'), true));
}

function ad_clave_hash(string $clave): string
{
    $preparada = ad_clave_preparar($clave);
    if (defined('PASSWORD_ARGON2ID')) {
        return password_hash($preparada, PASSWORD_ARGON2ID, ['memory_cost' => 19456, 'time_cost' => 2, 'threads' => 1]);
    }
    return password_hash($preparada, PASSWORD_BCRYPT, ['cost' => 12]);
}

function ad_clave_verificar(string $clave, ?string $hash): bool
{
    if ($hash === null || $hash === '') return false;
    return password_verify(ad_clave_preparar($clave), $hash);
}

function ad_clave_necesita_rehash(string $hash): bool
{
    if (defined('PASSWORD_ARGON2ID')) return password_needs_rehash($hash, PASSWORD_ARGON2ID, ['memory_cost' => 19456, 'time_cost' => 2, 'threads' => 1]);
    return password_needs_rehash($hash, PASSWORD_BCRYPT, ['cost' => 12]);
}

/** Gasta el mismo tiempo que una verificación real, para que no se note si el correo existe. */
function ad_clave_simular(string $clave): void
{
    static $falso = null;
    $falso ??= ad_clave_hash(bin2hex(random_bytes(8)));
    ad_clave_verificar($clave, $falso);
}

/* ------------------------------------------------------------------ usuarios */

function ad_usuario_por_email(PDO $db, string $email): ?array
{
    $st = $db->prepare('SELECT * FROM usuarios WHERE email = ?');
    $st->execute([strtolower($email)]);
    $fila = $st->fetch();
    return is_array($fila) ? $fila : null;
}

function ad_usuario_por_id(PDO $db, int $id): ?array
{
    $st = $db->prepare('SELECT * FROM usuarios WHERE id = ?');
    $st->execute([$id]);
    $fila = $st->fetch();
    return is_array($fila) ? $fila : null;
}

function ad_usuario_publico(PDO $db, array $u): array
{
    $st = $db->prepare('SELECT login FROM identidades WHERE usuario_id = ? AND proveedor = \'github\'');
    $st->execute([$u['id']]);
    $github = $st->fetchColumn();
    $st = $db->prepare('SELECT COUNT(*) FROM respaldo WHERE usuario_id = ?');
    $st->execute([$u['id']]);
    return [
        'email' => $u['email'],
        'nombre' => $u['nombre'],
        'tiene_clave' => $u['pass_hash'] !== null && $u['pass_hash'] !== '',
        'totp' => (int) $u['totp_activo'] === 1,
        'respaldo' => (int) $st->fetchColumn(),
        'github' => $github === false ? null : (string) $github,
        'desde' => (int) $u['creado_en'],
    ];
}

/* ------------------------------------------------------------------- sesiones */

function ad_cookie(string $nombre, string $valor, int $expira): void
{
    setcookie($nombre, $valor, [
        'expires' => $expira,
        'path' => '/',
        'secure' => true,
        'httponly' => true,
        'samesite' => 'Lax',
    ]);
}

/** Abre una sesión nueva (y cierra la que hubiera en esta cookie). Devuelve el token CSRF. */
function ad_sesion_crear(PDO $db, int $uid): string
{
    $anterior = (string) ($_COOKIE[AD_COOKIE_SESION] ?? '');
    if (preg_match('/^[a-f0-9]{64}$/', $anterior)) {
        $db->prepare('DELETE FROM sesiones WHERE id_hash = ?')->execute([hash('sha256', $anterior)]);
    }
    $token = bin2hex(random_bytes(32));
    $csrf = bin2hex(random_bytes(16));
    $ahora = time();
    $db->prepare('INSERT INTO sesiones (id_hash, usuario_id, csrf, creado_en, ultimo_uso, expira_en, ip_hash, ua_hash) VALUES (?,?,?,?,?,?,?,?)')
        ->execute([
            hash('sha256', $token), $uid, $csrf, $ahora, $ahora, $ahora + AD_SESION_INACTIVIDAD,
            hash('sha256', ad_client_ip()), hash('sha256', (string) ($_SERVER['HTTP_USER_AGENT'] ?? '')),
        ]);
    $db->prepare('UPDATE usuarios SET ultimo_acceso = ? WHERE id = ?')->execute([$ahora, $uid]);
    ad_cookie(AD_COOKIE_SESION, $token, $ahora + AD_SESION_MAXIMA);
    if (random_int(1, 40) === 1) ad_cuenta_limpiar($db);
    return $csrf;
}

/** @return array{hash:string,csrf:string,usuario:array}|null */
function ad_sesion_actual(PDO $db): ?array
{
    $token = (string) ($_COOKIE[AD_COOKIE_SESION] ?? '');
    if (!preg_match('/^[a-f0-9]{64}$/', $token)) return null;
    $hash = hash('sha256', $token);
    $ahora = time();
    $st = $db->prepare('SELECT * FROM sesiones WHERE id_hash = ? AND expira_en > ?');
    $st->execute([$hash, $ahora]);
    $sesion = $st->fetch();
    if (!is_array($sesion)) return null;
    $usuario = ad_usuario_por_id($db, (int) $sesion['usuario_id']);
    if ($usuario === null) return null;
    if ($ahora - (int) $sesion['ultimo_uso'] > 300) {
        $expira = min((int) $sesion['creado_en'] + AD_SESION_MAXIMA, $ahora + AD_SESION_INACTIVIDAD);
        $db->prepare('UPDATE sesiones SET ultimo_uso = ?, expira_en = ? WHERE id_hash = ?')->execute([$ahora, $expira, $hash]);
    }
    return ['hash' => $hash, 'csrf' => (string) $sesion['csrf'], 'usuario' => $usuario];
}

/** Sesión obligatoria; en cambios exige además el token CSRF de la sesión. */
function ad_sesion_exigir(PDO $db, bool $cambia): array
{
    $sesion = ad_sesion_actual($db);
    if ($sesion === null) ad_json_salir(false, 'sin_sesion', 401);
    if ($cambia) {
        $enviado = (string) ($_SERVER['HTTP_X_CSRF_TOKEN'] ?? '');
        if (!hash_equals($sesion['csrf'], $enviado)) ad_json_salir(false, 'security', 403);
    }
    return $sesion;
}

function ad_sesion_cerrar(PDO $db): void
{
    $token = (string) ($_COOKIE[AD_COOKIE_SESION] ?? '');
    if (preg_match('/^[a-f0-9]{64}$/', $token)) {
        $db->prepare('DELETE FROM sesiones WHERE id_hash = ?')->execute([hash('sha256', $token)]);
    }
    ad_cookie(AD_COOKIE_SESION, '', 1);
}

/** Cierra todas las sesiones de la cuenta salvo (opcionalmente) la actual. */
function ad_sesiones_cerrar_otras(PDO $db, int $uid, string $conservar = ''): void
{
    $db->prepare('DELETE FROM sesiones WHERE usuario_id = ? AND id_hash != ?')->execute([$uid, $conservar]);
}

/* ------------------------------------------------------ tokens de un solo uso */

/** Crea un token y devuelve el valor para el enlace; en la base solo queda su SHA-256. Reemplaza al anterior del mismo correo y propósito. */
function ad_token_crear(PDO $db, string $proposito, string $email, int $vigencia): string
{
    $email = strtolower($email);
    $db->prepare('DELETE FROM tokens WHERE proposito = ? AND email = ?')->execute([$proposito, $email]);
    $crudo = ad_b64url(random_bytes(32));
    $ahora = time();
    $db->prepare('INSERT INTO tokens (hash, proposito, email, creado_en, expira_en) VALUES (?,?,?,?,?)')
        ->execute([hash('sha256', $crudo), $proposito, $email, $ahora, $ahora + $vigencia]);
    return $crudo;
}

/** Lee el token sin gastarlo. Devuelve el correo al que pertenece, o null. */
function ad_token_leer(PDO $db, string $proposito, string $crudo): ?string
{
    if (!preg_match('/^[A-Za-z0-9_-]{43}$/', $crudo)) return null;
    $st = $db->prepare('SELECT email FROM tokens WHERE hash = ? AND proposito = ? AND expira_en > ?');
    $st->execute([hash('sha256', $crudo), $proposito, time()]);
    $email = $st->fetchColumn();
    return $email === false ? null : (string) $email;
}

function ad_token_gastar(PDO $db, string $crudo): bool
{
    $st = $db->prepare('DELETE FROM tokens WHERE hash = ?');
    $st->execute([hash('sha256', $crudo)]);
    return $st->rowCount() === 1;
}

/* -------------------------------------------- reto del segundo paso (doble factor) */

/** Prueba firmada y de corta vida de que la contraseña (o GitHub) ya pasó; falta el código TOTP. */
function ad_reto_crear(int $uid): string
{
    $carga = ad_b64url((string) json_encode(['u' => $uid, 'e' => time() + AD_VIGENCIA_RETO, 'n' => bin2hex(random_bytes(4))]));
    return $carga . '.' . ad_b64url(hash_hmac('sha256', $carga, ad_cuenta_clave('reto'), true));
}

function ad_reto_leer(string $reto): ?int
{
    $partes = explode('.', $reto);
    if (count($partes) !== 2) return null;
    $esperada = ad_b64url(hash_hmac('sha256', $partes[0], ad_cuenta_clave('reto'), true));
    if (!hash_equals($esperada, $partes[1])) return null;
    $carga = json_decode(ad_b64url_decode($partes[0]), true);
    if (!is_array($carga) || (int) ($carga['e'] ?? 0) < time()) return null;
    return (int) ($carga['u'] ?? 0) ?: null;
}

/* --------------------------------------------------------------- doble factor */

function ad_cifrar(string $claro, string $contexto): string
{
    $iv = random_bytes(12);
    $cifrado = openssl_encrypt($claro, 'aes-256-gcm', ad_cuenta_clave('cifrado'), OPENSSL_RAW_DATA, $iv, $etiqueta, $contexto, 16);
    if ($cifrado === false) throw new RuntimeException('no se pudo cifrar');
    return ad_b64url($iv . $etiqueta . $cifrado);
}

function ad_descifrar(string $paquete, string $contexto): ?string
{
    $bin = ad_b64url_decode($paquete);
    if (strlen($bin) < 29) return null;
    $claro = openssl_decrypt(substr($bin, 28), 'aes-256-gcm', ad_cuenta_clave('cifrado'), OPENSSL_RAW_DATA, substr($bin, 0, 12), substr($bin, 12, 16), $contexto);
    return $claro === false ? null : $claro;
}

function ad_respaldo_hash(string $codigo): string
{
    return hash_hmac('sha256', ad_codigo_respaldo_normalizar($codigo), ad_cuenta_clave('respaldo'));
}

/** Genera 10 códigos nuevos, reemplaza los anteriores y devuelve los códigos en claro (solo se muestran una vez). */
function ad_respaldo_regenerar(PDO $db, int $uid): array
{
    $codigos = ad_codigos_respaldo_nuevos(10);
    $db->beginTransaction();
    $db->prepare('DELETE FROM respaldo WHERE usuario_id = ?')->execute([$uid]);
    $insertar = $db->prepare('INSERT INTO respaldo (usuario_id, hash) VALUES (?, ?)');
    foreach ($codigos as $c) $insertar->execute([$uid, ad_respaldo_hash($c)]);
    $db->commit();
    return $codigos;
}

/** Acepta un código TOTP (una sola vez por paso) o un código de respaldo (se gasta). */
function ad_segundo_factor_ok(PDO $db, array $u, string $codigo): bool
{
    if ((int) $u['totp_activo'] !== 1 || !is_string($u['totp_secreto'])) return false;
    $codigo = trim($codigo);
    if (preg_match('/^\d{3}\s?\d{3}$/', $codigo)) {
        $secreto = ad_descifrar($u['totp_secreto'], 'totp:' . $u['id']);
        if ($secreto === null) return false;
        $paso = ad_totp_verificar($secreto, $codigo, (int) $u['totp_ultimo_paso']);
        if ($paso === null) return false;
        $st = $db->prepare('UPDATE usuarios SET totp_ultimo_paso = ? WHERE id = ? AND totp_ultimo_paso < ?');
        $st->execute([$paso, $u['id'], $paso]);
        return $st->rowCount() === 1;
    }
    $normalizado = ad_codigo_respaldo_normalizar($codigo);
    if (!preg_match('/^[A-Z2-7]{10}$/', $normalizado)) return false;
    $st = $db->prepare('DELETE FROM respaldo WHERE usuario_id = ? AND hash = ?');
    $st->execute([$u['id'], ad_respaldo_hash($normalizado)]);
    return $st->rowCount() === 1;
}

/* ------------------------------------------------------------- datos sincronizados */

function ad_dato_id_valido(mixed $id): bool
{
    return is_string($id) && (bool) preg_match('/^[A-Za-z0-9][A-Za-z0-9:_.\/@+-]{0,159}$/', $id);
}

/** @return array<string,string[]> */
function ad_datos_leer(PDO $db, int $uid): array
{
    $salida = array_fill_keys(AD_DATOS_TIPOS, []);
    $st = $db->prepare('SELECT tipo, item FROM datos WHERE usuario_id = ? ORDER BY creado_en, item');
    $st->execute([$uid]);
    foreach ($st->fetchAll() as $fila) {
        if (isset($salida[$fila['tipo']])) $salida[$fila['tipo']][] = (string) $fila['item'];
    }
    return $salida;
}

/** Aplica altas y bajas de un tipo. Devuelve false si se pasaría del tope por cuenta (no cambia nada). */
function ad_datos_aplicar(PDO $db, int $uid, string $tipo, array $altas, array $bajas): bool
{
    if (!in_array($tipo, AD_DATOS_TIPOS, true)) return false;
    $db->beginTransaction();
    try {
        $borrar = $db->prepare('DELETE FROM datos WHERE usuario_id = ? AND tipo = ? AND item = ?');
        foreach ($bajas as $id) $borrar->execute([$uid, $tipo, $id]);
        $insertar = $db->prepare('INSERT OR IGNORE INTO datos (usuario_id, tipo, item, creado_en) VALUES (?,?,?,?)');
        $ahora = time();
        foreach ($altas as $id) $insertar->execute([$uid, $tipo, $id, $ahora]);
        $st = $db->prepare('SELECT COUNT(*) FROM datos WHERE usuario_id = ? AND tipo = ?');
        $st->execute([$uid, $tipo]);
        if ((int) $st->fetchColumn() > AD_MAX_ITEMS) {
            $db->rollBack();
            return false;
        }
        $db->commit();
        return true;
    } catch (Throwable $e) {
        if ($db->inTransaction()) $db->rollBack();
        throw $e;
    }
}

/* ----------------------------------------------------------------------- correo */

/** Envío de correos transaccionales. Sin cabeceras de baja: no son boletín. */
function ad_cuenta_mail(string $para, string $asunto, string $texto, string $html): bool
{
    $buzon = getenv('AYUDADEV_BUZON_PRUEBA');
    if (ad_cuenta_modo_prueba() && is_string($buzon) && $buzon !== '' && is_dir($buzon)) {
        $nombre = $buzon . '/' . sprintf('%.6f', microtime(true)) . '-' . bin2hex(random_bytes(3)) . '.json';
        return file_put_contents($nombre, json_encode(['para' => $para, 'asunto' => $asunto, 'texto' => $texto], JSON_UNESCAPED_UNICODE)) !== false;
    }
    $limite = 'ayudadev-' . bin2hex(random_bytes(8));
    $cabeceras = [
        'From: ' . AD_SITE_NAME . ' <' . AD_FROM_EMAIL . '>',
        'MIME-Version: 1.0',
        'X-Mailer: AyudaDev-Web',
        'Auto-Submitted: auto-generated',
        'Content-Type: multipart/alternative; boundary="' . $limite . '"',
    ];
    $parte = static fn(string $tipo, string $contenido): string =>
        "--$limite\r\nContent-Type: $tipo; charset=UTF-8\r\nContent-Transfer-Encoding: quoted-printable\r\n\r\n"
        . quoted_printable_encode($contenido) . "\r\n";
    $mensaje = $parte('text/plain', $texto) . $parte('text/html', $html) . "--$limite--\r\n";
    $enviado = @mail($para, '=?UTF-8?B?' . base64_encode($asunto) . '?=', $mensaje, implode("\r\n", $cabeceras), '-f' . AD_FROM_EMAIL);
    if (!$enviado) @file_put_contents(ad_data_dir() . '/.mail-errors.log', gmdate('c') . " fallo al enviar correo de cuenta\n", FILE_APPEND | LOCK_EX);
    return $enviado;
}

/** @param string[] $parrafos */
function ad_cuenta_correo(string $para, string $asunto, string $titulo, array $parrafos, string $boton, string $url, string $nota): bool
{
    $texto = $titulo . "\n\n" . implode("\n\n", $parrafos) . "\n\n" . $boton . ": " . $url . "\n\n" . $nota . "\n\n--\n" . AD_SITE_NAME . ' · ' . AD_SITE_URL . "\n";
    return ad_cuenta_mail($para, $asunto, $texto, ad_plantilla_correo($titulo, $parrafos, $boton, $url, $nota));
}

/** Aviso cuando cambia algo de la seguridad de la cuenta. Si falla el envío, no se detiene la acción. */
function ad_cuenta_aviso(string $email, string $queOcurrio): void
{
    ad_cuenta_correo(
        $email,
        'Cambió la seguridad de tu cuenta en ' . AD_SITE_NAME,
        'Cambió la seguridad de tu cuenta',
        ['Hola,', $queOcurrio, 'Si fuiste tú, no tienes que hacer nada. Si no reconoces este cambio, restablece tu contraseña cuanto antes y escríbenos.'],
        'Revisar mi cuenta',
        AD_SITE_URL . '/cuenta/',
        'Te enviamos este aviso automáticamente para cuidar tu cuenta.'
    );
}
