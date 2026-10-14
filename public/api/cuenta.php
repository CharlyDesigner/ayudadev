<?php
/**
 * API de cuentas de AyudaDev. JSON de entrada y de salida.
 *
 *   GET  ?a=estado | yo | datos | exportar
 *   POST ?a=registro | completar | entrar | entrar_2fa | salir | recuperar | restablecer | datos
 *             | clave_cambiar | tfa_iniciar | tfa_activar | tfa_desactivar | tfa_respaldo
 *             | github_desvincular | borrar
 *
 * Los POST exigen Content-Type application/json y origen propio; los que ya tienen sesión,
 * además el token CSRF de la sesión en la cabecera X-CSRF-Token.
 */

declare(strict_types=1);

require __DIR__ . '/_cuentas.php';

ad_api_headers();

const AD_ACCIONES_GET = ['estado', 'yo', 'datos', 'exportar'];
const AD_ACCIONES_POST = [
    'registro', 'completar', 'entrar', 'entrar_2fa', 'salir', 'recuperar', 'restablecer', 'datos',
    'clave_cambiar', 'tfa_iniciar', 'tfa_activar', 'tfa_desactivar', 'tfa_respaldo', 'github_desvincular', 'borrar',
];

/** Responde ya y deja que el resto del trabajo (enviar correos) siga sin que se note la diferencia de tiempo. */
function ad_responder_y_seguir(string $code = 'ok'): void
{
    http_response_code(200);
    header('Content-Type: application/json; charset=utf-8');
    $cuerpo = json_encode(['ok' => true, 'code' => $code]);
    header('Content-Length: ' . strlen((string) $cuerpo));
    header('Connection: close');
    echo $cuerpo;
    if (function_exists('fastcgi_finish_request')) fastcgi_finish_request();
    elseif (function_exists('litespeed_finish_request')) litespeed_finish_request();
    else @flush();
}

/** Confirma la identidad antes de una acción delicada: contraseña, o código del doble factor si no tiene contraseña. */
function ad_reautenticar(PDO $db, array $u, array $d, bool $pedirCorreoSiNada = false): void
{
    ad_limite_o_salir('cta_reauth', 'u' . $u['id'], 600, 8);
    if ($u['pass_hash'] !== null && $u['pass_hash'] !== '') {
        if (!ad_clave_verificar(ad_dato_clave($d, 'clave'), (string) $u['pass_hash'])) ad_json_salir(false, 'clave_incorrecta', 403);
        return;
    }
    if ((int) $u['totp_activo'] === 1) {
        if (!ad_segundo_factor_ok($db, $u, ad_dato_texto($d, 'codigo', 32))) ad_json_salir(false, 'codigo', 403);
        return;
    }
    if ($pedirCorreoSiNada && strtolower(ad_dato_texto($d, 'confirmar_correo', 160)) !== strtolower((string) $u['email'])) {
        ad_json_salir(false, 'correo_no_coincide', 403);
    }
}

/** Resultado de una contraseña correcta: o se pide el código del doble factor, o se abre la sesión. */
function ad_entrada_completa(PDO $db, array $u): never
{
    if ((int) $u['totp_activo'] === 1) {
        ad_json_salir(true, 'totp', 200, ['reto' => ad_reto_crear((int) $u['id'])]);
    }
    $csrf = ad_sesion_crear($db, (int) $u['id']);
    ad_cuenta_evento('entrada', (int) $u['id']);
    ad_json_salir(true, 'ok', 200, ['csrf' => $csrf]);
}

function accion_estado(): never
{
    $db = ad_db();
    ad_json_salir(true, 'ok', 200, ['disponible' => $db !== null, 'github' => $db !== null && ad_github_config() !== null]);
}

function accion_registro(PDO $db): never
{
    $d = ad_json_entrada();
    if (ad_formulario_publico($d)) ad_json_salir(true, 'ok');
    $ip = ad_client_ip();
    if (ad_rate_limited('cta_reg_burst', $ip, 900, 3) || ad_rate_limited('cta_reg_dia', $ip, 86400, 10) || ad_rate_limited('cta_reg_global', 'all', 86400, 300)) {
        ad_json_salir(false, 'rate_limit', 429);
    }
    $email = strtolower(ad_dato_texto($d, 'email', 160));
    if (!ad_correo_valido($email)) ad_json_salir(false, 'invalid', 422);
    if (($d['consentimiento'] ?? false) !== true) ad_json_salir(false, 'consent', 422);
    ad_limite_o_salir('cta_reg_email', hash('sha256', $email), 86400, 3);

    ad_responder_y_seguir();
    if (ad_usuario_por_email($db, $email) !== null) {
        ad_cuenta_correo(
            $email,
            'Ya tienes una cuenta en ' . AD_SITE_NAME,
            'Ya tienes una cuenta',
            ['Hola,', 'Alguien intentó crear una cuenta en ' . AD_SITE_NAME . ' con este correo, pero ya existe una.', 'Si fuiste tú, entra con tu contraseña o con GitHub. Si olvidaste la contraseña, puedes restablecerla desde la página de entrada.'],
            'Ir a mi cuenta',
            AD_SITE_URL . '/cuenta/',
            'Si no fuiste tú, ignora este mensaje: no pasó nada.'
        );
    } else {
        $token = ad_token_crear($db, 'registro', $email, AD_VIGENCIA_REGISTRO);
        ad_cuenta_correo(
            $email,
            'Confirma tu correo para crear tu cuenta en ' . AD_SITE_NAME,
            'Crea tu cuenta',
            ['Hola,', 'Alguien (esperamos que tú) quiere crear una cuenta en ' . AD_SITE_NAME . ' con este correo.', 'Pulsa el botón para elegir tu contraseña. El enlace funciona una sola vez y caduca en 24 horas.'],
            'Crear mi cuenta',
            AD_SITE_URL . '/cuenta/registro/?t=' . $token,
            'Si no fuiste tú, ignora este mensaje: no se crea nada hasta que abras el enlace.'
        );
    }
    ad_cuenta_evento('registro_pedido');
    exit;
}

function accion_completar(PDO $db): never
{
    $d = ad_json_entrada();
    if (!ad_is_same_origin()) ad_json_salir(false, 'security', 403);
    ad_limite_o_salir('cta_completar', ad_client_ip(), 600, 20);
    $token = ad_dato_texto($d, 't', 64);
    $email = ad_token_leer($db, 'registro', $token);
    if ($email === null) ad_json_salir(false, 'token', 400);
    $clave = ad_dato_clave($d, 'clave');
    $problema = ad_clave_problema($clave, $email);
    if ($problema !== '') ad_json_salir(false, $problema, 422);
    if (ad_usuario_por_email($db, $email) !== null) {
        ad_token_gastar($db, $token);
        ad_json_salir(false, 'existe', 409);
    }

    $hash = ad_clave_hash($clave);
    $nombre = ad_dato_texto($d, 'nombre', 60);
    $db->beginTransaction();
    try {
        if (!ad_token_gastar($db, $token)) {
            $db->rollBack();
            ad_json_salir(false, 'token', 400);
        }
        $db->prepare('INSERT INTO usuarios (email, nombre, pass_hash, creado_en) VALUES (?,?,?,?)')
            ->execute([$email, $nombre, $hash, time()]);
        $uid = (int) $db->lastInsertId();
        $db->commit();
    } catch (PDOException) {
        if ($db->inTransaction()) $db->rollBack();
        ad_json_salir(false, 'existe', 409);
    }
    $csrf = ad_sesion_crear($db, $uid);
    ad_cuenta_evento('cuenta_creada', $uid);
    ad_json_salir(true, 'ok', 200, ['csrf' => $csrf]);
}

function accion_entrar(PDO $db): never
{
    $d = ad_json_entrada();
    if (!ad_is_same_origin()) ad_json_salir(false, 'security', 403);
    $email = strtolower(ad_dato_texto($d, 'email', 160));
    ad_limite_o_salir('cta_login_ip', ad_client_ip(), 900, 20);
    ad_limite_o_salir('cta_login_email', hash('sha256', $email), 900, 8);
    $clave = ad_dato_clave($d, 'clave');
    $u = filter_var($email, FILTER_VALIDATE_EMAIL) && strlen($clave) <= 1024 ? ad_usuario_por_email($db, $email) : null;
    if ($u === null || $u['pass_hash'] === null || $u['pass_hash'] === '') {
        ad_clave_simular($clave);
        ad_cuenta_evento('entrada_fallida');
        ad_json_salir(false, 'credenciales', 401);
    }
    if (!ad_clave_verificar($clave, (string) $u['pass_hash'])) {
        ad_cuenta_evento('entrada_fallida', (int) $u['id']);
        ad_json_salir(false, 'credenciales', 401);
    }
    if (ad_clave_necesita_rehash((string) $u['pass_hash'])) {
        $db->prepare('UPDATE usuarios SET pass_hash = ? WHERE id = ?')->execute([ad_clave_hash($clave), $u['id']]);
    }
    ad_entrada_completa($db, $u);
}

function accion_entrar_2fa(PDO $db): never
{
    $d = ad_json_entrada();
    if (!ad_is_same_origin()) ad_json_salir(false, 'security', 403);
    ad_limite_o_salir('cta_2fa_ip', ad_client_ip(), 900, 30);
    $uid = ad_reto_leer(ad_dato_texto($d, 'reto', 400));
    if ($uid === null) ad_json_salir(false, 'reto', 401);
    ad_limite_o_salir('cta_2fa_user', 'u' . $uid, 600, 6);
    $u = ad_usuario_por_id($db, $uid);
    if ($u === null || !ad_segundo_factor_ok($db, $u, ad_dato_texto($d, 'codigo', 32))) {
        ad_cuenta_evento('codigo_fallido', $uid);
        ad_json_salir(false, 'codigo', 401);
    }
    $csrf = ad_sesion_crear($db, $uid);
    ad_cuenta_evento('entrada', $uid);
    ad_json_salir(true, 'ok', 200, ['csrf' => $csrf]);
}

function accion_salir(PDO $db): never
{
    ad_json_entrada();
    if (!ad_is_same_origin()) ad_json_salir(false, 'security', 403);
    ad_sesion_cerrar($db);
    ad_json_salir(true, 'ok');
}

function accion_recuperar(PDO $db): never
{
    $d = ad_json_entrada();
    if (ad_formulario_publico($d)) ad_json_salir(true, 'ok');
    $ip = ad_client_ip();
    if (ad_rate_limited('cta_rec_burst', $ip, 900, 3) || ad_rate_limited('cta_rec_dia', $ip, 86400, 10) || ad_rate_limited('cta_rec_global', 'all', 86400, 300)) {
        ad_json_salir(false, 'rate_limit', 429);
    }
    $email = strtolower(ad_dato_texto($d, 'email', 160));
    if (!filter_var($email, FILTER_VALIDATE_EMAIL)) ad_json_salir(false, 'invalid', 422);
    if (ad_rate_limited('cta_rec_email', hash('sha256', $email), 86400, 3)) ad_json_salir(true, 'ok');

    ad_responder_y_seguir();
    $u = ad_usuario_por_email($db, $email);
    if ($u !== null) {
        $token = ad_token_crear($db, 'recuperar', $email, AD_VIGENCIA_RECUPERAR);
        ad_cuenta_correo(
            $email,
            'Restablece tu contraseña de ' . AD_SITE_NAME,
            'Restablece tu contraseña',
            ['Hola,', 'Pediste elegir una contraseña nueva para tu cuenta de ' . AD_SITE_NAME . '.', 'Pulsa el botón para escribirla. El enlace funciona una sola vez y caduca en 1 hora.'],
            'Elegir contraseña nueva',
            AD_SITE_URL . '/cuenta/clave/?t=' . $token,
            'Si no fuiste tú, ignora este mensaje: tu contraseña no cambia.'
        );
        ad_cuenta_evento('recuperacion_pedida', (int) $u['id']);
    }
    exit;
}

function accion_restablecer(PDO $db): never
{
    $d = ad_json_entrada();
    if (!ad_is_same_origin()) ad_json_salir(false, 'security', 403);
    ad_limite_o_salir('cta_restablecer', ad_client_ip(), 600, 20);
    $token = ad_dato_texto($d, 't', 64);
    $email = ad_token_leer($db, 'recuperar', $token);
    if ($email === null) ad_json_salir(false, 'token', 400);
    $u = ad_usuario_por_email($db, $email);
    if ($u === null) ad_json_salir(false, 'token', 400);
    $clave = ad_dato_clave($d, 'clave');
    $problema = ad_clave_problema($clave, $email);
    if ($problema !== '') ad_json_salir(false, $problema, 422);

    $hash = ad_clave_hash($clave);
    $db->beginTransaction();
    if (!ad_token_gastar($db, $token)) {
        $db->rollBack();
        ad_json_salir(false, 'token', 400);
    }
    $db->prepare('UPDATE usuarios SET pass_hash = ? WHERE id = ?')->execute([$hash, $u['id']]);
    ad_sesiones_cerrar_otras($db, (int) $u['id']);
    $db->commit();
    ad_cuenta_evento('clave_restablecida', (int) $u['id']);
    ad_cuenta_aviso((string) $u['email'], 'La contraseña de tu cuenta se cambió con el enlace de recuperación y se cerraron todas tus sesiones.');
    ad_json_salir(true, 'ok');
}

function accion_yo(PDO $db): never
{
    $sesion = ad_sesion_exigir($db, false);
    ad_json_salir(true, 'ok', 200, ['usuario' => ad_usuario_publico($db, $sesion['usuario']), 'csrf' => $sesion['csrf']]);
}

/** @return string[] ids válidos y sin repetir; descarta lo que no cumple el formato. */
function ad_lista_ids(mixed $valor): array
{
    if (!is_array($valor)) return [];
    $limpios = [];
    foreach (array_slice($valor, 0, AD_MAX_ITEMS) as $id) {
        if (ad_dato_id_valido($id)) $limpios[$id] = true;
    }
    return array_keys($limpios);
}

function accion_datos(PDO $db, bool $cambia): never
{
    $sesion = ad_sesion_exigir($db, $cambia);
    $uid = (int) $sesion['usuario']['id'];
    if ($cambia) {
        if (!ad_is_same_origin()) ad_json_salir(false, 'security', 403);
        ad_limite_o_salir('cta_datos', 'u' . $uid, 60, 120);
        $d = ad_json_entrada(60000);
        foreach (AD_DATOS_TIPOS as $tipo) {
            $bloque = is_array($d[$tipo] ?? null) ? $d[$tipo] : [];
            if (!ad_datos_aplicar($db, $uid, $tipo, ad_lista_ids($bloque['add'] ?? []), ad_lista_ids($bloque['remove'] ?? []))) {
                ad_json_salir(false, 'limite', 413);
            }
        }
    }
    ad_json_salir(true, 'ok', 200, ad_datos_leer($db, $uid));
}

function accion_clave_cambiar(PDO $db): never
{
    $sesion = ad_sesion_exigir($db, true);
    $d = ad_json_entrada();
    if (!ad_is_same_origin()) ad_json_salir(false, 'security', 403);
    $u = $sesion['usuario'];
    ad_reautenticar($db, $u, $d);
    $nueva = ad_dato_clave($d, 'nueva');
    $problema = ad_clave_problema($nueva, (string) $u['email']);
    if ($problema !== '') ad_json_salir(false, $problema, 422);
    $db->prepare('UPDATE usuarios SET pass_hash = ? WHERE id = ?')->execute([ad_clave_hash($nueva), $u['id']]);
    ad_sesiones_cerrar_otras($db, (int) $u['id'], $sesion['hash']);
    ad_cuenta_evento('clave_cambiada', (int) $u['id']);
    ad_cuenta_aviso((string) $u['email'], 'La contraseña de tu cuenta se cambió y se cerraron tus otras sesiones.');
    ad_json_salir(true, 'ok');
}

function accion_tfa_iniciar(PDO $db): never
{
    $sesion = ad_sesion_exigir($db, true);
    $d = ad_json_entrada();
    if (!ad_is_same_origin()) ad_json_salir(false, 'security', 403);
    $u = $sesion['usuario'];
    if ((int) $u['totp_activo'] === 1) ad_json_salir(false, 'ya_activo', 409);
    if ($u['pass_hash'] !== null && $u['pass_hash'] !== '') ad_reautenticar($db, $u, $d);
    $secreto = ad_totp_secreto_nuevo();
    $db->prepare('UPDATE usuarios SET totp_pendiente = ? WHERE id = ?')->execute([ad_cifrar($secreto, 'totp:' . $u['id']), $u['id']]);
    ad_json_salir(true, 'ok', 200, ['secreto' => $secreto, 'uri' => ad_totp_uri($secreto, (string) $u['email'], AD_SITE_NAME)]);
}

function accion_tfa_activar(PDO $db): never
{
    $sesion = ad_sesion_exigir($db, true);
    $d = ad_json_entrada();
    if (!ad_is_same_origin()) ad_json_salir(false, 'security', 403);
    $u = $sesion['usuario'];
    ad_limite_o_salir('cta_tfa_activar', 'u' . $u['id'], 600, 8);
    if ((int) $u['totp_activo'] === 1) ad_json_salir(false, 'ya_activo', 409);
    $secreto = is_string($u['totp_pendiente']) ? ad_descifrar($u['totp_pendiente'], 'totp:' . $u['id']) : null;
    if ($secreto === null) ad_json_salir(false, 'sin_pendiente', 409);
    $paso = ad_totp_verificar($secreto, ad_dato_texto($d, 'codigo', 16));
    if ($paso === null) ad_json_salir(false, 'codigo', 422);

    $db->prepare('UPDATE usuarios SET totp_secreto = ?, totp_pendiente = NULL, totp_activo = 1, totp_ultimo_paso = ? WHERE id = ?')
        ->execute([$u['totp_pendiente'], $paso, $u['id']]);
    $codigos = ad_respaldo_regenerar($db, (int) $u['id']);
    ad_cuenta_evento('tfa_activado', (int) $u['id']);
    ad_cuenta_aviso((string) $u['email'], 'Activaste el doble factor con una app de autenticación.');
    ad_json_salir(true, 'ok', 200, ['respaldo' => $codigos]);
}

function accion_tfa_desactivar(PDO $db): never
{
    $sesion = ad_sesion_exigir($db, true);
    $d = ad_json_entrada();
    if (!ad_is_same_origin()) ad_json_salir(false, 'security', 403);
    $u = $sesion['usuario'];
    if ((int) $u['totp_activo'] !== 1) ad_json_salir(false, 'no_activo', 409);
    ad_limite_o_salir('cta_tfa_quitar', 'u' . $u['id'], 600, 8);
    if ($u['pass_hash'] !== null && $u['pass_hash'] !== '' && !ad_clave_verificar(ad_dato_clave($d, 'clave'), (string) $u['pass_hash'])) {
        ad_json_salir(false, 'clave_incorrecta', 403);
    }
    if (!ad_segundo_factor_ok($db, $u, ad_dato_texto($d, 'codigo', 32))) ad_json_salir(false, 'codigo', 403);

    $db->beginTransaction();
    $db->prepare('UPDATE usuarios SET totp_secreto = NULL, totp_pendiente = NULL, totp_activo = 0, totp_ultimo_paso = 0 WHERE id = ?')->execute([$u['id']]);
    $db->prepare('DELETE FROM respaldo WHERE usuario_id = ?')->execute([$u['id']]);
    $db->commit();
    ad_cuenta_evento('tfa_desactivado', (int) $u['id']);
    ad_cuenta_aviso((string) $u['email'], 'Desactivaste el doble factor.');
    ad_json_salir(true, 'ok');
}

function accion_tfa_respaldo(PDO $db): never
{
    $sesion = ad_sesion_exigir($db, true);
    $d = ad_json_entrada();
    if (!ad_is_same_origin()) ad_json_salir(false, 'security', 403);
    $u = $sesion['usuario'];
    if ((int) $u['totp_activo'] !== 1) ad_json_salir(false, 'no_activo', 409);
    ad_limite_o_salir('cta_tfa_respaldo', 'u' . $u['id'], 600, 8);
    if (!ad_segundo_factor_ok($db, $u, ad_dato_texto($d, 'codigo', 32))) ad_json_salir(false, 'codigo', 403);
    $codigos = ad_respaldo_regenerar($db, (int) $u['id']);
    ad_cuenta_evento('respaldo_regenerado', (int) $u['id']);
    ad_cuenta_aviso((string) $u['email'], 'Generaste códigos de respaldo nuevos; los anteriores dejaron de servir.');
    ad_json_salir(true, 'ok', 200, ['respaldo' => $codigos]);
}

function accion_github_desvincular(PDO $db): never
{
    $sesion = ad_sesion_exigir($db, true);
    $d = ad_json_entrada();
    if (!ad_is_same_origin()) ad_json_salir(false, 'security', 403);
    $u = $sesion['usuario'];
    if ($u['pass_hash'] === null || $u['pass_hash'] === '') ad_json_salir(false, 'sin_clave', 409);
    ad_reautenticar($db, $u, $d);
    $db->prepare('DELETE FROM identidades WHERE usuario_id = ? AND proveedor = \'github\'')->execute([$u['id']]);
    ad_cuenta_evento('github_desvinculado', (int) $u['id']);
    ad_cuenta_aviso((string) $u['email'], 'Desvinculaste GitHub de tu cuenta.');
    ad_json_salir(true, 'ok');
}

function accion_borrar(PDO $db): never
{
    $sesion = ad_sesion_exigir($db, true);
    $d = ad_json_entrada();
    if (!ad_is_same_origin()) ad_json_salir(false, 'security', 403);
    $u = $sesion['usuario'];
    if (ad_dato_texto($d, 'confirmacion', 16) !== 'BORRAR') ad_json_salir(false, 'confirmacion', 422);
    ad_reautenticar($db, $u, $d, true);
    $db->beginTransaction();
    $db->prepare('DELETE FROM tokens WHERE email = ?')->execute([strtolower((string) $u['email'])]);
    $db->prepare('DELETE FROM usuarios WHERE id = ?')->execute([$u['id']]);
    $db->commit();
    ad_cookie(AD_COOKIE_SESION, '', 1);
    ad_cuenta_evento('cuenta_borrada');
    ad_cuenta_correo(
        (string) $u['email'],
        'Borramos tu cuenta de ' . AD_SITE_NAME,
        'Tu cuenta se borró',
        ['Hola,', 'Borramos tu cuenta de ' . AD_SITE_NAME . ' y todo lo que tenía: contraseña, vínculo con GitHub, doble factor, progreso y favoritos.', 'Tu suscripción al boletín, si la tienes, es aparte y se gestiona con el enlace de baja de cada correo.'],
        'Ir al sitio',
        AD_SITE_URL . '/',
        'Si no fuiste tú, escríbenos cuanto antes.'
    );
    ad_json_salir(true, 'ok');
}

function accion_exportar(PDO $db): never
{
    $sesion = ad_sesion_exigir($db, false);
    $u = $sesion['usuario'];
    $publico = ad_usuario_publico($db, $u);
    $paquete = [
        'exportado_en' => gmdate('c'),
        'cuenta' => [
            'correo' => $publico['email'],
            'nombre' => $publico['nombre'],
            'creada_en' => gmdate('c', (int) $u['creado_en']),
            'ultimo_acceso' => $u['ultimo_acceso'] === null ? null : gmdate('c', (int) $u['ultimo_acceso']),
            'contrasena_definida' => $publico['tiene_clave'],
            'doble_factor' => $publico['totp'],
            'github' => $publico['github'],
        ],
        'datos' => ad_datos_leer($db, (int) $u['id']),
    ];
    header('Content-Type: application/json; charset=utf-8');
    header('Content-Disposition: attachment; filename="ayudadev-mi-cuenta.json"');
    echo json_encode($paquete, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_PRETTY_PRINT);
    exit;
}

/* ------------------------------------------------------------------ enrutado */

$metodo = $_SERVER['REQUEST_METHOD'] ?? '';
if ($metodo !== 'GET' && $metodo !== 'POST') {
    header('Allow: GET, POST');
    ad_json_salir(false, 'method', 405);
}
$accion = preg_replace('/[^a-z0-9_]/', '', strtolower((string) ($_GET['a'] ?? ''))) ?? '';
$permitidas = $metodo === 'GET' ? AD_ACCIONES_GET : AD_ACCIONES_POST;
if (!in_array($accion, $permitidas, true)) ad_json_salir(false, 'accion', $metodo === 'GET' && in_array($accion, AD_ACCIONES_POST, true) ? 405 : 404);

if ($accion === 'estado') accion_estado();

$db = ad_db();
if ($db === null) ad_json_salir(false, 'no_disponible', 503);

match ($accion) {
    'yo' => accion_yo($db),
    'exportar' => accion_exportar($db),
    'datos' => accion_datos($db, $metodo === 'POST'),
    'registro' => accion_registro($db),
    'completar' => accion_completar($db),
    'entrar' => accion_entrar($db),
    'entrar_2fa' => accion_entrar_2fa($db),
    'salir' => accion_salir($db),
    'recuperar' => accion_recuperar($db),
    'restablecer' => accion_restablecer($db),
    'clave_cambiar' => accion_clave_cambiar($db),
    'tfa_iniciar' => accion_tfa_iniciar($db),
    'tfa_activar' => accion_tfa_activar($db),
    'tfa_desactivar' => accion_tfa_desactivar($db),
    'tfa_respaldo' => accion_tfa_respaldo($db),
    'github_desvincular' => accion_github_desvincular($db),
    'borrar' => accion_borrar($db),
};
