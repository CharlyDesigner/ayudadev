# AyudaDev: reglas del repositorio

Sitio comunitario en https://dev.carlosnavarro.site. Astro 7 (salida estática) + Tailwind CSS 4 + TypeScript estricto + npm. Hosting cPanel (InMotion) con PHP solo en `public/api/`.

## Idioma y tono
- Español de México, tuteo, frases cortas y directas.
- Sin rayas largas (—) en textos de interfaz, frontmatter ni prosa; usa coma, punto o dos puntos. Hay tests que lo verifican.
- Sin cifras, precios, límites ni testimonios inventados. Si algo no está verificado, escribe `[PENDIENTE]` o enlaza a la fuente oficial.

## Diseño
- Un solo acento (`accent`, lima). Botones píldora, tarjetas de 20px, transiciones de 150 a 200 ms.
- Tokens en `src/styles/global.css`. No agregues colores de marca nuevos.
- Modo oscuro por defecto, claro con `data-theme="light"`. Todo debe verse bien en ambos.
- Accesible: semántica, `:focus-visible`, contraste, sin scroll horizontal desde 320px, respeta `prefers-reduced-motion`.
- El contenido debe verse sin JavaScript; el JS solo mejora (filtros, favoritos, paleta de comandos).

## Contenido
- Catálogo: solo enlaces a la fuente original, con licencia y fecha de verificación. Nunca a librosgratis.dev ni a espejos. Nunca alojar PDFs de terceros.
- Guías, fichas de IA, noticias y prompts siguen `docs/CONTENIDO.md`.
- Verifica cada URL antes de agregarla.

## Código
- Datos tipados en `src/data/`, utilidades puras en `src/lib/` (con tests en `tests/`), scripts de navegador en `src/scripts/`.
- Antes de dar algo por terminado: `npm run verify` en verde.
- PHP: solo en `public/api/`, endurecido como `_guard.php`. Nunca secretos en el repositorio.
- No publiques nada: la publicación la hace Carlos con el workflow `deploy.yml` en modo `publicar`.

## Al terminar un cambio
Lista los archivos creados o modificados y qué falta por hacer, si algo.
