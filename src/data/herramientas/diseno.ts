import type { HerramientaInput } from '../herramientas';

const herramientas: HerramientaInput[] = [
  { id: 'figma', nombre: 'Figma', categoria: 'diseno', descripcion: 'Herramienta de diseño de interfaces y prototipos en el navegador, estándar en equipos de producto. Úsala para maquetar tu idea antes de programarla.', url: 'https://www.figma.com/', logo: 'figma', gratis: 'limitado', sistemas: ['web', 'windows', 'macos'], idioma: 'en', destacado: true, verificado: '2026-10-09' },
  { id: 'excalidraw', nombre: 'Excalidraw', categoria: 'diseno', descripcion: 'Pizarra virtual de dibujo a mano alzada, sin registro. Perfecta para esbozar diagramas de arquitectura o explicar una idea rápidamente.', url: 'https://excalidraw.com/', gratis: 'si', sistemas: ['web'], idioma: 'en', destacado: true, verificado: '2026-10-09' },
  { id: 'drawio', nombre: 'draw.io', categoria: 'diseno', descripcion: 'Editor de diagramas de flujo, UML y bases de datos que funciona en el navegador o como aplicación de escritorio.', url: 'https://www.drawio.com/', gratis: 'si', sistemas: ['web', 'windows', 'macos', 'linux'], idioma: 'en', destacado: false, verificado: '2026-10-09' },
  { id: 'penpot', nombre: 'Penpot', categoria: 'diseno', descripcion: 'Plataforma de diseño y prototipado de código abierto pensada para que diseñadores y desarrolladores trabajen juntos con estándares web.', url: 'https://penpot.app/', gratis: 'si', sistemas: ['web'], idioma: 'en', destacado: false, verificado: '2026-10-09' },
  { id: 'mermaid-live-editor', nombre: 'Mermaid Live Editor', categoria: 'diseno', descripcion: 'Crea diagramas de flujo, de secuencia y de clases escribiendo texto y viendo el resultado al instante. Ideal para documentar en Markdown.', url: 'https://mermaid.live/', gratis: 'si', sistemas: ['web'], idioma: 'en', destacado: false, verificado: '2026-10-09' },
  { id: 'coolors', nombre: 'Coolors', categoria: 'diseno', descripcion: 'Generador de paletas de colores: pulsa la barra espaciadora, bloquea los tonos que te gusten y exporta los códigos para tu CSS.', url: 'https://coolors.co/', gratis: 'limitado', sistemas: ['web'], idioma: 'en', destacado: false, verificado: '2026-10-09' },
];

export default herramientas;
