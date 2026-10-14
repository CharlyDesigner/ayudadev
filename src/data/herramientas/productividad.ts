import type { HerramientaInput } from '../herramientas';

const herramientas: HerramientaInput[] = [
  { id: 'obsidian', nombre: 'Obsidian', categoria: 'productividad', descripcion: 'Aplicación de notas en Markdown guardadas como archivos locales, con enlaces entre notas. Buena para armar tu propia base de conocimiento.', url: 'https://obsidian.md/', gratis: 'si', sistemas: ['windows', 'macos', 'linux'], idioma: 'en', destacado: true, verificado: '2026-10-09' },
  { id: 'anki', nombre: 'Anki', categoria: 'productividad', descripcion: 'Tarjetas de memoria con repetición espaciada para retener sintaxis, comandos y conceptos. Muy útil al estudiar de forma constante.', url: 'https://apps.ankiweb.net/', gratis: 'si', sistemas: ['windows', 'macos', 'linux'], idioma: 'en', destacado: true, verificado: '2026-10-09' },
  { id: 'powertoys', nombre: 'Microsoft PowerToys', categoria: 'productividad', descripcion: 'Conjunto de utilidades para Windows: organizador de ventanas, buscador de aplicaciones, selector de color y renombrado masivo de archivos.', url: 'https://learn.microsoft.com/es-es/windows/powertoys/', gratis: 'si', sistemas: ['windows'], idioma: 'es', destacado: false, verificado: '2026-10-09' },
  { id: 'logseq', nombre: 'Logseq', categoria: 'productividad', descripcion: 'Aplicación de notas en forma de esquema y enlaces, de código abierto y con archivos locales. Sirve para llevar un diario de aprendizaje.', url: 'https://logseq.com/', gratis: 'si', sistemas: ['windows', 'macos', 'linux'], idioma: 'en', destacado: false, verificado: '2026-10-09' },
  { id: 'joplin', nombre: 'Joplin', categoria: 'productividad', descripcion: 'Aplicación de notas de código abierto con Markdown, etiquetas y cifrado. Elígela si prefieres tener el control de tus datos.', url: 'https://joplinapp.org/', gratis: 'si', sistemas: ['windows', 'macos', 'linux'], idioma: 'en', destacado: false, verificado: '2026-10-09' },
  { id: 'notion', nombre: 'Notion', categoria: 'productividad', descripcion: 'Espacio todo en uno para notas, tareas y bases de datos. Sirve para organizar tus apuntes, proyectos personales y lista de pendientes.', url: 'https://www.notion.com/', gratis: 'limitado', sistemas: ['web', 'windows', 'macos'], idioma: 'en', destacado: false, verificado: '2026-10-09' },
];

export default herramientas;
