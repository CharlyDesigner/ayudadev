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
