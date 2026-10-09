# Cómo contribuir a AyudaDev

Gracias por querer ayudar. Hay tres formas, de la más sencilla a la más completa.

## 1. Proponer un recurso (sin código)

Abre un [issue con la plantilla de recurso](https://github.com/CharlyDesigner/ayudadev/issues/new?template=nuevo-recurso.yml). Criterios:

- **Gratis** de verdad, sin pagos escondidos.
- **Legal**: lo publica su autor, editorial o universidad, o tiene licencia abierta. Nada de copias subidas por terceros.
- **Útil** y completo.
- **En español**, salvo recursos imprescindibles sin equivalente.

Para enlaces rotos usa la [plantilla de enlace roto](https://github.com/CharlyDesigner/ayudadev/issues/new?template=enlace-roto.yml).

## 2. Agregar un recurso al catálogo (con pull request)

1. Haz fork y clona el repositorio. Instala con `npm install`.
2. Abre `src/data/recursos/<tema>.ts` (o crea el archivo si el tema no tiene) y agrega un objeto siguiendo `src/lib/schemas.ts` y las reglas de `docs/CONTENIDO.md`.
3. Verifica la URL en el navegador y escribe la fecha en `verificado`.
4. Corre `npm run verify`. Los tests comprueban ids únicos, URLs válidas, temas existentes y que no haya rayas largas.
5. Abre el pull request explicando qué agregas y por qué.

## 3. Escribir una guía, ficha de IA o noticia

Sigue la plantilla de `docs/CONTENIDO.md`. Las guías deben tener ejemplos que corran tal cual y su salida real. Abre primero un issue diciendo qué tema quieres cubrir para no duplicar trabajo.

## Estilo

- Español de México, tuteo, frases cortas.
- Sin rayas largas (—). Sin cifras ni precios inventados.
- Mantén un solo color de acento y respeta el sistema de diseño (`DESIGN.md`).

## Código de conducta

Sé amable. Aquí hay gente que está empezando. Las críticas van al código y al contenido, nunca a las personas.
