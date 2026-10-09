# AyudaDev

Aprende a programar en español, gratis y con ejemplos. Biblioteca de recursos gratuitos, guías paso a paso con código ejecutable y un apartado de IA para aprender con Claude, ChatGPT, Gemini y más.

Sitio: https://dev.carlosnavarro.site · Un proyecto de [Carlos Navarro](https://carlosnavarro.site) · [Mark House](https://markhouseoficial.com)

## Qué hay dentro

- **Biblioteca** (`/biblioteca/`): catálogo curado por área y tema, con nivel, formato y licencia. Buscador, filtros y favoritos (en tu navegador).
- **Guías con ejemplos** (`/guias/`): de cero a tu primer programa en JavaScript, TypeScript, Python, HTML y CSS, Git, SQL, Java, C, C#, PHP, Go y Rust.
- **IA** (`/ia/`): fichas de herramientas, comparativa cualitativa, biblioteca de prompts y guías para aprender con IA.
- **Noticias** y **newsletter** con doble confirmación (PHP en cPanel, sin terceros).
- **Apoyo** voluntario por Stripe y GitHub Sponsors.

## Correr en tu máquina

Requiere Node 22.12 o superior y npm.

```bash
npm install
npm run dev        # http://localhost:4323
npm run build      # genera dist/
npm run preview
npm run verify     # astro check + tests + build + revisión del sitio estático
npm run check:links  # comprueba las URLs del catálogo (requiere build previo)
npm run og         # regenera imágenes Open Graph y favicons
```

El formulario del boletín usa PHP, así que solo funciona en el servidor (o con un PHP local sirviendo `dist/`).

## Estructura

```
src/data/recursos/<tema>.ts   catálogo (un archivo por tema)
src/data/temas.ts             taxonomía de áreas y temas
src/content/guias/*.mdx       guías con ejemplos
src/content/ia/*.mdx          fichas de herramientas de IA
src/content/aprende/*.mdx     guías "aprende con IA"
src/content/noticias/*.md     noticias
src/content/prompts/          biblioteca de prompts
public/api/*.php              newsletter (doble opt-in)
docs/CONTENIDO.md             guía para escribir contenido
docs/DEPLOY.md                cómo publicar
```

## Contribuir

Lee [CONTRIBUTING.md](CONTRIBUTING.md) y [docs/CONTENIDO.md](docs/CONTENIDO.md). Para proponer un recurso sin tocar código usa el [formulario de issue](https://github.com/CharlyDesigner/ayudadev/issues/new?template=nuevo-recurso.yml).

## Licencias

- Código: [MIT](LICENSE).
- Textos (guías, fichas, noticias): [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/deed.es).
- Catálogo (títulos, autores y enlaces): [CC0](https://creativecommons.org/publicdomain/zero/1.0/deed.es).
- Cada recurso enlazado conserva la licencia de su autor. AyudaDev no aloja ni redistribuye archivos de terceros.

Inspirado en [librosgratis.dev](https://librosgratis.dev) de midudev. El catálogo se curó de forma independiente.
