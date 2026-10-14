<?php
/**
 * Panel de administración de AyudaDev. Solo lectura: no borra ni edita nada.
 *
 * Doble candado:
 *  1. Directory Privacy de cPanel sobre la carpeta api/panel/ (usuario y contraseña de Apache).
 *  2. Sesión propia con contraseña. El hash vive en ~/ayudadev-data/.panel-hash, fuera del repositorio.
 *
 * Primera vez: mientras no exista el hash, el panel responde 404 salvo que exista el archivo vacío
 * ~/ayudadev-data/.panel-activar (créalo desde el Administrador de archivos de cPanel). Con él se muestra
 * el formulario para crear la contraseña, y el archivo se borra al terminar.
 *
 * Lee: .suscriptores.jsonl, .mail-errors.log, .bloqueos.jsonl y .mcp.jsonl de la carpeta de datos.
 */

declare(strict_types=1);

require __DIR__ . '/../_newsletter.php';

date_default_timezone_set('America/Mexico_City');

const PN_HASH = '.panel-hash';
const PN_ACTIVAR = '.panel-activar';
const PN_INACTIVIDAD = 1800;
const PN_DIAS = 30;

ad_api_headers();
header("Content-Security-Policy: default-src 'none'; style-src 'unsafe-inline'; img-src data:; form-action 'self'; frame-ancestors 'none'; base-uri 'none'");
header('Referrer-Policy: no-referrer');
header('Content-Type: text/html; charset=utf-8');

$metodo = $_SERVER['REQUEST_METHOD'] ?? '';
if ($metodo !== 'GET' && $metodo !== 'POST') {
    header('Allow: GET, POST');
    http_response_code(405);
    exit;
}

ini_set('session.use_strict_mode', '1');
ini_set('session.use_only_cookies', '1');
session_cache_limiter('');
session_name('ayudadev_panel');
session_set_cookie_params(['lifetime' => 0, 'path' => '/api/panel/', 'secure' => true, 'httponly' => true, 'samesite' => 'Strict']);
session_start();

/* ───────────── utilidades ───────────── */

function pn_csrf(): string
{
    if (empty($_SESSION['csrf'])) $_SESSION['csrf'] = bin2hex(random_bytes(16));
    return (string) $_SESSION['csrf'];
}

function pn_csrf_ok(): bool
{
    return is_string($_POST['csrf'] ?? null) && !empty($_SESSION['csrf']) && hash_equals((string) $_SESSION['csrf'], $_POST['csrf']);
}

function pn_ir(string $ruta = '/api/panel/'): never
{
    header('Location: ' . $ruta, true, 303);
    exit;
}

function pn_leer(string $archivo): array
{
    if (!is_file($archivo)) return [];
    $fh = @fopen($archivo, 'r');
    if ($fh === false) return [];
    $filas = [];
    while (($linea = fgets($fh)) !== false) {
        $fila = json_decode(trim($linea), true);
        if (is_array($fila)) $filas[] = $fila;
    }
    fclose($fh);
    return $filas;
}

/** Filas del registro actual y del archivado (.old), para no perder datos al rotar. */
function pn_leer_registro(string $nombre): array
{
    $base = ad_data_dir() . '/.' . $nombre . '.jsonl';
    return array_merge(pn_leer($base . '.old'), pn_leer($base));
}

function pn_dia(string $ts): string
{
    $t = strtotime($ts);
    return $t === false ? '' : date('Y-m-d', $t);
}

/** @return array<string,int> Últimos $n días (el más viejo primero), todos en cero. */
function pn_dias(int $n = PN_DIAS): array
{
    $serie = [];
    for ($i = $n - 1; $i >= 0; $i--) $serie[date('Y-m-d', strtotime("-$i day"))] = 0;
    return $serie;
}

function pn_fecha(string $ts): string
{
    $t = strtotime($ts);
    return $t === false ? '' : date('d/m/Y H:i', $t);
}

/** Gráfica de barras en SVG, sin JavaScript. */
function pn_barras(array $serie, string $descripcion): string
{
    $n = count($serie);
    if ($n === 0) return '';
    $max = max(1, max($serie));
    $w = 14;
    $h = 96;
    $svg = '<svg viewBox="0 0 ' . ($n * $w) . ' ' . ($h + 4) . '" class="graf" role="img" aria-label="' . ad_h($descripcion) . '" preserveAspectRatio="none">';
    $i = 0;
    foreach ($serie as $dia => $v) {
        $alto = (int) round($v / $max * $h);
        if ($v > 0 && $alto < 2) $alto = 2;
        $svg .= '<rect x="' . ($i * $w + 2) . '" y="' . ($h - $alto + 2) . '" width="' . ($w - 4) . '" height="' . $alto . '" rx="2"><title>' . ad_h($dia . ': ' . $v) . '</title></rect>';
        $i++;
    }
    $svg .= '<line x1="0" y1="' . ($h + 2) . '" x2="' . ($n * $w) . '" y2="' . ($h + 2) . '" class="eje"/></svg>';
    $dias = array_keys($serie);
    return '<figure class="fig">' . $svg
        . '<figcaption class="muted"><span>' . ad_h((string) reset($dias)) . '</span><span>Máximo por día: ' . $max . '</span><span>' . ad_h((string) end($dias)) . '</span></figcaption></figure>';
}

function pn_tarjeta(string $titulo, string|int $valor, string $nota = ''): string
{
    return '<div class="card"><p class="muted">' . ad_h($titulo) . '</p><p class="num">' . ad_h((string) $valor) . '</p>'
        . ($nota !== '' ? '<p class="muted peq">' . ad_h($nota) . '</p>' : '') . '</div>';
}

function pn_apache_protegido(): bool
{
    foreach (['REMOTE_USER', 'REDIRECT_REMOTE_USER', 'PHP_AUTH_USER'] as $clave) {
        if (!empty($_SERVER[$clave])) return true;
    }
    return false;
}

function pn_estilos(): string
{
    return <<<'CSS'
:root{--bg:#0b0b0c;--surf:#151517;--surf2:#1c1c1f;--txt:#f2f2ee;--muted:#a3a3a0;--line:rgb(242 242 238 / .14);--acc:#c6f24e;--ink:#c6f24e;--on:#0b0b0c;--bad:#ff8a7a}
@media (prefers-color-scheme:light){:root{--bg:#f3f3f1;--surf:#fff;--surf2:#ececE8;--txt:#141414;--muted:#5c5c59;--line:rgb(20 20 20 / .14);--ink:#3f5a00;--bad:#b3261e}}
*{box-sizing:border-box}
body{margin:0;background:var(--bg);color:var(--txt);font:16px/1.55 -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif}
a{color:var(--ink)}
:focus-visible{outline:2px solid var(--ink);outline-offset:2px}
.wrap{max-width:960px;margin:0 auto;padding:24px 16px 64px}
header.top{display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:12px;margin-bottom:24px}
.marca{display:flex;align-items:center;gap:10px;font-weight:700;font-size:20px}
.marca span{display:grid;place-items:center;width:36px;height:36px;border-radius:10px;background:var(--acc);color:var(--on);font-size:15px}
nav.menu{display:flex;flex-wrap:wrap;gap:8px}
nav.menu a,.btn{display:inline-block;padding:8px 16px;border-radius:999px;border:1px solid var(--line);background:var(--surf);color:var(--txt);text-decoration:none;font:inherit;font-size:14px;cursor:pointer;transition:background-color .15s,border-color .15s}
nav.menu a:hover,.btn:hover{border-color:var(--ink)}
nav.menu a[aria-current=page]{background:var(--acc);color:var(--on);border-color:var(--acc);font-weight:700}
.btn.prim{background:var(--acc);color:var(--on);border-color:var(--acc);font-weight:700;padding:12px 24px;font-size:16px}
h1{font-size:28px;line-height:1.2;margin:0 0 4px}
h2{font-size:18px;margin:32px 0 12px}
.muted{color:var(--muted);margin:0}.peq{font-size:13px}
.grid{display:grid;gap:12px;grid-template-columns:repeat(auto-fit,minmax(200px,1fr))}
.card{background:var(--surf);border:1px solid var(--line);border-radius:20px;padding:20px}
.num{font-size:36px;font-weight:700;line-height:1.1;margin:4px 0 0}
.fig{margin:0;background:var(--surf);border:1px solid var(--line);border-radius:20px;padding:16px}
.graf{display:block;width:100%;height:120px}.graf rect{fill:var(--acc)}.eje{stroke:var(--line);stroke-width:1}
.fig figcaption{display:flex;justify-content:space-between;gap:8px;font-size:12px;margin-top:8px}
.tabla{width:100%;border-collapse:collapse;background:var(--surf);border:1px solid var(--line);border-radius:20px;overflow:hidden;font-size:14px}
.tabla th,.tabla td{text-align:left;padding:10px 14px;border-bottom:1px solid var(--line);overflow-wrap:anywhere}
.tabla th{color:var(--muted);font-weight:600;font-size:12px;text-transform:uppercase;letter-spacing:.04em}
.tabla tr:last-child td{border-bottom:0}
.tabla-wrap{overflow-x:auto}
.chips{display:flex;flex-wrap:wrap;gap:8px;margin:12px 0}
.chips a{padding:6px 14px;border-radius:999px;border:1px solid var(--line);text-decoration:none;font-size:14px;color:var(--txt)}
.chips a[aria-current=true]{background:var(--acc);color:var(--on);border-color:var(--acc);font-weight:700}
.aviso{border:1px solid var(--line);background:var(--surf2);border-radius:20px;padding:12px 16px;font-size:14px;margin-bottom:16px}
.err{color:var(--bad);margin:0 0 12px}
form.acceso{max-width:380px;margin:12vh auto 0;background:var(--surf);border:1px solid var(--line);border-radius:20px;padding:28px}
form.acceso label{display:block;font-size:14px;margin:16px 0 6px}
input[type=password]{width:100%;padding:12px 14px;border-radius:14px;border:1px solid var(--line);background:var(--bg);color:var(--txt);font:inherit}
.vacio{padding:24px;text-align:center;color:var(--muted)}
@media (prefers-reduced-motion:reduce){*{transition:none!important}}
CSS;
}

function pn_documento(string $titulo, string $cuerpo, int $status = 200): never
{
    http_response_code($status);
    echo '<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">'
        . '<meta name="robots" content="noindex,nofollow"><title>' . ad_h($titulo) . ' · AyudaDev</title>'
        . '<style>' . pn_estilos() . '</style></head><body>' . $cuerpo . '</body></html>';
    exit;
}

function pn_formulario_acceso(string $titulo, string $texto, string $accion, string $boton, string $error = '', bool $nueva = false): never
{
    $campo = static fn (string $nombre, string $etiqueta, string $auto): string =>
        '<label for="' . $nombre . '">' . ad_h($etiqueta) . '</label><input type="password" id="' . $nombre . '" name="' . $nombre . '" required autocomplete="' . $auto . '"' . ($nueva ? ' minlength="12"' : '') . '>';
    $html = '<main class="wrap"><form class="acceso" method="post" action="/api/panel/">'
        . '<p class="marca"><span aria-hidden="true">&lt;/&gt;</span> AyudaDev</p>'
        . '<h1>' . ad_h($titulo) . '</h1><p class="muted">' . ad_h($texto) . '</p>'
        . ($error !== '' ? '<p class="err" role="alert">' . ad_h($error) . '</p>' : '')
        . '<input type="hidden" name="accion" value="' . ad_h($accion) . '"><input type="hidden" name="csrf" value="' . ad_h(pn_csrf()) . '">'
        . $campo('clave', $nueva ? 'Contraseña nueva (mínimo 12 caracteres)' : 'Contraseña', $nueva ? 'new-password' : 'current-password')
        . ($nueva ? $campo('clave2', 'Repite la contraseña', 'new-password') : '')
        . '<p style="margin:20px 0 0"><button class="btn prim" type="submit">' . ad_h($boton) . '</button></p></form></main>';
    pn_documento($titulo, $html);
}

/* ───────────── acceso ───────────── */

$dir = ad_data_dir();
$archivoHash = $dir . '/' . PN_HASH;
$archivoActivar = $dir . '/' . PN_ACTIVAR;
$hash = is_file($archivoHash) ? trim((string) @file_get_contents($archivoHash)) : '';
$accion = $metodo === 'POST' && is_string($_POST['accion'] ?? null) ? $_POST['accion'] : '';

if ($hash === '') {
    // Sin contraseña todavía: solo se puede crear si Carlos dejó el archivo de activación en el servidor.
    if (!is_file($archivoActivar)) pn_documento('No disponible', '<main class="wrap"><h1>No disponible</h1></main>', 404);

    if ($accion === 'crear') {
        $clave = (string) ($_POST['clave'] ?? '');
        $clave2 = (string) ($_POST['clave2'] ?? '');
        if (!pn_csrf_ok()) pn_formulario_acceso('Crea tu contraseña', 'Se guarda cifrada en el servidor.', 'crear', 'Crear contraseña', 'La sesión caducó. Inténtalo de nuevo.', true);
        if (strlen($clave) < 12) pn_formulario_acceso('Crea tu contraseña', 'Se guarda cifrada en el servidor.', 'crear', 'Crear contraseña', 'Usa al menos 12 caracteres.', true);
        if (!hash_equals($clave, $clave2)) pn_formulario_acceso('Crea tu contraseña', 'Se guarda cifrada en el servidor.', 'crear', 'Crear contraseña', 'Las contraseñas no coinciden.', true);
        $nuevoHash = password_hash($clave, PASSWORD_DEFAULT);
        if (@file_put_contents($archivoHash, $nuevoHash, LOCK_EX) === false) {
            pn_formulario_acceso('Crea tu contraseña', 'Se guarda cifrada en el servidor.', 'crear', 'Crear contraseña', 'No pude guardar la contraseña en la carpeta de datos.', true);
        }
        @chmod($archivoHash, 0600);
        @unlink($archivoActivar);
        session_regenerate_id(true);
        $_SESSION = ['ok' => true, 'ultimo' => time()];
        pn_ir();
    }
    pn_formulario_acceso('Crea tu contraseña', 'Es la primera vez. Elige una contraseña para el panel; se guarda cifrada en el servidor.', 'crear', 'Crear contraseña', '', true);
}

$dentro = !empty($_SESSION['ok']) && (time() - (int) ($_SESSION['ultimo'] ?? 0)) < PN_INACTIVIDAD;

if (!$dentro) {
    unset($_SESSION['ok'], $_SESSION['ultimo']); // conserva el token CSRF del formulario
    if ($accion === 'entrar') {
        $ip = ad_client_ip();
        if (ad_rate_limited('panel_login', $ip, 900, 5) || ad_rate_limited('panel_login_global', 'all', 3600, 30)) {
            pn_formulario_acceso('Panel de AyudaDev', 'Introduce tu contraseña.', 'entrar', 'Entrar', 'Demasiados intentos. Espera unos minutos.');
        }
        if (!pn_csrf_ok()) pn_formulario_acceso('Panel de AyudaDev', 'Introduce tu contraseña.', 'entrar', 'Entrar', 'La sesión caducó. Inténtalo de nuevo.');
        if (!password_verify((string) ($_POST['clave'] ?? ''), $hash)) {
            usleep(500000);
            pn_formulario_acceso('Panel de AyudaDev', 'Introduce tu contraseña.', 'entrar', 'Entrar', 'Contraseña incorrecta.');
        }
        session_regenerate_id(true);
        $_SESSION = ['ok' => true, 'ultimo' => time()];
        pn_ir();
    }
    pn_formulario_acceso('Panel de AyudaDev', 'Introduce tu contraseña.', 'entrar', 'Entrar');
}

$_SESSION['ultimo'] = time();

if ($accion === 'salir') {
    if (pn_csrf_ok()) {
        $_SESSION = [];
        session_destroy();
    }
    pn_ir();
}

/* ───────────── datos ───────────── */

$desde = date('Y-m-d', strtotime('-' . (PN_DIAS - 1) . ' day'));

function pn_datos_boletin(): array
{
    $filas = pn_leer(ad_subscribers_file());
    $vigente = [];
    foreach ($filas as $f) {
        $correo = strtolower((string) ($f['email'] ?? ''));
        if ($correo !== '') $vigente[$correo] = $f;
    }
    $estados = ['pendiente' => 0, 'confirmado' => 0, 'baja' => 0];
    foreach ($vigente as $f) {
        $e = (string) ($f['estado'] ?? '');
        if (isset($estados[$e])) $estados[$e]++;
    }
    $altas = pn_dias();
    $bajas = pn_dias();
    $origenes = [];
    foreach ($filas as $f) {
        $dia = pn_dia((string) ($f['ts'] ?? ''));
        $estado = (string) ($f['estado'] ?? '');
        if ($estado === 'confirmado') {
            if (isset($altas[$dia])) $altas[$dia]++;
            $origen = (string) ($f['origen'] ?? '/');
            $origenes[$origen] = ($origenes[$origen] ?? 0) + 1;
        } elseif ($estado === 'baja' && isset($bajas[$dia])) {
            $bajas[$dia]++;
        }
    }
    arsort($origenes);
    return compact('vigente', 'estados', 'altas', 'bajas', 'origenes');
}

function pn_datos_registro(string $nombre, string $desde): array
{
    return array_values(array_filter(
        pn_leer_registro($nombre),
        static fn (array $f): bool => pn_dia((string) ($f['ts'] ?? '')) >= $desde
    ));
}

/* ───────────── vistas ───────────── */

$vistas = ['resumen' => 'Resumen', 'suscriptores' => 'Suscriptores', 'correo' => 'Correo y bloqueos', 'mcp' => 'Servidor MCP'];
$vista = is_string($_GET['v'] ?? null) && isset($vistas[$_GET['v']]) ? $_GET['v'] : 'resumen';
$b = pn_datos_boletin();
$mcp = pn_datos_registro('mcp', $desde);
$bloqueos = pn_datos_registro('bloqueos', $desde);
$lineasError = is_file($dir . '/.mail-errors.log') ? (file($dir . '/.mail-errors.log', FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES) ?: []) : [];
$erroresRecientes = array_values(array_filter($lineasError, static fn (string $l): bool => substr($l, 0, 10) >= $desde));

$cuerpo = '';

if ($vista === 'resumen') {
    $llamadas = count(array_filter($mcp, static fn (array $f): bool => ($f['metodo'] ?? '') === 'tools/call'));
    $cuerpo .= '<h1>Resumen</h1><p class="muted">Últimos ' . PN_DIAS . ' días. Horas en horario de la Ciudad de México.</p>';
    $cuerpo .= '<h2>Boletín</h2><div class="grid">'
        . pn_tarjeta('Suscriptores confirmados', $b['estados']['confirmado'], 'Vigentes hoy')
        . pn_tarjeta('Sin confirmar', $b['estados']['pendiente'], 'Pidieron el correo y no lo abrieron')
        . pn_tarjeta('Bajas', $b['estados']['baja'], 'Ya no reciben nada')
        . pn_tarjeta('Correos distintos', count($b['vigente']), 'Todos los estados')
        . '</div>';
    $cuerpo .= '<h2>Altas confirmadas por día</h2>' . pn_barras($b['altas'], 'Altas confirmadas por día en los últimos ' . PN_DIAS . ' días');
    $cuerpo .= '<h2>Bajas por día</h2>' . pn_barras($b['bajas'], 'Bajas por día en los últimos ' . PN_DIAS . ' días');
    $cuerpo .= '<h2>Otras señales</h2><div class="grid">'
        . pn_tarjeta('Llamadas al MCP', $llamadas, 'Herramientas usadas por asistentes de IA')
        . pn_tarjeta('Fallos de envío de correo', count($erroresRecientes))
        . pn_tarjeta('Bloqueos por exceso de intentos', count($bloqueos))
        . '</div>';
} elseif ($vista === 'suscriptores') {
    $filtro = is_string($_GET['e'] ?? null) && in_array($_GET['e'], ['confirmado', 'pendiente', 'baja', 'todos'], true) ? $_GET['e'] : 'confirmado';
    $filas = array_filter($b['vigente'], static fn (array $f): bool => $filtro === 'todos' || ($f['estado'] ?? '') === $filtro);
    uasort($filas, static fn (array $x, array $y): int => strcmp((string) ($y['ts'] ?? ''), (string) ($x['ts'] ?? '')));
    $total = count($filas);
    $filas = array_slice($filas, 0, 200, true);
    $cuerpo .= '<h1>Suscriptores</h1><p class="muted">Cada correo aparece con su estado más reciente.</p><div class="chips" role="group" aria-label="Filtrar por estado">';
    foreach (['confirmado' => 'Confirmados', 'pendiente' => 'Sin confirmar', 'baja' => 'Bajas', 'todos' => 'Todos'] as $clave => $texto) {
        $cuerpo .= '<a href="?v=suscriptores&amp;e=' . $clave . '"' . ($filtro === $clave ? ' aria-current="true"' : '') . '>' . ad_h($texto) . '</a>';
    }
    $cuerpo .= '</div>';
    if ($total === 0) {
        $cuerpo .= '<p class="card vacio">No hay correos en este estado.</p>';
    } else {
        $cuerpo .= '<div class="tabla-wrap"><table class="tabla"><thead><tr><th>Correo</th><th>Estado</th><th>Último cambio</th><th>Origen</th></tr></thead><tbody>';
        foreach ($filas as $correo => $f) {
            $cuerpo .= '<tr><td>' . ad_h((string) $correo) . '</td><td>' . ad_h((string) ($f['estado'] ?? '')) . '</td><td>' . ad_h(pn_fecha((string) ($f['ts'] ?? ''))) . '</td><td>' . ad_h((string) ($f['origen'] ?? '')) . '</td></tr>';
        }
        $cuerpo .= '</tbody></table></div><p class="muted peq" style="margin-top:8px">Mostrando ' . count($filas) . ' de ' . $total . '.</p>';
    }
    if ($b['origenes'] !== []) {
        $cuerpo .= '<h2>De dónde vienen las altas</h2><div class="tabla-wrap"><table class="tabla"><thead><tr><th>Página</th><th>Altas confirmadas</th></tr></thead><tbody>';
        foreach (array_slice($b['origenes'], 0, 8, true) as $origen => $n) $cuerpo .= '<tr><td>' . ad_h((string) $origen) . '</td><td>' . $n . '</td></tr>';
        $cuerpo .= '</tbody></table></div>';
    }
} elseif ($vista === 'correo') {
    $porDia = pn_dias();
    $porScript = [];
    foreach ($bloqueos as $f) {
        $dia = pn_dia((string) ($f['ts'] ?? ''));
        if (isset($porDia[$dia])) $porDia[$dia]++;
        $s = (string) ($f['script'] ?? '?');
        $porScript[$s] = ($porScript[$s] ?? 0) + 1;
    }
    arsort($porScript);
    $cuerpo .= '<h1>Correo y bloqueos</h1><p class="muted">Últimos ' . PN_DIAS . ' días.</p><h2>Fallos de envío</h2>';
    if ($erroresRecientes === []) {
        $cuerpo .= '<p class="card vacio">Sin fallos de envío.</p>';
    } else {
        $cuerpo .= '<div class="tabla-wrap"><table class="tabla"><thead><tr><th>Registro</th></tr></thead><tbody>';
        foreach (array_slice(array_reverse($erroresRecientes), 0, 50) as $linea) $cuerpo .= '<tr><td>' . ad_h($linea) . '</td></tr>';
        $cuerpo .= '</tbody></table></div>';
    }
    $cuerpo .= '<h2>Bloqueos por exceso de intentos</h2>' . pn_barras($porDia, 'Bloqueos por día en los últimos ' . PN_DIAS . ' días');
    if ($porScript !== []) {
        $cuerpo .= '<div class="tabla-wrap" style="margin-top:12px"><table class="tabla"><thead><tr><th>Endpoint</th><th>Bloqueos</th></tr></thead><tbody>';
        foreach ($porScript as $s => $n) $cuerpo .= '<tr><td>' . ad_h((string) $s) . '</td><td>' . $n . '</td></tr>';
        $cuerpo .= '</tbody></table></div>';
    }
} else {
    $porDia = pn_dias();
    $porHerramienta = [];
    $conexiones = 0;
    $fallos = 0;
    foreach ($mcp as $f) {
        $dia = pn_dia((string) ($f['ts'] ?? ''));
        if (($f['metodo'] ?? '') === 'initialize') {
            $conexiones++;
            continue;
        }
        if (isset($porDia[$dia])) $porDia[$dia]++;
        $h = (string) ($f['herramienta'] ?? '?');
        $porHerramienta[$h] = ($porHerramienta[$h] ?? 0) + 1;
        if (empty($f['ok'])) $fallos++;
    }
    arsort($porHerramienta);
    $cuerpo .= '<h1>Servidor MCP</h1><p class="muted">Últimos ' . PN_DIAS . ' días. Solo se cuenta qué herramienta se usó, nunca lo que se preguntó.</p>';
    $cuerpo .= '<div class="grid" style="margin-top:16px">' . pn_tarjeta('Conexiones', $conexiones, 'Asistentes que iniciaron sesión MCP')
        . pn_tarjeta('Llamadas a herramientas', array_sum($porHerramienta)) . pn_tarjeta('Llamadas con error', $fallos) . '</div>';
    $cuerpo .= '<h2>Llamadas por día</h2>' . pn_barras($porDia, 'Llamadas al MCP por día en los últimos ' . PN_DIAS . ' días');
    $cuerpo .= '<h2>Por herramienta</h2>';
    if ($porHerramienta === []) {
        $cuerpo .= '<p class="card vacio">Todavía no hay llamadas registradas.</p>';
    } else {
        $cuerpo .= '<div class="tabla-wrap"><table class="tabla"><thead><tr><th>Herramienta</th><th>Llamadas</th></tr></thead><tbody>';
        foreach ($porHerramienta as $h => $n) $cuerpo .= '<tr><td>' . ad_h((string) $h) . '</td><td>' . $n . '</td></tr>';
        $cuerpo .= '</tbody></table></div>';
    }
}

$menu = '';
foreach ($vistas as $clave => $texto) {
    $menu .= '<a href="?v=' . $clave . '"' . ($vista === $clave ? ' aria-current="page"' : '') . '>' . ad_h($texto) . '</a>';
}
$aviso = pn_apache_protegido() ? '' : '<p class="aviso" role="note">No detecto la protección de cPanel (Directory Privacy) sobre esta carpeta. Actívala para tener el doble candado.</p>';

pn_documento($vistas[$vista], '<div class="wrap"><header class="top"><p class="marca"><span aria-hidden="true">&lt;/&gt;</span> AyudaDev · Panel</p>'
    . '<nav class="menu" aria-label="Secciones">' . $menu . '</nav>'
    . '<form method="post" action="/api/panel/"><input type="hidden" name="accion" value="salir"><input type="hidden" name="csrf" value="' . ad_h(pn_csrf()) . '"><button class="btn" type="submit">Salir</button></form></header>'
    . $aviso . '<main>' . $cuerpo . '</main></div>');
