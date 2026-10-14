import type { HerramientaInput } from '../herramientas';

const herramientas: HerramientaInput[] = [
  { id: 'mdn-web-docs', nombre: 'MDN Web Docs', categoria: 'documentacion', descripcion: 'La referencia de HTML, CSS y JavaScript mantenida por Mozilla y la comunidad, con ejemplos y traducción al español. Tu primera parada al tener dudas.', url: 'https://developer.mozilla.org/es/', gratis: 'si', sistemas: ['web'], idioma: 'es', destacado: true, verificado: '2026-10-09' },
  { id: 'devdocs', nombre: 'DevDocs', categoria: 'documentacion', descripcion: 'Reúne la documentación de muchos lenguajes y librerías en un solo buscador rápido que funciona también sin conexión.', url: 'https://devdocs.io/', gratis: 'si', sistemas: ['web'], idioma: 'en', destacado: false, verificado: '2026-10-09' },
  { id: 'can-i-use', nombre: 'Can I use', categoria: 'documentacion', descripcion: 'Consulta qué navegadores soportan cada característica de HTML, CSS y JavaScript antes de usarla en tu proyecto.', url: 'https://caniuse.com/', gratis: 'si', sistemas: ['web'], idioma: 'en', destacado: true, verificado: '2026-10-09' },
  { id: 'regex101', nombre: 'regex101', categoria: 'documentacion', descripcion: 'Prueba expresiones regulares con explicación paso a paso de cada parte y soporte para varios sabores de regex. Ideal para aprender y depurar.', url: 'https://regex101.com/', gratis: 'si', sistemas: ['web'], idioma: 'en', destacado: false, verificado: '2026-10-09' },
  { id: 'stack-overflow-en-espanol', nombre: 'Stack Overflow en español', categoria: 'documentacion', descripcion: 'Preguntas y respuestas de programación en español. Busca tu error aquí primero y pregunta si no hay una solución.', url: 'https://es.stackoverflow.com/', gratis: 'si', sistemas: ['web'], idioma: 'es', destacado: false, verificado: '2026-10-09' },
  { id: 'tldr-pages', nombre: 'tldr pages', categoria: 'documentacion', descripcion: 'Ejemplos cortos y prácticos de los comandos de terminal más usados, como alternativa a leer páginas man enormes.', url: 'https://tldr.sh/', gratis: 'si', sistemas: ['web', 'windows', 'macos', 'linux'], idioma: 'en', destacado: false, verificado: '2026-10-09' },
  { id: 'explainshell', nombre: 'explainshell', categoria: 'documentacion', descripcion: 'Pega un comando de la terminal y verás qué hace cada parte, con el texto del manual correspondiente. Útil para entender comandos ajenos.', url: 'https://explainshell.com/', logo: 'bash', gratis: 'si', sistemas: ['web'], idioma: 'en', destacado: false, verificado: '2026-10-09' },
];

export default herramientas;
