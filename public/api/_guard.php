<?php
/**
 * Controles de seguridad compartidos por los endpoints públicos de AyudaDev.
 * Este archivo se bloquea por completo desde .htaccess.
 * Derivado del módulo de seguridad de Mark House.
 */

declare(strict_types=1);

const AD_ALLOWED_HOSTS = ['dev.carlosnavarro.site'];

function ad_api_headers(): void
{
    header('Cache-Control: no-store, max-age=0');
    header('Pragma: no-cache');
    header('X-Content-Type-Options: nosniff');
    header('X-Robots-Tag: noindex, nofollow, nosnippet');
}

function ad_client_ip(): string
{
    $ip = (string) ($_SERVER['REMOTE_ADDR'] ?? '0.0.0.0');
    return filter_var($ip, FILTER_VALIDATE_IP) ? $ip : '0.0.0.0';
}

/** Origin tiene prioridad; Sec-Fetch-Site cubre navegadores que omiten Referer. */
function ad_is_same_origin(): bool
{
    $origin = trim((string) ($_SERVER['HTTP_ORIGIN'] ?? ''));
    $referer = trim((string) ($_SERVER['HTTP_REFERER'] ?? ''));
    $source = $origin !== '' ? $origin : $referer;

    if ($source !== '') {
        $host = strtolower((string) (parse_url($source, PHP_URL_HOST) ?: ''));
        $scheme = strtolower((string) (parse_url($source, PHP_URL_SCHEME) ?: ''));
        return $scheme === 'https' && in_array($host, AD_ALLOWED_HOSTS, true);
    }

    return strtolower((string) ($_SERVER['HTTP_SEC_FETCH_SITE'] ?? '')) === 'same-origin';
}

function ad_request_too_large(int $maxBytes): bool
{
    $length = filter_var($_SERVER['CONTENT_LENGTH'] ?? null, FILTER_VALIDATE_INT);
    return is_int($length) && $length > $maxBytes;
}

/** Limitador atómico por ventana deslizante. Los identificadores se guardan como hash. */
function ad_rate_limited(string $bucket, string $identity, int $windowSeconds, int $limit): bool
{
    if ($limit < 1) return true;
    $safeBucket = preg_replace('/[^a-z0-9_-]/i', '', $bucket) ?: 'api';
    $file = sys_get_temp_dir() . '/ad_guard_' . $safeBucket . '_' . hash('sha256', $identity);
    $fh = @fopen($file, 'c+');
    if ($fh === false) return false;
    if (!flock($fh, LOCK_EX)) {
        fclose($fh);
        return false;
    }

    rewind($fh);
    $stored = stream_get_contents($fh);
    $decoded = json_decode($stored !== false ? $stored : '', true);
    $now = time();
    $hits = is_array($decoded) ? array_values(array_filter(
        array_map('intval', $decoded),
        static fn (int $timestamp): bool => $timestamp > $now - $windowSeconds
    )) : [];
    $limited = count($hits) >= $limit;
    if (!$limited) $hits[] = $now;

    ftruncate($fh, 0);
    rewind($fh);
    fwrite($fh, (string) json_encode($hits));
    fflush($fh);
    flock($fh, LOCK_UN);
    fclose($fh);
    @chmod($file, 0600);
    return $limited;
}

function ad_field(string $name, int $max = 500): string
{
    $value = $_POST[$name] ?? $_GET[$name] ?? '';
    if (is_array($value)) $value = '';
    $value = strip_tags((string) $value);
    $value = preg_replace('/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/u', '', $value) ?? '';
    $value = trim(preg_replace('/[\r\n\t]+/', ' ', $value) ?? '');
    return function_exists('mb_substr') ? mb_substr($value, 0, $max) : substr($value, 0, $max);
}
