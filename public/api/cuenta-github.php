<?php
/**
 * Inicio de sesión (y vinculación) con GitHub, flujo web de OAuth con state y PKCE.
 *
 *   GET /api/cuenta-github.php                 manda a GitHub (con ?vincular=1 vincula la cuenta ya abierta)
 *   GET /api/cuenta-github.php?code=..&state=  retorno de GitHub: valida, abre sesión y vuelve a /cuenta/
 *
 * Callback registrado en la OAuth App: https://dev.carlosnavarro.site/api/cuenta-github.php
 * Los secretos viven en ~/ayudadev-data/.cuentas.json. El token de acceso se usa y se descarta.
 */

declare(strict_types=1);

require __DIR__ . '/_cuentas.php';

ad_api_headers();
header('Referrer-Policy: no-referrer');

const AD_GH_CALLBACK = AD_SITE_URL . '/api/cuenta-github.php';

function ad_gh_volver(string $destino): never
{
    header('Location: ' . $destino, true, 303);
    exit;
}

function ad_gh_error(string $codigo): never
{
    ad_cookie(AD_COOKIE_OAUTH, '', 1);
    ad_gh_volver('/cuenta/?error=' . rawurlencode($codigo));
}

/** Petición HTTPS a GitHub. En pruebas automáticas se puede sustituir por una función falsa. */
function ad_gh_http(string $metodo, string $url, array $cabeceras, ?string $cuerpo = null): ?array
{
    if (ad_cuenta_modo_prueba() && isset($GLOBALS['AD_HTTP_FALSO']) && is_callable($GLOBALS['AD_HTTP_FALSO'])) {
        return ($GLOBALS['AD_HTTP_FALSO'])($metodo, $url, $cabeceras, $cuerpo);
    }
    if (!str_starts_with($url, 'https://')) return null;
    $cabeceras[] = 'User-Agent: AyudaDev';
    if (function_exists('curl_init')) {
        $ch = curl_init($url);
        curl_setopt_array($ch, [
            CURLOPT_CUSTOMREQUEST => $metodo,
            CURLOPT_HTTPHEADER => $cabeceras,
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_TIMEOUT => 10,
            CURLOPT_CONNECTTIMEOUT => 5,
            CURLOPT_FOLLOWLOCATION => false,
        ]);
        if ($cuerpo !== null) curl_setopt($ch, CURLOPT_POSTFIELDS, $cuerpo);
        $crudo = curl_exec($ch);
        $estado = (int) curl_getinfo($ch, CURLINFO_RESPONSE_CODE);
        curl_close($ch);
    } else {
        $contexto = stream_context_create(['http' => [
            'method' => $metodo,
            'header' => implode("\r\n", $cabeceras),
            'content' => $cuerpo ?? '',
            'timeout' => 10,
            'ignore_errors' => true,
            'follow_location' => 0,
        ]]);
        $crudo = @file_get_contents($url, false, $contexto);
        $estado = 0;
        foreach ($http_response_header ?? [] as $linea) {
            if (preg_match('#^HTTP/\S+\s+(\d{3})#', $linea, $m)) $estado = (int) $m[1];
        }
    }
    if ($crudo === false || $crudo === '') return null;
    $json = json_decode((string) $crudo, true);
    return ['status' => $estado, 'json' => is_array($json) ? $json : null];
}

function ad_gh_firmar(array $carga): string
{
    $texto = ad_b64url((string) json_encode($carga));
    return $texto . '.' . ad_b64url(hash_hmac('sha256', $texto, ad_cuenta_clave('oauth'), true));
}

function ad_gh_leer_firma(string $valor): ?array
{
    $partes = explode('.', $valor);
    if (count($partes) !== 2) return null;
    if (!hash_equals(ad_b64url(hash_hmac('sha256', $partes[0], ad_cuenta_clave('oauth'), true)), $partes[1])) return null;
    $carga = json_decode(ad_b64url_decode($partes[0]), true);
    return is_array($carga) && (int) ($carga['e'] ?? 0) >= time() ? $carga : null;
}

/** Abre sesión, o manda al paso del código si la cuenta tiene doble factor (el reto va en el fragmento, que no llega a ningún servidor). */
function ad_gh_entrar(PDO $db, array $u): never
{
    if ((int) $u['totp_activo'] === 1) ad_gh_volver('/cuenta/#reto=' . ad_reto_crear((int) $u['id']));
    ad_sesion_crear($db, (int) $u['id']);
    ad_cuenta_evento('entrada_github', (int) $u['id']);
    ad_gh_volver('/cuenta/?ok=entrada');
}

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'GET') {
    header('Allow: GET');
    http_response_code(405);
    exit;
}

$db = ad_db();
if ($db === null) ad_gh_error('no_disponible');
$config = ad_github_config();
if ($config === null) ad_gh_error('github_no');
if (ad_rate_limited('cta_gh', ad_client_ip(), 600, 20)) ad_gh_error('rate_limit');

$esRetorno = isset($_GET['state']) && (isset($_GET['code']) || isset($_GET['error']));

/* ---------------------------------------------------------------- paso 1: ir a GitHub */
if (!$esRetorno) {
    $modo = ($_GET['vincular'] ?? '') === '1' && ad_sesion_actual($db) !== null ? 'vincular' : 'entrar';
    $estado = ad_b64url(random_bytes(24));
    $verificador = ad_b64url(random_bytes(32));
    ad_cookie(AD_COOKIE_OAUTH, ad_gh_firmar(['s' => $estado, 'v' => $verificador, 'm' => $modo, 'e' => time() + 600]), time() + 600);
    $consulta = http_build_query([
        'client_id' => $config['client_id'],
        'redirect_uri' => AD_GH_CALLBACK,
        'scope' => 'read:user user:email',
        'state' => $estado,
        'code_challenge' => ad_b64url(hash('sha256', $verificador, true)),
        'code_challenge_method' => 'S256',
        'allow_signup' => 'true',
    ], '', '&', PHP_QUERY_RFC3986);
    ad_gh_volver('https://github.com/login/oauth/authorize?' . $consulta);
}

/* --------------------------------------------------------- paso 2: retorno de GitHub */
$cookie = ad_gh_leer_firma((string) ($_COOKIE[AD_COOKIE_OAUTH] ?? ''));
$estadoRecibido = is_string($_GET['state'] ?? null) ? $_GET['state'] : '';
if ($cookie === null || !hash_equals((string) ($cookie['s'] ?? ''), $estadoRecibido)) ad_gh_error('github_estado');
ad_cookie(AD_COOKIE_OAUTH, '', 1);
if (isset($_GET['error'])) ad_gh_error('github_cancelado');

$codigo = is_string($_GET['code'] ?? null) ? $_GET['code'] : '';
if (!preg_match('/^[A-Za-z0-9_-]{10,128}$/', $codigo)) ad_gh_error('github_fallo');

$respuesta = ad_gh_http('POST', 'https://github.com/login/oauth/access_token', [
    'Accept: application/json',
    'Content-Type: application/x-www-form-urlencoded',
], http_build_query([
    'client_id' => $config['client_id'],
    'client_secret' => $config['client_secret'],
    'code' => $codigo,
    'redirect_uri' => AD_GH_CALLBACK,
    'code_verifier' => (string) ($cookie['v'] ?? ''),
]));
$acceso = is_array($respuesta['json'] ?? null) ? (string) ($respuesta['json']['access_token'] ?? '') : '';
if ($acceso === '') ad_gh_error('github_fallo');

$cabecerasApi = ['Accept: application/vnd.github+json', 'Authorization: Bearer ' . $acceso, 'X-GitHub-Api-Version: 2022-11-28'];
$perfil = ad_gh_http('GET', 'https://api.github.com/user', $cabecerasApi);
$correos = ad_gh_http('GET', 'https://api.github.com/user/emails', $cabecerasApi);
unset($acceso, $cabecerasApi);
$datosPerfil = $perfil['json'] ?? null;
if (!is_array($datosPerfil) || !isset($datosPerfil['id']) || !is_int($datosPerfil['id'])) ad_gh_error('github_fallo');

$email = '';
foreach (is_array($correos['json'] ?? null) ? $correos['json'] : [] as $fila) {
    if (is_array($fila) && ($fila['primary'] ?? false) === true && ($fila['verified'] ?? false) === true && is_string($fila['email'] ?? null)) {
        $email = strtolower($fila['email']);
        break;
    }
}
if ($email === '' || !filter_var($email, FILTER_VALIDATE_EMAIL) || strlen($email) > 160) ad_gh_error('github_sin_correo');

$externo = (string) $datosPerfil['id'];
$login = substr(preg_replace('/[^A-Za-z0-9-]/', '', (string) ($datosPerfil['login'] ?? '')) ?? '', 0, 39);
$nombre = ad_dato_texto(['n' => $datosPerfil['name'] ?? ''], 'n', 60);

$st = $db->prepare('SELECT usuario_id FROM identidades WHERE proveedor = \'github\' AND externo = ?');
$st->execute([$externo]);
$dueno = $st->fetchColumn();
$ahora = time();

/* ---- vincular a la cuenta que ya tiene sesión */
if (($cookie['m'] ?? '') === 'vincular') {
    $sesion = ad_sesion_actual($db);
    if ($sesion === null) ad_gh_error('sin_sesion');
    $uid = (int) $sesion['usuario']['id'];
    if ($dueno !== false && (int) $dueno !== $uid) ad_gh_error('github_ocupado');
    $st = $db->prepare('SELECT 1 FROM identidades WHERE usuario_id = ? AND proveedor = \'github\'');
    $st->execute([$uid]);
    if ($st->fetchColumn() !== false && $dueno === false) ad_gh_error('github_ya_vinculado');
    if ($dueno === false) {
        $db->prepare('INSERT INTO identidades (proveedor, externo, usuario_id, login, creado_en) VALUES (\'github\', ?, ?, ?, ?)')
            ->execute([$externo, $uid, $login, $ahora]);
        ad_cuenta_evento('github_vinculado', $uid);
        ad_cuenta_aviso((string) $sesion['usuario']['email'], 'Vinculaste GitHub a tu cuenta.');
    }
    ad_gh_volver('/cuenta/?ok=github_vinculado');
}

/* ---- iniciar sesión */
if ($dueno !== false) {
    $u = ad_usuario_por_id($db, (int) $dueno);
    if ($u === null) ad_gh_error('github_fallo');
    ad_gh_entrar($db, $u);
}

$u = ad_usuario_por_email($db, $email);
try {
    $db->beginTransaction();
    if ($u === null) {
        $db->prepare('INSERT INTO usuarios (email, nombre, pass_hash, creado_en) VALUES (?, ?, NULL, ?)')->execute([$email, $nombre, $ahora]);
        $u = ad_usuario_por_id($db, (int) $db->lastInsertId());
        $creada = true;
    } else {
        $creada = false;
    }
    if ($u === null) throw new RuntimeException('sin usuario');
    $db->prepare('INSERT INTO identidades (proveedor, externo, usuario_id, login, creado_en) VALUES (\'github\', ?, ?, ?, ?)')
        ->execute([$externo, $u['id'], $login, $ahora]);
    $db->commit();
} catch (Throwable) {
    if ($db->inTransaction()) $db->rollBack();
    ad_gh_error('github_fallo');
}
if ($creada) {
    ad_cuenta_evento('cuenta_creada_github', (int) $u['id']);
} else {
    // Ya existía una cuenta con ese correo verificado: se vinculó y se avisa.
    ad_cuenta_evento('github_vinculado_al_entrar', (int) $u['id']);
    ad_cuenta_aviso((string) $u['email'], 'Entraste con GitHub y lo vinculamos a tu cuenta, porque el correo verificado de GitHub es el mismo.');
}
ad_gh_entrar($db, $u);
