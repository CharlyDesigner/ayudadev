<?php
/**
 * Baja del boletín.
 * - GET con el enlace firmado de cada correo: da de baja y redirige a /newsletter/baja/?ok=1.
 * - POST con el enlace firmado y `List-Unsubscribe=One-Click` (RFC 8058): baja desde el botón del cliente de correo.
 * - POST desde el formulario de /newsletter/baja/: si el correo está en la lista, le envía su enlace de baja.
 *   La respuesta es siempre la misma, para no revelar quién está suscrito.
 */

declare(strict_types=1);

require __DIR__ . '/_newsletter.php';

ad_api_headers();

const AD_BAJA_OK = '/newsletter/baja/?enviado=1';
const AD_BAJA_PAGINA = '/newsletter/baja/';

$metodo = $_SERVER['REQUEST_METHOD'] ?? '';
if ($metodo !== 'GET' && $metodo !== 'POST') {
    header('Allow: GET, POST');
    ad_respond(false, 'method', 405, AD_BAJA_PAGINA, AD_BAJA_PAGINA);
}

/** Registra la baja si el correo existe y aún no está dado de baja. */
function ad_dar_de_baja(string $email): void
{
    $actual = ad_find_subscriber($email);
    if (is_array($actual) && ($actual['estado'] ?? '') !== 'baja') {
        ad_append_subscriber(['email' => $email, 'estado' => 'baja']);
    }
}

/** Devuelve el correo si el enlace firmado (e, t) es válido; si no, responde con error y termina. */
function ad_correo_del_enlace(): string
{
    $email = strtolower(ad_b64url_decode(ad_field('e', 240)));
    $token = ad_field('t', 80);
    if (!filter_var($email, FILTER_VALIDATE_EMAIL) || !preg_match('/^[a-f0-9]{64}$/', $token)) {
        ad_respond(false, 'security', 403, AD_BAJA_PAGINA, AD_BAJA_PAGINA);
    }
    if (!hash_equals(ad_token($email, 'baja'), $token)) ad_respond(false, 'security', 403, AD_BAJA_PAGINA, AD_BAJA_PAGINA);
    return $email;
}

if ($metodo === 'GET') {
    if (ad_rate_limited('news_baja', ad_client_ip(), 600, 20)) ad_respond(false, 'rate_limit', 429, AD_BAJA_PAGINA, AD_BAJA_PAGINA);
    ad_dar_de_baja(ad_correo_del_enlace());
    header('Location: ' . AD_BAJA_PAGINA . '?ok=1', true, 303);
    exit;
}

// POST
if (ad_request_too_large(8192)) ad_respond(false, 'too_large', 413, AD_BAJA_PAGINA, AD_BAJA_PAGINA);

$esUnClic = trim((string) ($_POST['List-Unsubscribe'] ?? '')) === 'One-Click' && isset($_GET['e'], $_GET['t']);
if ($esUnClic) {
    // Lo envía el cliente de correo (Gmail, Outlook...), así que no hay Origin ni formulario propio.
    if (ad_rate_limited('news_baja', ad_client_ip(), 600, 20)) {
        http_response_code(429);
        exit;
    }
    ad_dar_de_baja(ad_correo_del_enlace());
    http_response_code(200);
    exit;
}

// Formulario "perdí mi enlace".
$contentType = strtolower((string) ($_SERVER['CONTENT_TYPE'] ?? ''));
if (!str_starts_with($contentType, 'multipart/form-data') && !str_starts_with($contentType, 'application/x-www-form-urlencoded')) {
    ad_respond(false, 'content_type', 415, AD_BAJA_PAGINA, AD_BAJA_PAGINA);
}
if (!ad_is_same_origin()) ad_respond(false, 'security', 403, AD_BAJA_PAGINA, AD_BAJA_PAGINA);
if (ad_field('website') !== '' || ad_field('address_line_2') !== '') ad_respond(true, 'ok', 200, AD_BAJA_OK, AD_BAJA_PAGINA);

$ip = ad_client_ip();
if (ad_rate_limited('baja_burst', $ip, 900, 3) || ad_rate_limited('baja_day', $ip, 86400, 10)) {
    ad_respond(false, 'rate_limit', 429, AD_BAJA_OK, AD_BAJA_PAGINA);
}

$email = strtolower(ad_field('email', 160));
if (!filter_var($email, FILTER_VALIDATE_EMAIL)) ad_respond(false, 'invalid', 422, AD_BAJA_OK, AD_BAJA_PAGINA);
if (ad_rate_limited('baja_email', hash('sha256', $email), 86400, 2)) ad_respond(true, 'ok', 200, AD_BAJA_OK, AD_BAJA_PAGINA);

$actual = ad_find_subscriber($email);
if (is_array($actual) && ($actual['estado'] ?? '') !== 'baja') {
    $enlace = ad_enlace_baja($email);
    $texto = "Hola,\n\n"
        . "Pediste darte de baja del boletín de " . AD_SITE_NAME . ".\n\n"
        . "Para confirmarlo, abre este enlace:\n" . $enlace . "\n\n"
        . "Si no fuiste tú, ignora este mensaje y seguirás suscrito.\n\n"
        . "--\n" . AD_SITE_NAME . " · " . AD_SITE_URL . "\n";
    $html = ad_plantilla_correo(
        'Confirma tu baja',
        ['Hola,', 'Pediste darte de baja del boletín de ' . AD_SITE_NAME . '.', 'Para confirmarlo, pulsa el botón.'],
        'Darme de baja',
        $enlace,
        'Si no fuiste tú, ignora este mensaje y seguirás suscrito.'
    );
    ad_send_mail($email, 'Confirma tu baja de ' . AD_SITE_NAME, $texto, '', $html, $enlace);
}

// Misma respuesta exista o no el correo.
ad_respond(true, 'ok', 200, AD_BAJA_OK, AD_BAJA_PAGINA);
