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

function ad_send_mail(string $to, string $subject, string $body, string $replyTo = ''): bool
{
    $headers = [
        'From: ' . AD_SITE_NAME . ' <' . AD_FROM_EMAIL . '>',
        'MIME-Version: 1.0',
        'Content-Type: text/plain; charset=UTF-8',
        'Content-Transfer-Encoding: 8bit',
        'X-Mailer: AyudaDev-Web',
        'List-Unsubscribe: <' . AD_SITE_URL . '/newsletter/baja/>',
    ];
    if ($replyTo !== '') $headers[] = 'Reply-To: ' . $replyTo;
    $encodedSubject = '=?UTF-8?B?' . base64_encode($subject) . '?=';
    $sent = @mail($to, $encodedSubject, $body, implode("\r\n", $headers), '-f' . AD_FROM_EMAIL);
    if (!$sent) @file_put_contents(ad_data_dir() . '/.mail-errors.log', gmdate('c') . " fallo al enviar a " . $to . "\n", FILE_APPEND | LOCK_EX);
    return $sent;
}

function ad_respond(bool $ok, string $code, int $status = 200, string $backOk = '/newsletter/gracias/', string $backError = '/newsletter/'): never
{
    http_response_code($status);
    if ($status === 429) header('Retry-After: 900');
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
