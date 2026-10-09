import { temaSchema, type Tema } from '@lib/schemas';

const TEMAS_RAW: Tema[] = [
  // Fundamentos
  { slug: 'generales', nombre: 'Generales', area: 'fundamentos', descripcion: 'Cómo pensar como programador, buenas prácticas y cultura del desarrollo de software.', icono: 'book', librosgratis: 'generales', orden: 1 },
  { slug: 'algoritmos', nombre: 'Algoritmos y estructuras de datos', area: 'fundamentos', descripcion: 'Listas, pilas, árboles, grafos, búsqueda, ordenamiento y complejidad.', icono: 'binary-tree', librosgratis: 'algoritmos', orden: 2 },
  { slug: 'sistemas-operativos', nombre: 'Sistemas operativos', area: 'fundamentos', descripcion: 'Procesos, memoria, archivos y cómo un sistema operativo gestiona la máquina.', icono: 'cpu', librosgratis: 'sistemas-operativos', orden: 3 },
  { slug: 'scratch', nombre: 'Scratch', area: 'fundamentos', descripcion: 'Programación por bloques para empezar desde cero, ideal para niños y principiantes.', icono: 'puzzle', librosgratis: 'scratch', orden: 4 },

  // Lenguajes
  { slug: 'javascript', nombre: 'JavaScript', area: 'lenguajes', descripcion: 'El lenguaje de la web: navegador, Node.js y todo lo que hay en medio.', icono: 'brand-javascript', guia: 'javascript', librosgratis: 'javascript', orden: 10 },
  { slug: 'typescript', nombre: 'TypeScript', area: 'lenguajes', descripcion: 'JavaScript con tipos: menos errores en producción y mejor autocompletado.', icono: 'brand-typescript', guia: 'typescript', librosgratis: 'typescript', orden: 11 },
  { slug: 'python', nombre: 'Python', area: 'lenguajes', descripcion: 'Sintaxis clara para scripts, datos, automatización, web e inteligencia artificial.', icono: 'brand-python', guia: 'python', librosgratis: 'python', orden: 12 },
  { slug: 'java', nombre: 'Java', area: 'lenguajes', descripcion: 'Lenguaje robusto para backend empresarial, Android y sistemas grandes.', icono: 'coffee', guia: 'java', librosgratis: 'java', orden: 13 },
  { slug: 'c', nombre: 'C', area: 'lenguajes', descripcion: 'El lenguaje de los sistemas: punteros, memoria y rendimiento sin intermediarios.', icono: 'letter-c', guia: 'c', librosgratis: 'c', orden: 14 },
  { slug: 'cpp', nombre: 'C++', area: 'lenguajes', descripcion: 'C con abstracciones modernas: videojuegos, motores, finanzas y alto rendimiento.', icono: 'brand-cpp', librosgratis: 'cpp', orden: 15 },
  { slug: 'c-sharp', nombre: 'C#', area: 'lenguajes', descripcion: 'El lenguaje de .NET: aplicaciones de escritorio, web, juegos con Unity y más.', icono: 'brand-c-sharp', guia: 'c-sharp', librosgratis: 'c-sharp', orden: 16 },
  { slug: 'go', nombre: 'Go', area: 'lenguajes', descripcion: 'Simple, compilado y concurrente. Ideal para servicios en la nube y herramientas CLI.', icono: 'brand-golang', guia: 'go', librosgratis: 'go', orden: 17 },
  { slug: 'rust', nombre: 'Rust', area: 'lenguajes', descripcion: 'Seguridad de memoria sin recolector de basura. Sistemas, WebAssembly y CLI.', icono: 'brand-rust', guia: 'rust', librosgratis: 'rust', orden: 18 },
  { slug: 'php', nombre: 'PHP', area: 'lenguajes', descripcion: 'El lenguaje que mueve gran parte de la web: Laravel, Symfony y hosting compartido.', icono: 'brand-php', guia: 'php', librosgratis: 'php', orden: 19 },
  { slug: 'kotlin', nombre: 'Kotlin', area: 'lenguajes', descripcion: 'Moderno y conciso sobre la JVM. El lenguaje oficial para Android.', icono: 'brand-kotlin', librosgratis: 'kotlin', orden: 20 },

  // Desarrollo web
  { slug: 'html-css', nombre: 'HTML y CSS', area: 'desarrollo-web', descripcion: 'La base de toda página: estructura semántica, estilos, flexbox, grid y responsive.', icono: 'brand-html5', guia: 'html-css', librosgratis: 'css', orden: 30 },
  { slug: 'nodejs', nombre: 'Node.js', area: 'desarrollo-web', descripcion: 'JavaScript en el servidor: APIs, herramientas de línea de comandos y tiempo real.', icono: 'brand-nodejs', librosgratis: 'nodejs', orden: 31 },
  { slug: 'accesibilidad', nombre: 'Accesibilidad', area: 'desarrollo-web', descripcion: 'Sitios que todas las personas pueden usar: WCAG, lectores de pantalla y teclado.', icono: 'accessible', orden: 32 },

  // Frameworks
  { slug: 'react', nombre: 'React', area: 'frameworks', descripcion: 'Interfaces por componentes, hooks y el ecosistema más grande del frontend.', icono: 'brand-react', librosgratis: 'react', orden: 40 },
  { slug: 'astro', nombre: 'Astro', area: 'frameworks', descripcion: 'Sitios de contenido rápidos por defecto. Con él está hecho este sitio.', icono: 'rocket', orden: 41 },
  { slug: 'django', nombre: 'Django', area: 'frameworks', descripcion: 'El framework web de Python con baterías incluidas: ORM, admin y seguridad.', icono: 'brand-django', librosgratis: 'django', orden: 42 },

  // Plataformas
  { slug: 'android', nombre: 'Android', area: 'plataformas', descripcion: 'Apps móviles con Kotlin y Jetpack Compose.', icono: 'brand-android', librosgratis: 'android', orden: 50 },

  // Herramientas
  { slug: 'git', nombre: 'Git y GitHub', area: 'herramientas', descripcion: 'Control de versiones: ramas, commits, pull requests y trabajo en equipo.', icono: 'brand-git', guia: 'git', librosgratis: 'git', orden: 60 },
  { slug: 'docker', nombre: 'Docker', area: 'herramientas', descripcion: 'Contenedores para que tu app corra igual en tu máquina y en producción.', icono: 'brand-docker', librosgratis: 'docker', orden: 61 },
  { slug: 'linux', nombre: 'Linux y terminal', area: 'herramientas', descripcion: 'La línea de comandos, bash, permisos y administración básica.', icono: 'terminal-2', librosgratis: 'linux', orden: 62 },

  // Bases de datos
  { slug: 'sql', nombre: 'SQL', area: 'bases-de-datos', descripcion: 'Consultas, joins, índices y diseño relacional con PostgreSQL, MySQL y SQLite.', icono: 'database', guia: 'sql', librosgratis: 'sql', orden: 70 },

  // IA y datos
  { slug: 'inteligencia-artificial', nombre: 'Inteligencia artificial', area: 'ia-y-datos', descripcion: 'Modelos de lenguaje, machine learning y cómo usarlos para aprender y crear.', icono: 'sparkles', librosgratis: 'inteligencia-artificial', orden: 80 },
];

export const TEMAS: Tema[] = TEMAS_RAW.map((t) => temaSchema.parse(t)).sort((a, b) => (a.orden ?? 999) - (b.orden ?? 999));

export const temaPorSlug = (slug: string): Tema | undefined => TEMAS.find((t) => t.slug === slug);

export const temasPorArea = (area: Tema['area']): Tema[] => TEMAS.filter((t) => t.area === area);
