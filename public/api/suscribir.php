<?php
/**
 * Alta en el boletín (doble opt-in). Solo POST desde el propio sitio.
 * Valida, limita, guarda como "pendiente" y envía el correo de confirmación.
 */

declare(strict_types=1);

require __DIR__ . '/_newsletter.php';

ad_api_headers();

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
    header('Allow: POST');
    ad_respond(false, 'method', 405);
}
if (ad_request_too_large(8192)) ad_respond(false, 'too_large', 413);

$contentType = strtolower((string) ($_SERVER['CONTENT_TYPE'] ?? ''));
if (!str_starts_with($contentType, 'multipart/form-data') && !str_starts_with($contentType, 'application/x-www-form-urlencoded')) {
    ad_respond(false, 'content_type', 415);
}
if (!ad_is_same_origin()) ad_respond(false, 'security', 403);

// Trampas invisibles: se finge éxito para que el bot no aprenda qué lo detuvo.
if (ad_field('website') !== '' || ad_field('address_line_2') !== '') ad_respond(true, 'ok');

// Tiempo mínimo desde que se dibujó el formulario (3 s) y máximo (2 h).
$ts = filter_var(ad_field('_ts', 20), FILTER_VALIDATE_INT);
$edad = is_int($ts) ? time() - $ts : -1;
if ($edad < 3) ad_respond(false, 'too_fast', 422);
if ($edad > 7200) ad_respond(false, 'security', 403);

$ip = ad_client_ip();
if (
    ad_rate_limited('news_burst', $ip, 900, 3)
    || ad_rate_limited('news_day', $ip, 86400, 10)
    || ad_rate_limited('news_global', 'all', 86400, 300)
) {
    ad_respond(false, 'rate_limit', 429);
}

$email = strtolower(ad_field('email', 160));
if (!filter_var($email, FILTER_VALIDATE_EMAIL)) ad_respond(false, 'invalid', 422);
$dominio = substr($email, strrpos($email, '@') + 1);
if (function_exists('checkdnsrr') && !checkdnsrr($dominio, 'MX') && !checkdnsrr($dominio, 'A')) ad_respond(false, 'invalid', 422);
if (ad_field('consentimiento', 2) !== '1') ad_respond(false, 'consent', 422);

if (ad_rate_limited('news_email', hash('sha256', $email), 86400, 2)) ad_respond(false, 'rate_limit', 429);

$actual = ad_find_subscriber($email);
if (is_array($actual) && ($actual['estado'] ?? '') === 'confirmado') {
    // Ya está dentro: no se revela nada distinto.
    ad_respond(true, 'ok');
}

$origen = ad_field('origen', 120);
if (!preg_match('#^/[a-z0-9/_.-]*$#i', $origen)) $origen = '/';

$guardado = ad_append_subscriber([
    'email' => $email,
    'estado' => 'pendiente',
    'origen' => $origen,
    'ip_hash' => hash('sha256', $ip),
    'ua_hash' => hash('sha256', (string) ($_SERVER['HTTP_USER_AGENT'] ?? '')),
]);
if (!$guardado) ad_respond(false, 'error', 500);

$enlace = AD_SITE_URL . '/api/confirmar.php?e=' . ad_b64url($email) . '&t=' . ad_token($email, 'confirmar');
$cuerpo = "Hola,\n\n"
    . "Alguien (esperamos que tú) pidió recibir el boletín de " . AD_SITE_NAME . " con este correo.\n\n"
    . "Para confirmar, abre este enlace:\n" . $enlace . "\n\n"
    . "Si no fuiste tú, ignora este mensaje y no recibirás nada más.\n\n"
    . "--\n" . AD_SITE_NAME . " · " . AD_SITE_URL . "\n";

$enviado = ad_send_mail($email, 'Confirma tu suscripción a ' . AD_SITE_NAME, $cuerpo);
if (!$enviado) ad_respond(false, 'mail_failed', 500);

// Aviso interno (no bloquea la respuesta si falla).
ad_send_mail(AD_TO_EMAIL, 'Nueva suscripción pendiente en ' . AD_SITE_NAME, "Correo: " . $email . "\nOrigen: " . $origen . "\nFecha: " . gmdate('Y-m-d H:i') . " UTC\n");

ad_respond(true, 'ok');
