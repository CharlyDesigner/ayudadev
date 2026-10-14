<?php
/**
 * Servidor MCP (Model Context Protocol) de AyudaDev, de solo lectura y sin estado.
 *
 * Transporte: Streamable HTTP simplificado (JSON-RPC 2.0 por POST, respuestas JSON).
 * Seguridad: no hay herramientas que escriban. `proponer_recurso` solo genera un archivo y un enlace
 * al editor de GitHub: quien lo abre inicia sesión con su cuenta y un humano revisa el pull request.
 * Lee los datos que genera el build en api/mcp/ (index.json y un .md por documento).
 */

declare(strict_types=1);

require __DIR__ . '/_guard.php';

const MCP_VERSIONES = ['2025-06-18', '2025-03-26', '2024-11-05'];
const MCP_VERSION_SERVIDOR = '1.0.0';
const MCP_TIPOS_DOC = ['guia', 'fundamento', 'hoja', 'reto', 'proyecto', 'carrera', 'ruta', 'ia', 'aprende', 'noticia'];
const MCP_TIPOS_BUSQUEDA = ['tema', 'recurso', 'termino', ...MCP_TIPOS_DOC];
const MCP_MAX_BODY = 65536;
const MCP_MAX_DOC = 120000;

/* ───────────── utilidades ───────────── */

function mcp_dir(): string
{
    $env = getenv('AYUDADEV_MCP_DIR');
    $dir = ($env !== false && $env !== '') ? $env : __DIR__ . '/mcp';
    return rtrim($dir, '/\\');
}

function mcp_json(mixed $v): string
{
    return (string) json_encode($v, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_INVALID_UTF8_SUBSTITUTE | JSON_PRESERVE_ZERO_FRACTION);
}

function mcp_norm(string $s): string
{
    $s = function_exists('mb_strtolower') ? mb_strtolower($s, 'UTF-8') : strtolower($s);
    return trim(strtr($s, [
        'á' => 'a', 'à' => 'a', 'ä' => 'a', 'â' => 'a', 'ã' => 'a', 'é' => 'e', 'è' => 'e', 'ë' => 'e', 'ê' => 'e',
        'í' => 'i', 'ì' => 'i', 'ï' => 'i', 'î' => 'i', 'ó' => 'o', 'ò' => 'o', 'ö' => 'o', 'ô' => 'o', 'õ' => 'o',
        'ú' => 'u', 'ù' => 'u', 'ü' => 'u', 'û' => 'u', 'ñ' => 'n', 'ç' => 'c',
    ]));
}

function mcp_slug(string $s): string
{
    $s = preg_replace('/[^a-z0-9]+/', '-', mcp_norm($s)) ?? '';
    return trim($s, '-');
}

function mcp_recortar(string $s, int $max): string
{
    if (function_exists('mb_strlen') && mb_strlen($s, 'UTF-8') <= $max) return $s;
    if (!function_exists('mb_substr')) return strlen($s) <= $max ? $s : substr($s, 0, $max - 1) . '…';
    return mb_substr($s, 0, $max - 1, 'UTF-8') . '…';
}

function mcp_indice(): array
{
    static $idx = null;
    if ($idx !== null) return $idx;
    $archivo = mcp_dir() . '/index.json';
    $crudo = is_file($archivo) ? file_get_contents($archivo) : false;
    $datos = is_string($crudo) ? json_decode($crudo, true) : null;
    if (!is_array($datos)) throw new RuntimeException('El índice de contenido no está disponible todavía.');
    return $idx = $datos;
}

function mcp_responder_http(int $status, ?array $cuerpo = null): never
{
    http_response_code($status);
    if ($cuerpo !== null) {
        header('Content-Type: application/json; charset=utf-8');
        echo mcp_json($cuerpo);
    }
    exit;
}

function mcp_error(mixed $id, int $codigo, string $mensaje): array
{
    return ['jsonrpc' => '2.0', 'id' => $id, 'error' => ['code' => $codigo, 'message' => $mensaje]];
}

/* ───────────── herramientas ───────────── */

function mcp_vacio(): stdClass
{
    return new stdClass();
}

function mcp_herramientas(): array
{
    $anot = ['readOnlyHint' => true, 'destructiveHint' => false, 'idempotentHint' => true, 'openWorldHint' => false];
    $schema = static fn (array $props, array $req = []): array => ['type' => 'object', 'properties' => $props === [] ? mcp_vacio() : $props, 'required' => $req, 'additionalProperties' => false];
    return [
        [
            'name' => 'buscar_contenido',
            'title' => 'Buscar en AyudaDev',
            'description' => 'Busca en guías, rutas de estudio, fundamentos, hojas de referencia, retos, proyectos, glosario, recursos gratuitos y más. Devuelve título, tipo, URL y descripción.',
            'inputSchema' => $schema([
                'consulta' => ['type' => 'string', 'minLength' => 2, 'maxLength' => 200, 'description' => 'Palabras a buscar, en español. Ej: "git ramas", "closure", "primeros pasos python".'],
                'tipo' => ['type' => 'string', 'enum' => MCP_TIPOS_BUSQUEDA, 'description' => 'Limita los resultados a un tipo de contenido.'],
                'limite' => ['type' => 'integer', 'minimum' => 1, 'maximum' => 20, 'default' => 8],
            ], ['consulta']),
            'annotations' => $anot + ['title' => 'Buscar en AyudaDev'],
        ],
        [
            'name' => 'obtener_documento',
            'title' => 'Leer un documento',
            'description' => 'Devuelve el texto completo en Markdown de una guía, ruta, artículo, hoja de referencia, reto, proyecto, ficha de IA o noticia. Usa buscar_contenido para encontrar el tipo y el id.',
            'inputSchema' => $schema([
                'tipo' => ['type' => 'string', 'enum' => MCP_TIPOS_DOC],
                'id' => ['type' => 'string', 'pattern' => '^[a-z0-9-]+$', 'maxLength' => 100, 'description' => 'Identificador (slug) del documento.'],
            ], ['tipo', 'id']),
            'annotations' => $anot + ['title' => 'Leer un documento'],
        ],
        [
            'name' => 'listar_temas',
            'title' => 'Listar temas',
            'description' => 'Lista los temas de la biblioteca (lenguajes, frameworks, herramientas) con su área, su guía y cuántos recursos gratuitos tiene cada uno.',
            'inputSchema' => $schema([]),
            'annotations' => $anot + ['title' => 'Listar temas'],
        ],
        [
            'name' => 'listar_recursos',
            'title' => 'Listar recursos gratuitos',
            'description' => 'Lista libros, cursos y documentación gratuitos del catálogo, con autor, licencia, nivel y enlace a la fuente original. Se puede filtrar.',
            'inputSchema' => $schema([
                'tema' => ['type' => 'string', 'description' => 'Slug del tema, p. ej. "python". Usa listar_temas para ver los valores.'],
                'nivel' => ['type' => 'string', 'enum' => ['principiante', 'intermedio', 'avanzado']],
                'tipo' => ['type' => 'string', 'enum' => ['libro', 'curso', 'documentacion', 'tutorial', 'interactivo', 'video']],
                'idioma' => ['type' => 'string', 'enum' => ['es', 'en']],
                'limite' => ['type' => 'integer', 'minimum' => 1, 'maximum' => 50, 'default' => 15],
            ]),
            'annotations' => $anot + ['title' => 'Listar recursos gratuitos'],
        ],
        [
            'name' => 'definir_termino',
            'title' => 'Definir un término',
            'description' => 'Busca un término de programación en el glosario y devuelve su definición en lenguaje sencillo, con un ejemplo si existe.',
            'inputSchema' => $schema(['termino' => ['type' => 'string', 'minLength' => 2, 'maxLength' => 80]], ['termino']),
            'annotations' => $anot + ['title' => 'Definir un término'],
        ],
        [
            'name' => 'proponer_recurso',
            'title' => 'Preparar la propuesta de un recurso',
            'description' => 'Valida un recurso gratuito con las reglas del catálogo y devuelve el archivo a crear y un enlace al editor de GitHub. NO publica nada: la persona debe abrir el enlace, iniciar sesión con su cuenta de GitHub y enviar el pull request, que revisa un humano. Antes de usarla, verifica que el enlace cargue y sea gratis.',
            'inputSchema' => $schema([
                'titulo' => ['type' => 'string', 'minLength' => 3, 'maxLength' => 120],
                'autor' => ['type' => 'string', 'minLength' => 1, 'maxLength' => 120],
                'url' => ['type' => 'string', 'description' => 'Enlace https a la fuente original (no espejos).'],
                'tema' => ['type' => 'string', 'description' => 'Slug de un tema existente (ver listar_temas).'],
                'tipo' => ['type' => 'string', 'enum' => ['libro', 'curso', 'documentacion', 'tutorial', 'interactivo', 'video']],
                'nivel' => ['type' => 'string', 'enum' => ['principiante', 'intermedio', 'avanzado']],
                'formato' => ['type' => 'string', 'enum' => ['web', 'pdf', 'epub', 'repo', 'video']],
                'idioma' => ['type' => 'string', 'enum' => ['es', 'en']],
                'licencia' => ['type' => 'string', 'description' => 'cc-by, cc-by-sa, cc-by-nc, cc-by-nc-sa, cc-by-nc-nd, mit, gpl, apache, bsd, psf, dominio-publico, gratuita-propietaria o desconocida.'],
                'descripcion' => ['type' => 'string', 'minLength' => 20, 'maxLength' => 240],
                'etiquetas' => ['type' => 'array', 'items' => ['type' => 'string'], 'maxItems' => 8],
            ], ['titulo', 'autor', 'url', 'tema', 'tipo', 'nivel', 'formato', 'licencia', 'descripcion']),
            'annotations' => $anot + ['title' => 'Preparar la propuesta de un recurso'],
        ],
    ];
}

/** Resultado de herramienta: texto para el modelo y, opcionalmente, datos estructurados. */
function mcp_texto(string $texto, ?array $estructurado = null, bool $esError = false): array
{
    $r = ['content' => [['type' => 'text', 'text' => $texto]], 'isError' => $esError];
    if ($estructurado !== null) $r['structuredContent'] = $estructurado;
    return $r;
}

function mcp_arg(array $args, string $k, string $defecto = ''): string
{
    $v = $args[$k] ?? $defecto;
    return is_string($v) ? trim($v) : $defecto;
}

function mcp_entero(array $args, string $k, int $defecto, int $min, int $max): int
{
    $v = $args[$k] ?? $defecto;
    return is_int($v) || (is_string($v) && ctype_digit($v)) ? max($min, min($max, (int) $v)) : $defecto;
}

function mcp_buscar(array $args): array
{
    $idx = mcp_indice();
    $consulta = mcp_arg($args, 'consulta');
    if (mb_strlen($consulta, 'UTF-8') < 2) return mcp_texto('Escribe al menos 2 caracteres para buscar.', null, true);
    $tipo = mcp_arg($args, 'tipo');
    if ($tipo !== '' && !in_array($tipo, MCP_TIPOS_BUSQUEDA, true)) return mcp_texto('Tipo no válido. Usa uno de: ' . implode(', ', MCP_TIPOS_BUSQUEDA), null, true);
    $limite = mcp_entero($args, 'limite', 8, 1, 20);
    $tokens = array_values(array_filter(preg_split('/\s+/', mcp_norm($consulta)) ?: [], static fn (string $t): bool => $t !== ''));
    if ($tokens === []) return mcp_texto('La búsqueda está vacía.', null, true);

    $candidatos = [];
    foreach ($idx['temas'] ?? [] as $t) {
        $candidatos[] = ['tipo' => 'tema', 'id' => $t['slug'], 'titulo' => $t['nombre'], 'desc' => $t['descripcion'], 'url' => $t['url'], 'tags' => $t['area'] . ' ' . $t['slug']];
    }
    foreach ($idx['docs'] ?? [] as $d) {
        $candidatos[] = ['tipo' => $d['tipo'], 'id' => $d['id'], 'titulo' => $d['titulo'], 'desc' => $d['descripcion'], 'url' => $d['url'], 'tags' => implode(' ', $d['etiquetas'] ?? []) . ' ' . ($d['tema'] ?? '')];
    }
    foreach ($idx['recursos'] ?? [] as $r) {
        $candidatos[] = ['tipo' => 'recurso', 'id' => $r['id'], 'titulo' => $r['titulo'], 'desc' => $r['autor'] . '. ' . $r['descripcion'], 'url' => $r['url'], 'tags' => implode(' ', $r['etiquetas'] ?? []) . ' ' . $r['tema'] . ' ' . $r['tipo']];
    }
    $base = (string) ($idx['sitio']['url'] ?? '');
    foreach ($idx['glosario'] ?? [] as $g) {
        $candidatos[] = ['tipo' => 'termino', 'id' => $g['id'], 'titulo' => $g['termino'], 'desc' => $g['definicion'], 'url' => $base . '/glosario/#' . $g['id'], 'tags' => $g['categoria'] . ' ' . ($g['tema'] ?? '')];
    }

    $puntuados = [];
    foreach ($candidatos as $c) {
        if ($tipo !== '' && $c['tipo'] !== $tipo) continue;
        $titulo = mcp_norm($c['titulo']);
        $tags = mcp_norm($c['tags']);
        $desc = mcp_norm($c['desc']);
        $puntos = 0;
        foreach ($tokens as $t) {
            $p = 0;
            if (str_starts_with($titulo, $t)) $p = 9;
            elseif (str_contains($titulo, $t)) $p = 6;
            elseif (str_contains($tags, $t)) $p = 3;
            elseif (str_contains($desc, $t)) $p = 2;
            if ($p === 0) { $puntos = 0; break; }
            $puntos += $p;
        }
        if ($puntos > 0) $puntuados[] = [$puntos, $c];
    }
    usort($puntuados, static fn (array $a, array $b): int => $b[0] <=> $a[0]);
    $top = array_slice($puntuados, 0, $limite);
    if ($top === []) return mcp_texto('Sin resultados para "' . $consulta . '". Prueba con otras palabras o sin acentos.', ['resultados' => []]);

    $lineas = [];
    $lista = [];
    foreach ($top as [$p, $c]) {
        $lineas[] = '- [' . $c['tipo'] . '] ' . $c['titulo'] . ' (id: ' . $c['id'] . ")\n  " . $c['url'] . "\n  " . mcp_recortar($c['desc'], 180);
        $lista[] = ['tipo' => $c['tipo'], 'id' => $c['id'], 'titulo' => $c['titulo'], 'url' => $c['url'], 'descripcion' => mcp_recortar($c['desc'], 240)];
    }
    $texto = count($top) . ' resultado(s) para "' . $consulta . "\":\n\n" . implode("\n", $lineas) . "\n\nUsa obtener_documento con tipo e id para leer el texto completo de guías, rutas y artículos.";
    return mcp_texto($texto, ['resultados' => $lista]);
}

function mcp_documento(array $args): array
{
    $tipo = mcp_arg($args, 'tipo');
    $id = mcp_arg($args, 'id');
    if (!in_array($tipo, MCP_TIPOS_DOC, true) || !preg_match('/^[a-z0-9-]{1,100}$/', $id)) {
        return mcp_texto('Parámetros no válidos. tipo: ' . implode(', ', MCP_TIPOS_DOC) . '. id: slug en minúsculas.', null, true);
    }
    $ruta = mcp_dir() . '/' . $tipo . '/' . $id . '.md';
    if (!is_file($ruta)) return mcp_texto('No existe ese documento. Usa buscar_contenido para encontrar el tipo y el id correctos.', null, true);
    $texto = (string) file_get_contents($ruta);
    $cortado = false;
    if (strlen($texto) > MCP_MAX_DOC) {
        $texto = function_exists('mb_strcut') ? mb_strcut($texto, 0, MCP_MAX_DOC, 'UTF-8') : substr($texto, 0, MCP_MAX_DOC);
        $cortado = true;
    }
    if ($cortado) $texto .= "\n\n[Documento recortado. Léelo completo en la URL indicada al inicio.]";
    return mcp_texto($texto);
}

function mcp_temas(): array
{
    $idx = mcp_indice();
    $cuenta = [];
    foreach ($idx['recursos'] ?? [] as $r) $cuenta[$r['tema']] = ($cuenta[$r['tema']] ?? 0) + 1;
    $lista = [];
    $lineas = [];
    foreach ($idx['temas'] ?? [] as $t) {
        $n = $cuenta[$t['slug']] ?? 0;
        $lista[] = ['slug' => $t['slug'], 'nombre' => $t['nombre'], 'area' => $t['area'], 'guia' => $t['guia'], 'recursos' => $n, 'url' => $t['url']];
        $lineas[] = '- ' . $t['slug'] . ': ' . $t['nombre'] . ' (' . $t['area'] . ', ' . $n . ' recursos' . ($t['guia'] ? ', guía: ' . $t['guia'] : '') . ')';
    }
    return mcp_texto(count($lista) . " temas:\n\n" . implode("\n", $lineas), ['temas' => $lista]);
}

function mcp_recursos(array $args): array
{
    $idx = mcp_indice();
    $limite = mcp_entero($args, 'limite', 15, 1, 50);
    $f = ['tema' => mcp_arg($args, 'tema'), 'nivel' => mcp_arg($args, 'nivel'), 'tipo' => mcp_arg($args, 'tipo'), 'idioma' => mcp_arg($args, 'idioma')];
    $out = [];
    foreach ($idx['recursos'] ?? [] as $r) {
        foreach ($f as $k => $v) if ($v !== '' && ($r[$k] ?? '') !== $v) continue 2;
        $out[] = $r;
    }
    $total = count($out);
    $out = array_slice($out, 0, $limite);
    if ($out === []) return mcp_texto('No hay recursos con esos filtros. Usa listar_temas para ver los temas válidos.', ['recursos' => []]);
    $lineas = array_map(static fn (array $r): string => '- ' . $r['titulo'] . ' (' . $r['autor'] . ') [' . $r['tipo'] . ', ' . $r['nivel'] . ', ' . $r['idioma'] . ', licencia: ' . $r['licencia'] . "]\n  " . $r['url'] . "\n  " . mcp_recortar($r['descripcion'], 160), $out);
    $texto = 'Mostrando ' . count($out) . ' de ' . $total . " recurso(s) gratuitos:\n\n" . implode("\n", $lineas);
    $estructurado = array_map(static fn (array $r): array => ['id' => $r['id'], 'titulo' => $r['titulo'], 'autor' => $r['autor'], 'url' => $r['url'], 'tema' => $r['tema'], 'tipo' => $r['tipo'], 'nivel' => $r['nivel'], 'idioma' => $r['idioma'], 'licencia' => $r['licencia']], $out);
    return mcp_texto($texto, ['total' => $total, 'recursos' => $estructurado]);
}

function mcp_termino(array $args): array
{
    $idx = mcp_indice();
    $q = mcp_norm(mcp_arg($args, 'termino'));
    if (mb_strlen($q, 'UTF-8') < 2) return mcp_texto('Escribe un término de al menos 2 caracteres.', null, true);
    $exactos = [];
    $parciales = [];
    foreach ($idx['glosario'] ?? [] as $g) {
        $t = mcp_norm($g['termino']);
        if ($t === $q || $g['id'] === mcp_slug($q)) $exactos[] = $g;
        elseif (str_contains($t, $q)) $parciales[] = $g;
    }
    $res = $exactos !== [] ? $exactos : array_slice($parciales, 0, 5);
    if ($res === []) return mcp_texto('No hay un término que coincida. Prueba con buscar_contenido (tipo "termino") o con otra palabra.', ['terminos' => []]);
    $bloques = array_map(static fn (array $g): string => '## ' . $g['termino'] . ' (' . $g['categoria'] . ")\n" . $g['definicion'] . (!empty($g['ejemplo']) ? "\nEjemplo: " . $g['ejemplo'] : ''), $res);
    return mcp_texto(implode("\n\n", $bloques), ['terminos' => $res]);
}

function mcp_ts(string $s): string
{
    return "'" . str_replace(["\\", "'", "\r\n", "\n", "\r"], ["\\\\", "\\'", ' ', ' ', ' '], $s) . "'";
}

function mcp_proponer(array $args): array
{
    $idx = mcp_indice();
    $enums = $idx['enums'] ?? [];
    $p = [];
    foreach (['titulo', 'autor', 'url', 'tema', 'tipo', 'nivel', 'formato', 'licencia', 'descripcion'] as $k) $p[$k] = mcp_arg($args, $k);
    $p['idioma'] = mcp_arg($args, 'idioma', 'es');
    $etiq = $args['etiquetas'] ?? [];
    $p['etiquetas'] = is_array($etiq) ? array_values(array_filter(array_map(static fn (mixed $t): string => is_string($t) ? trim(mb_strtolower($t, 'UTF-8')) : '', $etiq), static fn (string $t): bool => $t !== '')) : [];

    $err = [];
    $largo = static function (string $v, int $min, int $max, string $n) use (&$err): void {
        $l = mb_strlen($v, 'UTF-8');
        if ($l < $min || $l > $max) $err[] = "$n: entre $min y $max caracteres.";
    };
    $largo($p['titulo'], 3, 120, 'titulo');
    $largo($p['autor'], 1, 120, 'autor');
    $largo($p['descripcion'], 20, 240, 'descripcion');

    $u = filter_var($p['url'], FILTER_VALIDATE_URL) ? parse_url($p['url']) : false;
    if (!is_array($u) || strtolower((string) ($u['scheme'] ?? '')) !== 'https' || empty($u['host'])) {
        $err[] = 'url: debe ser un enlace https válido.';
    } else {
        if (isset($u['user']) || isset($u['pass'])) $err[] = 'url: no debe incluir usuario ni contraseña.';
        if (in_array(strtolower($u['host']), $enums['hostsProhibidos'] ?? ['librosgratis.dev', 'www.librosgratis.dev'], true)) $err[] = 'url: enlaza a la fuente original, no a librosgratis.dev.';
        $norm = static fn (string $x): string => strtolower(rtrim($x, '/'));
        foreach ($idx['recursos'] ?? [] as $r) if ($norm($r['url']) === $norm($p['url'])) { $err[] = 'url: ese enlace ya está en el catálogo (id ' . $r['id'] . ').'; break; }
    }
    $slugsTemas = array_column($idx['temas'] ?? [], 'slug');
    if (!in_array($p['tema'], $slugsTemas, true)) $err[] = 'tema: no existe. Usa listar_temas.';
    foreach (['tipo' => 'tipos', 'nivel' => 'niveles', 'formato' => 'formatos', 'licencia' => 'licencias'] as $campo => $clave) {
        if (!in_array($p[$campo], $enums[$clave] ?? [], true)) $err[] = "$campo: valor no válido (" . implode(', ', $enums[$clave] ?? []) . ').';
    }
    if (!in_array($p['idioma'], ['es', 'en'], true)) $err[] = 'idioma: es o en.';
    if ($p['licencia'] === 'desconocida' && $p['formato'] !== 'web') $err[] = 'licencia: "desconocida" solo se permite con formato web.';
    if (count($p['etiquetas']) > 8) $err[] = 'etiquetas: máximo 8.';
    foreach ($p['etiquetas'] as $t) if (!preg_match('/^[a-z0-9-]{2,30}$/', $t)) { $err[] = 'etiquetas: minúsculas, números y guiones (2 a 30 caracteres).'; break; }
    if (preg_match('/[—–]/u', $p['titulo'] . $p['autor'] . $p['descripcion'])) $err[] = 'texto: evita las rayas largas, usa coma, punto o dos puntos.';
    if ($err !== []) return mcp_texto("La propuesta no es válida:\n- " . implode("\n- ", $err), ['valido' => false, 'errores' => $err], true);

    $id = rtrim(substr($p['tema'] . '-' . mcp_slug($p['titulo']), 0, 80), '-');
    $fecha = gmdate('Y-m-d');
    $archivo = implode("\n", [
        "import type { RecursoInput } from '@lib/schemas';", '',
        'const recursos: RecursoInput[] = [', '  {',
        '    id: ' . mcp_ts($id) . ',', '    titulo: ' . mcp_ts($p['titulo']) . ',', '    autor: ' . mcp_ts($p['autor']) . ',',
        '    url: ' . mcp_ts($p['url']) . ',', '    tema: ' . mcp_ts($p['tema']) . ',', '    tipo: ' . mcp_ts($p['tipo']) . ',',
        '    nivel: ' . mcp_ts($p['nivel']) . ',', '    formato: ' . mcp_ts($p['formato']) . ',', '    idioma: ' . mcp_ts($p['idioma']) . ',',
        '    licencia: ' . mcp_ts($p['licencia']) . ',', '    descripcion: ' . mcp_ts($p['descripcion']) . ',',
        '    etiquetas: [' . implode(', ', array_map('mcp_ts', $p['etiquetas'])) . '],',
        '    agregado: ' . mcp_ts($fecha) . ',', '    verificado: ' . mcp_ts($fecha) . ',', '  },', '];', '', 'export default recursos;', '',
    ]);
    $repo = (string) ($idx['sitio']['repo'] ?? '');
    $ruta = 'src/data/recursos/comunidad';
    $q = [
        'filename=' . rawurlencode($id . '.ts'),
        'value=' . rawurlencode($archivo),
        'message=' . rawurlencode('Recurso: ' . $p['titulo']),
        'description=' . rawurlencode('Propuesta de recurso para la biblioteca (' . $p['tema'] . ').'),
    ];
    $enlace = $repo . '/new/main/' . $ruta . '?' . implode('&', $q);
    $texto = "Propuesta válida. No se publicó nada.\n\nArchivo a crear: $ruta/$id.ts\n\n```ts\n$archivo```\n\nPara enviarla, la persona debe abrir este enlace, iniciar sesión en GitHub y pulsar \"Propose changes\". GitHub crea el fork y el pull request a su nombre y una persona mantenedora lo revisa:\n$enlace\n\nAntes de enviarla, confirma que el enlace carga, que el recurso es gratuito y que la licencia es correcta.";
    return mcp_texto($texto, ['valido' => true, 'id' => $id, 'ruta' => "$ruta/$id.ts", 'archivo' => $archivo, 'enlaceGitHub' => $enlace]);
}

function mcp_llamar(string $nombre, array $args): array
{
    return match ($nombre) {
        'buscar_contenido' => mcp_buscar($args),
        'obtener_documento' => mcp_documento($args),
        'listar_temas' => mcp_temas(),
        'listar_recursos' => mcp_recursos($args),
        'definir_termino' => mcp_termino($args),
        'proponer_recurso' => mcp_proponer($args),
        default => throw new InvalidArgumentException('Herramienta desconocida: ' . $nombre),
    };
}

const MCP_INSTRUCCIONES = "AyudaDev (https://dev.carlosnavarro.site) es una biblioteca gratuita en español para aprender a programar: rutas de estudio, guías con ejemplos, fundamentos, hojas de referencia, retos, proyectos, glosario, recursos gratuitos enlazados a su fuente original y apartado de IA. "
    . "Usa buscar_contenido para encontrar material y obtener_documento para leerlo completo. Cita siempre la URL del sitio y la fuente original de cada recurso. No inventes enlaces: usa solo los que devuelven las herramientas. "
    . "Las herramientas son de solo lectura. proponer_recurso solo prepara una propuesta: la persona debe iniciar sesión en GitHub y un humano la revisa antes de publicarla.";

/* ───────────── JSON-RPC ───────────── */

function mcp_procesar(array $m): ?array
{
    $id = $m['id'] ?? null;
    $esNotificacion = !array_key_exists('id', $m);
    if (($m['jsonrpc'] ?? '') !== '2.0' || !isset($m['method']) || !is_string($m['method'])) {
        return $esNotificacion ? null : mcp_error($id, -32600, 'Solicitud no válida.');
    }
    $metodo = $m['method'];
    $params = isset($m['params']) && is_array($m['params']) ? $m['params'] : [];

    if ($esNotificacion) return null; // notifications/initialized, notifications/cancelled...

    switch ($metodo) {
        case 'initialize':
            $pedida = is_string($params['protocolVersion'] ?? null) ? $params['protocolVersion'] : '';
            $version = in_array($pedida, MCP_VERSIONES, true) ? $pedida : MCP_VERSIONES[0];
            return ['jsonrpc' => '2.0', 'id' => $id, 'result' => [
                'protocolVersion' => $version,
                'capabilities' => ['tools' => ['listChanged' => false]],
                'serverInfo' => ['name' => 'ayudadev', 'title' => 'AyudaDev', 'version' => MCP_VERSION_SERVIDOR],
                'instructions' => MCP_INSTRUCCIONES,
            ]];
        case 'ping':
            return ['jsonrpc' => '2.0', 'id' => $id, 'result' => mcp_vacio()];
        case 'tools/list':
            return ['jsonrpc' => '2.0', 'id' => $id, 'result' => ['tools' => mcp_herramientas()]];
        case 'tools/call':
            $nombre = $params['name'] ?? null;
            $args = isset($params['arguments']) && is_array($params['arguments']) ? $params['arguments'] : [];
            if (!is_string($nombre)) return mcp_error($id, -32602, 'Falta el nombre de la herramienta.');
            try {
                return ['jsonrpc' => '2.0', 'id' => $id, 'result' => mcp_llamar($nombre, $args)];
            } catch (InvalidArgumentException $e) {
                return mcp_error($id, -32602, $e->getMessage());
            } catch (Throwable $e) {
                return ['jsonrpc' => '2.0', 'id' => $id, 'result' => mcp_texto('No pude completar la consulta: ' . $e->getMessage(), null, true)];
            }
        default:
            return mcp_error($id, -32601, 'Método no soportado: ' . $metodo);
    }
}

/* ───────────── punto de entrada ───────────── */

ad_api_headers();
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Accept, Authorization, Mcp-Session-Id, MCP-Protocol-Version');
header('Access-Control-Max-Age: 86400');

$metodoHttp = strtoupper((string) ($_SERVER['REQUEST_METHOD'] ?? ''));
if ($metodoHttp === 'OPTIONS') mcp_responder_http(204);
if ($metodoHttp !== 'POST') {
    header('Allow: POST, OPTIONS');
    mcp_responder_http(405, mcp_error(null, -32000, 'Este servidor MCP acepta solicitudes POST con JSON-RPC.'));
}
if (ad_request_too_large(MCP_MAX_BODY)) mcp_responder_http(413, mcp_error(null, -32000, 'Solicitud demasiado grande.'));
$ct = strtolower((string) ($_SERVER['CONTENT_TYPE'] ?? ''));
if (!str_contains($ct, 'json')) mcp_responder_http(415, mcp_error(null, -32000, 'Usa Content-Type: application/json.'));

$ip = ad_client_ip();
if (ad_rate_limited('mcp_min', $ip, 60, 120) || ad_rate_limited('mcp_dia', $ip, 86400, 5000)) {
    header('Retry-After: 60');
    mcp_responder_http(429, mcp_error(null, -32000, 'Demasiadas solicitudes. Espera un minuto.'));
}

$crudo = file_get_contents('php://input');
$cuerpo = is_string($crudo) && strlen($crudo) <= MCP_MAX_BODY ? json_decode($crudo, true) : null;
if (!is_array($cuerpo)) mcp_responder_http(400, mcp_error(null, -32700, 'JSON no válido.'));

$esLote = array_is_list($cuerpo) && $cuerpo !== [];
$mensajes = $esLote ? $cuerpo : [$cuerpo];
if (count($mensajes) > 20) mcp_responder_http(400, mcp_error(null, -32600, 'Demasiados mensajes en el lote.'));

$respuestas = [];
foreach ($mensajes as $m) {
    $r = is_array($m) ? mcp_procesar($m) : mcp_error(null, -32600, 'Solicitud no válida.');
    if ($r !== null) $respuestas[] = $r;
}
if ($respuestas === []) mcp_responder_http(202);
mcp_responder_http(200, $esLote ? $respuestas : $respuestas[0]);
