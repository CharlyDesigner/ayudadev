<?php
/** Baja del boletín desde el enlace de cada correo. Solo GET. */

declare(strict_types=1);

require __DIR__ . '/_newsletter.php';

ad_api_headers();

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'GET') {
    header('Allow: GET');
    ad_respond(false, 'method', 405, '/newsletter/baja/', '/newsletter/');
}
if (ad_rate_limited('news_baja', ad_client_ip(), 600, 20)) ad_respond(false, 'rate_limit', 429, '/newsletter/baja/', '/newsletter/');

$email = strtolower(ad_b64url_decode(ad_field('e', 240)));
$token = ad_field('t', 80);
if (!filter_var($email, FILTER_VALIDATE_EMAIL) || !preg_match('/^[a-f0-9]{64}$/', $token)) {
    ad_respond(false, 'security', 403, '/newsletter/baja/', '/newsletter/');
}
if (!hash_equals(ad_token($email, 'baja'), $token)) ad_respond(false, 'security', 403, '/newsletter/baja/', '/newsletter/');

$actual = ad_find_subscriber($email);
if (is_array($actual) && ($actual['estado'] ?? '') !== 'baja') {
    ad_append_subscriber(['email' => $email, 'estado' => 'baja']);
}

header('Location: /newsletter/baja/?ok=1', true, 303);
exit;
