<?php
/** Confirma una suscripción (segundo paso del doble opt-in). Solo GET. */

declare(strict_types=1);

require __DIR__ . '/_newsletter.php';

ad_api_headers();

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'GET') {
    header('Allow: GET');
    ad_respond(false, 'method', 405, '/newsletter/confirmado/', '/newsletter/');
}
if (ad_rate_limited('news_confirm', ad_client_ip(), 600, 20)) ad_respond(false, 'rate_limit', 429, '/newsletter/confirmado/', '/newsletter/');

$email = strtolower(ad_b64url_decode(ad_field('e', 240)));
$token = ad_field('t', 80);
if (!filter_var($email, FILTER_VALIDATE_EMAIL) || !preg_match('/^[a-f0-9]{64}$/', $token)) {
    ad_respond(false, 'security', 403, '/newsletter/confirmado/', '/newsletter/');
}
if (!hash_equals(ad_token($email, 'confirmar'), $token)) ad_respond(false, 'security', 403, '/newsletter/confirmado/', '/newsletter/');

$actual = ad_find_subscriber($email);
if (!is_array($actual)) ad_respond(false, 'security', 403, '/newsletter/confirmado/', '/newsletter/');

if (($actual['estado'] ?? '') !== 'confirmado') {
    ad_append_subscriber(['email' => $email, 'estado' => 'confirmado', 'origen' => $actual['origen'] ?? '/']);
}

header('Location: /newsletter/confirmado/', true, 303);
exit;
