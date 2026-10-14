<?php
/**
 * TOTP (RFC 6238) para el doble factor de las cuentas. Funciones puras, sin estado.
 * Este archivo se bloquea por completo desde .htaccess.
 *
 * SHA-1, 6 dígitos y 30 segundos: es lo que aceptan todas las apps de autenticación.
 */

declare(strict_types=1);

const AD_TOTP_PERIODO = 30;
const AD_TOTP_DIGITOS = 6;
const AD_BASE32 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

function ad_base32_encode(string $bin): string
{
    $bits = '';
    foreach (str_split($bin) as $c) $bits .= str_pad(decbin(ord($c)), 8, '0', STR_PAD_LEFT);
    $salida = '';
    foreach (str_split($bits, 5) as $trozo) {
        $salida .= AD_BASE32[bindec(str_pad($trozo, 5, '0', STR_PAD_RIGHT))];
    }
    return $salida;
}

function ad_base32_decode(string $texto): string
{
    $texto = strtoupper(preg_replace('/[\s=-]+/', '', $texto) ?? '');
    $bits = '';
    foreach (str_split($texto) as $c) {
        $pos = strpos(AD_BASE32, $c);
        if ($pos === false) return '';
        $bits .= str_pad(decbin($pos), 5, '0', STR_PAD_LEFT);
    }
    $salida = '';
    foreach (str_split($bits, 8) as $byte) {
        if (strlen($byte) === 8) $salida .= chr(bindec($byte));
    }
    return $salida;
}

/** Secreto nuevo de 20 bytes (160 bits), en base32 para mostrarlo o meterlo en el QR. */
function ad_totp_secreto_nuevo(): string
{
    return ad_base32_encode(random_bytes(20));
}

/** Código de 6 dígitos para un paso de tiempo (floor(unix / 30)). */
function ad_totp_codigo(string $secretoBin, int $paso): string
{
    $mac = hash_hmac('sha1', pack('J', $paso), $secretoBin, true);
    $desplazamiento = ord($mac[19]) & 0x0F;
    $valor = ((ord($mac[$desplazamiento]) & 0x7F) << 24)
        | (ord($mac[$desplazamiento + 1]) << 16)
        | (ord($mac[$desplazamiento + 2]) << 8)
        | ord($mac[$desplazamiento + 3]);
    return str_pad((string) ($valor % (10 ** AD_TOTP_DIGITOS)), AD_TOTP_DIGITOS, '0', STR_PAD_LEFT);
}

/**
 * Verifica un código con tolerancia de un paso a cada lado (reloj desfasado).
 * Devuelve el paso que coincidió, o null. Un paso <= $ultimoPaso se rechaza: cada código sirve una vez.
 */
function ad_totp_verificar(string $secretoBase32, string $codigo, int $ultimoPaso = 0, ?int $ahora = null): ?int
{
    $codigo = preg_replace('/\s+/', '', $codigo) ?? '';
    if (!preg_match('/^\d{' . AD_TOTP_DIGITOS . '}$/', $codigo)) return null;
    $secreto = ad_base32_decode($secretoBase32);
    if ($secreto === '') return null;

    $actual = intdiv($ahora ?? time(), AD_TOTP_PERIODO);
    $encontrado = null;
    for ($delta = -1; $delta <= 1; $delta++) {
        $paso = $actual + $delta;
        // Se recorren los tres pasos siempre, para no filtrar cuál coincidió por el tiempo de respuesta.
        if (hash_equals(ad_totp_codigo($secreto, $paso), $codigo) && $paso > $ultimoPaso) {
            if ($encontrado === null || $paso > $encontrado) $encontrado = $paso;
        }
    }
    return $encontrado;
}

/** URI otpauth:// que leen las apps y los códigos QR. */
function ad_totp_uri(string $secretoBase32, string $cuenta, string $emisor): string
{
    return 'otpauth://totp/' . rawurlencode($emisor . ':' . $cuenta)
        . '?secret=' . $secretoBase32
        . '&issuer=' . rawurlencode($emisor)
        . '&algorithm=SHA1&digits=' . AD_TOTP_DIGITOS
        . '&period=' . AD_TOTP_PERIODO;
}

/** Códigos de respaldo legibles: 10 caracteres base32 en dos grupos (XXXXX-XXXXX). */
function ad_codigos_respaldo_nuevos(int $cantidad = 10): array
{
    $codigos = [];
    for ($i = 0; $i < $cantidad; $i++) {
        $texto = substr(ad_base32_encode(random_bytes(7)), 0, 10);
        $codigos[] = substr($texto, 0, 5) . '-' . substr($texto, 5, 5);
    }
    return $codigos;
}

/** Normaliza lo que escribe la persona: sin guiones ni espacios, mayúsculas. */
function ad_codigo_respaldo_normalizar(string $codigo): string
{
    return strtoupper(preg_replace('/[\s-]+/', '', $codigo) ?? '');
}
