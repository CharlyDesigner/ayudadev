# Guía de contenido de AyudaDev

Todo el contenido se escribe en español de México, en segunda persona ("tú"), con frases cortas y directas. Sin rayas largas (—) en textos de interfaz ni en frontmatter; usa coma, punto o dos puntos. Sin cifras, precios ni límites inventados: si no está verificado, escribe `[PENDIENTE]` o enlaza a la fuente oficial.

## 1. Catálogo de recursos (`src/data/recursos/<tema>.ts`)

Un archivo por tema, que exporta por defecto un arreglo `RecursoInput[]` (ver `src/lib/schemas.ts`). Ejemplo completo: `src/data/recursos/javascript.ts`.

Reglas:
- `url` siempre apunta a la **fuente original** (sitio del autor, docs oficiales, repo del proyecto, universidad). Nunca a espejos, ni a `librosgratis.dev`, ni a PDFs re-subidos por terceros.
- `licencia`: usa la real (`cc-by`, `cc-by-sa`, `cc-by-nc`, `cc-by-nc-sa`, `cc-by-nc-nd`, `mit`, `gpl`, `dominio-publico`, `gratuita-propietaria`). `desconocida` solo se permite con `formato: 'web'` (se lee gratis pero no sabemos si se puede redistribuir).
- `formato`: `web` (se lee en línea), `pdf`/`epub` (descarga directa oficial), `repo` (GitHub/GitLab), `video`.
- `tipo`: `libro`, `curso`, `documentacion`, `tutorial`, `interactivo`, `video`.
- `nivel`: `principiante`, `intermedio`, `avanzado`.
- `idioma`: `es` por defecto. Solo incluye `en` si es un recurso imprescindible sin equivalente en español, y márcalo.
- `descripcion`: 20 a 240 caracteres, dice qué aprendes y para quién es.
- `id`: `<tema>-<titulo-en-kebab>`; único en todo el catálogo.
- `destacado: true` en máximo 2 o 3 por tema (los mejores para empezar).
- `agregado` y `verificado`: fecha AAAA-MM-DD del día en que abriste la URL y comprobaste que carga y es gratis.

Verifica cada URL antes de incluirla (debe responder 200 y mostrar el recurso). Si una URL falla, no la incluyas.

## 2. Guías con ejemplos (`src/content/guias/<slug>.mdx`)

Frontmatter:

```yaml
---
titulo: 'JavaScript desde cero'
descripcion: 'Qué es, cómo instalarlo y tus primeros programas con ejemplos que puedes copiar y ejecutar.'
tema: javascript            # slug de src/data/temas.ts
nivel: principiante
tiempoLectura: 25           # minutos
publicado: 2026-10-09
libros: ['javascript-moderno-javascript-info', 'javascript-elocuente']   # ids del catálogo
requisitos: ['Saber usar una terminal básica']
etiquetas: ['node', 'navegador', 'async']
orden: 10
---
```

Importa los componentes al inicio del cuerpo:

```mdx
import Ejemplo from '@components/guias/Ejemplo.astro';
import Pasos from '@components/guias/Pasos.astro';
import Callout from '@components/ui/Callout.astro';
import LibrosRecomendados from '@components/guias/LibrosRecomendados.astro';
```

Estructura obligatoria (encabezados `##`):

1. `## Qué es y para qué sirve` (modelo mental en 5 a 8 viñetas: cómo se ejecuta, tipado, memoria, paradigma).
2. `## Instálalo y corre tu primer archivo` (Windows, macOS y Linux; usa `<Pasos>` con una lista ordenada dentro).
3. `## Ejemplos paso a paso` (4 a 6 bloques `<Ejemplo numero={1} titulo="..." archivo="..." ejecutar="..." salida="...">` con un bloque de código y un párrafo de explicación dentro). Cada ejemplo debe correr tal cual y la `salida` debe ser la real.
4. `## Errores comunes` (5 trampas con `<Callout tipo="warning" titulo="...">`).
5. `## Buenas prácticas` (lista corta).
6. `## Siguiente paso` (qué aprender después y enlaces internos a otras guías o temas de la biblioteca).
7. `<LibrosRecomendados ids={frontmatter.libros} />` al final (los ids deben existir en el catálogo).

Los bloques de código llevan lenguaje (```js, ```python, ```bash). Comentarios del código en español.

## 3. Fichas de IA (`src/content/ia/<slug>.mdx`)

Frontmatter: `nombre`, `empresa`, `descripcion`, `tipo` (`chat` | `ide` | `cli` | `asistente-codigo` | `api` | `local`), `sitio`, `docs`, `planGratis` (`si` | `limitado` | `no` | `pendiente`), `precioUrl`, `publicado`, `verificado`, `orden`.

Secciones: `## Qué es`, `## Para qué sirve si estás aprendiendo`, `## Cómo empezar` (`<Pasos>`), `## Tres prompts para probar hoy` (bloques de código ```text con el prompt), `## Límites y cuidados`, `## Enlaces oficiales`. Nunca escribas precios ni límites numéricos: enlaza a la página oficial de precios.

## 4. Guías "Aprende con IA" (`src/content/aprende/<slug>.mdx`)

Frontmatter: `titulo`, `descripcion`, `publicado`, `herramientas` (slugs de fichas), `orden`. Artículo de 800 a 1500 palabras con ejemplos de prompts y una sección `## Ejercicio` al final.

## 5. Noticias (`src/content/noticias/<slug>.md`)

Frontmatter: `titulo`, `descripcion`, `publicado`, `etiquetas`, `fuentes: [{ titulo, url }]`. Entre 300 y 800 palabras. Si citas datos, incluye la fuente en `fuentes`.

## 6. Prompts (`src/content/prompts/prompts.json`)

Objetos con `id` (kebab), `titulo`, `categoria` (`aprender` | `depurar` | `explicar` | `refactorizar` | `escribir` | `estudiar`), `prompt` (texto con marcadores en MAYÚSCULAS entre corchetes), `herramientas` (slugs), `nota` opcional.

---

# Colecciones nuevas (ampliación)

Reglas comunes: español de México, tuteo, sin rayas largas, sin cifras ni precios inventados, enlaces externos siempre a la fuente original y verificados. En MDX no uses `{`, `}` ni `<` en la prosa fuera de código (escápalos o ponlos en backticks). Todos los archivos `.mdx` importan los componentes que usan al inicio del cuerpo.

Componentes disponibles en MDX:

```mdx
import Ejemplo from '@components/guias/Ejemplo.astro';          // titulo, archivo?, ejecutar?, salida?, numero?
import Pasos from '@components/guias/Pasos.astro';              // lista ordenada con estilo
import Callout from '@components/ui/Callout.astro';             // tipo="info|tip|warning" titulo?
import LibrosRecomendados from '@components/guias/LibrosRecomendados.astro';  // ids={frontmatter.libros}
import Solucion from '@components/guias/Solucion.astro';        // <Solucion titulo?> contenido </Solucion> (details)
import Pista from '@components/guias/Pista.astro';              // <Pista n={1}> contenido </Pista> (details)
```

## Fundamentos (`src/content/fundamentos/<slug>.mdx`)

Artículo que explica un concepto desde cero, de 700 a 1400 palabras, con analogías, un diagrama en texto o tabla si ayuda, ejemplos de código cortos y una sección final `## Qué sigue`.

```yaml
---
titulo: 'Qué es una API y cómo se usa'
descripcion: '...'            # máx. 170 caracteres
categoria: internet           # internet | programacion | datos | seguridad | calidad | arquitectura | herramientas | ia
nivel: principiante           # principiante | intermedio | avanzado
tiempoLectura: 8
publicado: 2026-10-09
temas: [javascript, nodejs]   # slugs de src/data/temas.ts (el primero se muestra como logo)
etiquetas: [api, http]
orden: 10
---
```

## Carrera (`src/content/carrera/<slug>.mdx`)

Artículos prácticos de 800 a 1500 palabras con listas de verificación. Frontmatter: `titulo`, `descripcion`, `tiempoLectura`, `publicado`, `etiquetas`, `orden`.

## Hojas de referencia (`src/content/hojas/<slug>.mdx`)

Una página densa y escaneable: tablas, bloques de código cortos y comentados, sin relleno. Frontmatter: `titulo`, `descripcion`, `tema` (slug de tema o `generales`), `publicado`, `etiquetas`, `orden`. Organiza con `##` por bloque temático y tablas de dos columnas (comando o sintaxis, qué hace).

## Retos (`src/content/retos/<slug>.mdx`)

Un ejercicio de 5 a 45 minutos. Estructura obligatoria:

```mdx
## El reto           (enunciado claro, con ejemplos de entrada y salida)
## Reglas            (si aplica)
## Pistas            (2 o 3 <Pista n={1}>...</Pista>)
## Solución          (<Solucion> con el código completo comentado y la explicación </Solucion>)
## Variaciones       (2 o 3 ideas para seguir practicando)
```

Frontmatter: `titulo`, `descripcion`, `tema` (slug del lenguaje), `nivel`, `tiempo` (minutos, número), `conceptos: [bucles, arreglos]`, `publicado`, `orden`. El código de la solución debe ejecutarse de verdad y dar el resultado indicado: pruébalo antes de escribirlo.

## Proyectos (`src/content/proyectos/<slug>.mdx`)

Idea de proyecto con objetivo, requisitos, pasos sugeridos y retos extra.

```yaml
---
titulo: 'Lista de tareas con almacenamiento local'
descripcion: '...'
nivel: principiante
tiempo: '1 a 2 días'              # texto libre
tecnologias: [html5, css3, javascript]   # nombres de logos de /public/logos (ver lista abajo)
temas: [javascript, html-css]     # slugs de temas
habilidades: [DOM, eventos, localStorage]
publicado: 2026-10-09
orden: 10
---
```

Cuerpo: `## Qué vas a construir`, `## Requisitos`, `## Pasos sugeridos` (usa `<Pasos>`), `## Retos extra`, `## Cómo publicarlo` (qué mostrar en tu portafolio).

## Rutas de estudio (`src/content/rutas/<slug>.mdx`)

Camino ordenado de 5 a 10 pasos. Los slugs de `guia`, `tema`, `recursos`, `retos` y `proyectos` DEBEN existir (el build falla si no). Frontmatter:

```yaml
---
titulo: 'Desarrollo web desde cero'
descripcion: '...'
nivel: principiante
duracion: '4 a 6 meses'
para: 'quieres crear sitios web y no has programado nunca'
logos: [html5, css3, javascript, git, react]
objetivo: web        # web | movil | datos-ia | sistemas | juegos | general
pasos:
  - titulo: 'Aprende HTML y CSS'
    descripcion: '...'
    duracion: '3 semanas'
    guia: html-css            # slug de guía existente
    tema: html-css            # slug de tema
    recursos: [html-css-mdn-html]     # ids del catálogo
    retos: [html-css-tarjeta-perfil]  # slugs de retos
    proyectos: [pagina-personal]      # slugs de proyectos
    meta: 'maquetar una página responsive sin ayuda'
publicado: 2026-10-09
orden: 10
---
```

El cuerpo MDX va debajo de los pasos: consejos para no abandonar, errores comunes de la ruta y cómo saber que estás listo para el siguiente nivel.

## Glosario (`src/content/glosario/terminos.json`)

Arreglo JSON de objetos: `id` (kebab, único), `termino`, `definicion` (1 a 3 frases, lenguaje sencillo, mínimo 20 caracteres), `categoria` (`web | programacion | datos | ia | herramientas | seguridad | redes | general`), `ejemplo` (opcional, texto corto o línea de código), `relacionados` (ids de otros términos que EXISTAN), `tema` (opcional, slug de tema).

## Herramientas (`src/data/herramientas/<categoria>.ts`)

Un archivo por categoría, `export default [...] as HerramientaInput[]` (ver `src/data/herramientas.ts`). `logo` opcional (nombre en `/public/logos`). URL siempre `https://` verificada. `gratis`: `si | limitado | no`.

## Comunidad (`src/data/comunidad/<tipo>.ts`)

Un archivo por tipo (`youtube`, `podcast`, `newsletter`, `comunidad`, `curso`, `evento`, `blog`), `export default [...] as ComunidadInput[]` (ver `src/data/comunidad.ts`). Solo recursos activos y verificados hoy.

## Logos disponibles (`/public/logos/<nombre>.svg`)

Lenguajes y tecnologías: javascript, typescript, python, ruby, rust, php, haskell, go, kotlin, dart, c, cpp, c-sharp, java, r, erlang, perl, scala, lisp, scratch, subversion, blockchain, html5, css3, html-css, nodejs, react, angular, qwik, astro, django, android, git, docker, linux, latex, mongodb, bash, vscode, vim, github, githubactions, npm, tailwindcss, flutter, swift, laravel, express, fastapi, flask, redis, nextjs, vuejs, svelte, ocaml, elixir, lua, julia, matlab, nginx, firebase, supabase, figma, markdown, jupyter, pandas, numpy, tensorflow, pytorch, unity, godot, arduino, raspberrypi, postgresql, mysql, sqlite, solidity, clojure, rails, apache, webassembly.

IA (`/public/logos/ia/<nombre>.svg`): claude, claude-code, chatgpt, openai, gemini, gemini-cli, copilot, microsoft-copilot, cursor, perplexity, ollama, mistral, deepseek, grok, huggingface, windsurf, v0, lovable, notebooklm, codex, qwen, replit, vercel, openrouter, groq, lmstudio, langchain, llamaindex, meta, gemma, antigravity, cline, kimi, midjourney, stability, flux, runway, suno, elevenlabs, anthropic, nvidia, microsoft, google.

## Cómo descubrir recursos nuevos

Para encontrar candidatos puedes consultar las páginas de tema de https://librosgratis.dev/libros/<slug>/ (misma taxonomía que usamos, campo `librosgratis` de cada tema) como pista de qué existe. Reglas estrictas: abre y verifica SIEMPRE la fuente original; enlaza solo a ella (nunca a librosgratis.dev, a sus visores `/leer/` ni a sus PDF alojados); escribe tú la descripción; si la única copia disponible es la que aloja librosgratis.dev, omite el recurso.
