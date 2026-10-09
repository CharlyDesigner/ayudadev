# Sistema de diseño de AyudaDev

Derivado del sistema de Mark House 2026. Este documento describe cómo se ve y se siente el sitio para que cualquier cambio encaje.

## Principios

1. **Primero el contenido.** Encontrar y leer un recurso va antes que cualquier decoración.
2. **Rápido y ligero.** Sin frameworks de UI en el cliente, sin fuentes externas, sin analítica de terceros.
3. **Un acento.** Todo lo que se puede pulsar o está activo usa el lima. Nada más compite por atención.
4. **Accesible por defecto.** Teclado, foco visible, contraste AA, `prefers-reduced-motion`, semántica.

## Color

Tokens en `src/styles/global.css`. Oscuro es el modo base; claro se activa con `data-theme="light"` o con la preferencia del sistema.

| Token | Oscuro | Claro | Uso |
|---|---|---|---|
| `bg` | `#0b0b0c` | `#f3f3f1` | fondo de página |
| `surface` | `#151517` | `#ffffff` | tarjetas, campos |
| `surface-2` | `#1c1c1f` | `#ebebe8` | chips, fondos secundarios |
| `fg` | `#f2f2ee` | `#0e0e10` | texto principal |
| `muted` | `#a3a3a0` | `#55555a` | texto secundario |
| `line` | fg al 12 % | fg al 12 % | bordes |
| `accent` | `#c6f24e` | `#c6f24e` | rellenos de acción |
| `accent-ink` | `#c6f24e` | `#4a6800` | texto y enlaces en acento (contraste AA) |
| `on-accent` | `#0b0b0c` | `#0b0b0c` | texto sobre relleno de acento |

Usa `text-accent-ink` para texto y `bg-accent` para rellenos; nunca texto lima sobre fondo claro.

## Tipografía

Geist (variable) para todo el texto; Geist Mono para código. Ambas autoalojadas con `@fontsource-variable`. Jerarquía por tamaño y peso, no por color. `text-wrap: balance` en títulos.

## Forma y movimiento

- Botones, chips y campos: píldora (`rounded-full`). Tarjetas: 20px. Bloques de código: 14px.
- Transiciones de 150 a 200 ms con `cubic-bezier(0.16, 1, 0.3, 1)`. Hover eleva 1 o 2 px, nunca cambia el layout.
- Animaciones solo decorativas (`.reveal`) y desactivadas con `prefers-reduced-motion`.

## Componentes

Clases compartidas en `src/styles/components.css`: `.btn` (`-primary`, `-secondary`, `-ghost`, `-sm`), `.card` (`.card-hover`), `.chip` (con `aria-pressed`), `.badge` (`-accent`), `.eyebrow`, `.field`, `.glass`, `.link`, `.visually-hidden`, `kbd`.

Componentes Astro en `src/components/`: `ui/` (Icon, SectionHeader, Breadcrumbs, Callout), `nav/` (SiteHeader, MobileTabBar, ThemeToggle), `biblioteca/` (RecursoCard, TemaCard, FiltrosBar, FavoriteButton), `guias/` (Ejemplo, Pasos, LibrosRecomendados, Toc), `ia/` (PromptCard), `newsletter/` (NewsletterForm).

## Layout

`.container-site` de 72rem con 1rem de margen lateral (1.5rem desde 640px). Rejillas de tarjetas: 1 columna en móvil, 2 en tablet, 3 en escritorio. Barra inferior de navegación en móvil, header fijo con desenfoque en todos los tamaños. Nunca scroll horizontal; se prueba desde 320px.

## Iconos

SVG de línea inline (trazo 1.9) en `ui/Icon.astro`. Decorativos por defecto (`aria-hidden`); pasa `label` cuando el icono es el único contenido.

## Texto

Español de México, tuteo, frases cortas. Sin rayas largas. Verbos claros en botones: "Leer la guía", "Proponer un recurso", "Suscribirme".
