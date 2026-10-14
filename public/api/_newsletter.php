<?php
/**
 * Almacenamiento y correo del boletín de AyudaDev.
 * Este archivo se bloquea por completo desde .htaccess.
 *
 * Los datos viven fuera del web root cuando es posible ($HOME/ayudadev-data).
 * Si no se puede, caen en public/api/_data/, que .htaccess deniega por completo.
 */

declare(strict_types=1);

require_once __DIR__ . '/_guard.php';

const AD_SITE_URL = 'https://dev.carlosnavarro.site';
const AD_SITE_NAME = 'AyudaDev';
const AD_TO_EMAIL = 'contacto@markhouseoficial.com';
const AD_FROM_EMAIL = 'no-reply@carlosnavarro.site';

/** Carpeta de datos: fuera de public_html si hay HOME; si no, _data/ (denegada por .htaccess). */
function ad_data_dir(): string
{
    $home = getenv('HOME');
    if (!is_string($home) || $home === '') {
        $home = isset($_SERVER['DOCUMENT_ROOT']) ? dirname((string) $_SERVER['DOCUMENT_ROOT']) : '';
    }
    $candidatos = [];
    if ($home !== '' && is_dir($home) && is_writable($home)) $candidatos[] = rtrim($home, '/\\') . '/ayudadev-data';
    $candidatos[] = __DIR__ . '/_data';

    foreach ($candidatos as $dir) {
        if (!is_dir($dir)) @mkdir($dir, 0700, true);
        if (is_dir($dir) && is_writable($dir)) return $dir;
    }
    return sys_get_temp_dir();
}

/**
 * Registro de eventos para el panel: una línea JSON por evento en .{nombre}.jsonl, sin IP ni contenido de consultas.
 * Al pasar de 1 MB el archivo se archiva como .old y se empieza otro. Nunca lanza errores.
 */
function ad_registrar(string $nombre, array $fila): void
{
    try {
        $archivo = ad_data_dir() . '/.' . preg_replace('/[^a-z0-9_-]/i', '', $nombre) . '.jsonl';
        if (is_file($archivo) && (int) @filesize($archivo) > 1048576) @rename($archivo, $archivo . '.old');
        $fila['ts'] = gmdate('c');
        @file_put_contents($archivo, json_encode($fila, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES) . "\n", FILE_APPEND | LOCK_EX);
        @chmod($archivo, 0600);
    } catch (Throwable) {
        // El registro es opcional: si falla, el sitio sigue funcionando.
    }
}

/** Secreto HMAC autogenerado en el servidor; nunca viaja al repositorio. */
function ad_secret(): string
{
    $file = ad_data_dir() . '/.secret';
    if (is_file($file)) {
        $s = trim((string) @file_get_contents($file));
        if (strlen($s) >= 32) return $s;
    }
    $s = bin2hex(random_bytes(32));
    @file_put_contents($file, $s, LOCK_EX);
    @chmod($file, 0600);
    return $s;
}

function ad_token(string $email, string $proposito): string
{
    return hash_hmac('sha256', strtolower($email) . '|' . $proposito, ad_secret());
}

function ad_b64url(string $s): string
{
    return rtrim(strtr(base64_encode($s), '+/', '-_'), '=');
}

function ad_b64url_decode(string $s): string
{
    $decoded = base64_decode(strtr($s, '-_', '+/'), true);
    return $decoded === false ? '' : $decoded;
}

function ad_subscribers_file(): string
{
    return ad_data_dir() . '/.suscriptores.jsonl';
}

/** Devuelve el último registro de ese correo (o null). */
function ad_find_subscriber(string $email): ?array
{
    $file = ad_subscribers_file();
    if (!is_file($file)) return null;
    $email = strtolower($email);
    $encontrado = null;
    $fh = @fopen($file, 'r');
    if ($fh === false) return null;
    while (($linea = fgets($fh)) !== false) {
        $row = json_decode(trim($linea), true);
        if (is_array($row) && strtolower((string) ($row['email'] ?? '')) === $email) $encontrado = $row;
    }
    fclose($fh);
    return $encontrado;
}

/** Añade un registro (solo-append, con bloqueo). El último registro por correo es el vigente. */
function ad_append_subscriber(array $row): bool
{
    $file = ad_subscribers_file();
    $row['ts'] = gmdate('c');
    $ok = @file_put_contents($file, json_encode($row, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES) . "\n", FILE_APPEND | LOCK_EX);
    @chmod($file, 0600);
    return $ok !== false;
}

/** Enlace firmado de baja para un correo. */
function ad_enlace_baja(string $email): string
{
    return AD_SITE_URL . '/api/baja.php?e=' . ad_b64url($email) . '&t=' . ad_token($email, 'baja');
}

function ad_h(string $s): string
{
    return htmlspecialchars($s, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
}

/**
 * Correo HTML con la marca del sitio. Va en tablas y estilos en línea porque los clientes de correo
 * no soportan CSS externo ni variables, y siempre en tema claro para que se lea igual en todos.
 *
 * @param string[] $parrafos Texto plano; se escapa.
 */
function ad_plantilla_correo(string $titulo, array $parrafos, string $textoBoton, string $url, string $nota, string $urlBaja = ''): string
{
    $pieBaja = $urlBaja === '' ? '' : ' · <a href="' . ad_h($urlBaja) . '" style="color:#6b6b68;">Darme de baja</a>';
    $fuente = "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif";
    $cuerpo = '';
    foreach ($parrafos as $p) {
        $cuerpo .= '<p style="margin:0 0 16px;font-size:16px;line-height:1.6;color:#2b2b2a;">' . ad_h($p) . '</p>';
    }
    return '<!doctype html><html lang="es"><head><meta charset="utf-8">'
        . '<meta name="viewport" content="width=device-width,initial-scale=1">'
        . '<meta name="color-scheme" content="light"><meta name="supported-color-schemes" content="light">'
        . '<title>' . ad_h($titulo) . '</title></head>'
        . '<body style="margin:0;padding:0;background:#f3f3f1;">'
        . '<div style="display:none;max-height:0;overflow:hidden;opacity:0;">' . ad_h($titulo) . '</div>'
        . '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f3f3f1;"><tr><td align="center" style="padding:32px 16px;">'
        . '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;">'
        . '<tr><td style="padding:0 0 20px;font-family:' . $fuente . ';">'
        . '<a href="' . ad_h(AD_SITE_URL) . '" style="text-decoration:none;color:#0b0b0c;">'
        . '<img src="' . ad_h(AD_SITE_URL) . '/icon-512.png" width="40" height="40" alt="" style="display:inline-block;vertical-align:middle;border:0;border-radius:10px;">'
        . '<span style="display:inline-block;vertical-align:middle;margin-left:10px;font-size:20px;font-weight:700;letter-spacing:-0.01em;">' . ad_h(AD_SITE_NAME) . '</span>'
        . '</a></td></tr>'
        . '<tr><td style="background:#ffffff;border:1px solid #e3e3df;border-radius:20px;padding:32px;font-family:' . $fuente . ';">'
        . '<h1 style="margin:0 0 16px;font-size:24px;line-height:1.25;color:#0b0b0c;">' . ad_h($titulo) . '</h1>'
        . $cuerpo
        . '<table role="presentation" cellpadding="0" cellspacing="0" style="margin:24px 0;"><tr><td style="background:#c6f24e;border-radius:999px;">'
        . '<a href="' . ad_h($url) . '" style="display:inline-block;padding:14px 28px;font-size:16px;font-weight:700;color:#0b0b0c;text-decoration:none;">' . ad_h($textoBoton) . '</a>'
        . '</td></tr></table>'
        . '<p style="margin:0 0 6px;font-size:13px;line-height:1.5;color:#6b6b68;">Si el botón no funciona, copia y pega este enlace en tu navegador:</p>'
        . '<p style="margin:0 0 20px;font-size:13px;line-height:1.5;word-break:break-all;"><a href="' . ad_h($url) . '" style="color:#4a6800;">' . ad_h($url) . '</a></p>'
        . '<p style="margin:0;font-size:13px;line-height:1.5;color:#6b6b68;">' . ad_h($nota) . '</p>'
        . '</td></tr>'
        . '<tr><td align="center" style="padding:20px 0 0;font-family:' . $fuente . ';font-size:12px;line-height:1.5;color:#6b6b68;">'
        . ad_h(AD_SITE_NAME) . ' · <a href="' . ad_h(AD_SITE_URL) . '" style="color:#6b6b68;">' . ad_h(preg_replace('#^https?://#', '', AD_SITE_URL)) . '</a>' . $pieBaja
        . '</td></tr></table></td></tr></table></body></html>';
}

/** Con $urlBaja el correo lleva el botón de baja del cliente de correo (RFC 8058); sin ella, solo el enlace a la página de baja. */
function ad_send_mail(string $to, string $subject, string $body, string $replyTo = '', string $html = '', string $urlBaja = ''): bool
{
    $headers = [
        'From: ' . AD_SITE_NAME . ' <' . AD_FROM_EMAIL . '>',
        'MIME-Version: 1.0',
        'X-Mailer: AyudaDev-Web',
        'List-Unsubscribe: <' . ($urlBaja !== '' ? $urlBaja : AD_SITE_URL . '/newsletter/baja/') . '>',
    ];
    if ($urlBaja !== '') $headers[] = 'List-Unsubscribe-Post: List-Unsubscribe=One-Click';
    if ($html === '') {
        $headers[] = 'Content-Type: text/plain; charset=UTF-8';
        $headers[] = 'Content-Transfer-Encoding: 8bit';
        $mensaje = $body;
    } else {
        $limite = 'ayudadev-' . bin2hex(random_bytes(8));
        $headers[] = 'Content-Type: multipart/alternative; boundary="' . $limite . '"';
        $parte = static fn(string $tipo, string $contenido): string =>
            "--$limite\r\nContent-Type: $tipo; charset=UTF-8\r\nContent-Transfer-Encoding: quoted-printable\r\n\r\n"
            . quoted_printable_encode($contenido) . "\r\n";
        $mensaje = $parte('text/plain', $body) . $parte('text/html', $html) . "--$limite--\r\n";
    }
    if ($replyTo !== '') $headers[] = 'Reply-To: ' . $replyTo;
    $encodedSubject = '=?UTF-8?B?' . base64_encode($subject) . '?=';
    $sent = @mail($to, $encodedSubject, $mensaje, implode("\r\n", $headers), '-f' . AD_FROM_EMAIL);
    if (!$sent) @file_put_contents(ad_data_dir() . '/.mail-errors.log', gmdate('c') . " fallo al enviar a " . $to . "\n", FILE_APPEND | LOCK_EX);
    return $sent;
}

function ad_respond(bool $ok, string $code, int $status = 200, string $backOk = '/newsletter/gracias/', string $backError = '/newsletter/'): never
{
    http_response_code($status);
    if ($status === 429) header('Retry-After: 900');
    if ($code === 'rate_limit') ad_registrar('bloqueos', ['codigo' => $code, 'script' => basename((string) ($_SERVER['SCRIPT_NAME'] ?? ''))]);
    $wantsJson = str_contains((string) ($_SERVER['HTTP_ACCEPT'] ?? ''), 'application/json');
    if ($wantsJson) {
        header('Content-Type: application/json; charset=utf-8');
        echo json_encode(['ok' => $ok, 'code' => $code]);
        exit;
    }
    $destino = $ok ? $backOk : $backError . '?error=' . rawurlencode($code) . '#newsletter';
    header('Location: ' . $destino, true, 303);
    exit;
}
