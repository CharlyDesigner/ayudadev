import { temaSchema, type Tema } from '@lib/schemas';

/**
 * Taxonomía de AyudaDev: 8 áreas y 45 temas.
 * `logo` es el nombre del archivo en /public/logos (sin extensión). Si falta, se muestra el monograma `abrev`.
 * `guia` es el slug de la guía en src/content/guias. `librosgratis` es el slug del tema equivalente en librosgratis.dev.
 */
const TEMAS_RAW: Tema[] = [
  // Fundamentos
  { slug: 'generales', nombre: 'Generales', abrev: 'CS', area: 'fundamentos', descripcion: 'Cómo pensar como programador, buenas prácticas y cultura del desarrollo de software.', librosgratis: 'generales', orden: 1 },
  { slug: 'algoritmos', nombre: 'Algoritmos y estructuras de datos', abrev: 'AL', area: 'fundamentos', descripcion: 'Listas, pilas, árboles, grafos, búsqueda, ordenamiento y complejidad.', librosgratis: 'algoritmos', orden: 2 },
  { slug: 'sistemas-operativos', nombre: 'Sistemas operativos', abrev: 'SO', area: 'fundamentos', descripcion: 'Procesos, memoria, archivos y cómo un sistema operativo gestiona la máquina.', librosgratis: 'sistemas-operativos', orden: 3 },
  { slug: 'metodologias-desarrollo', nombre: 'Metodologías de desarrollo', abrev: 'Ag', area: 'fundamentos', descripcion: 'Agile, Scrum, Kanban, pruebas y cómo trabajan los equipos de software.', librosgratis: 'metodologias-desarrollo', orden: 4 },
  { slug: 'matematicas', nombre: 'Matemáticas', abrev: '∑', area: 'fundamentos', descripcion: 'Lógica, álgebra, matemática discreta y estadística aplicadas a programar.', librosgratis: 'matematicas', orden: 5 },
  { slug: 'scratch', nombre: 'Scratch', abrev: 'Scr', logo: 'scratch', area: 'fundamentos', descripcion: 'Programación por bloques para empezar desde cero, ideal para niños y principiantes.', librosgratis: 'scratch', orden: 6 },

  // Lenguajes
  { slug: 'javascript', nombre: 'JavaScript', abrev: 'JS', logo: 'javascript', area: 'lenguajes', descripcion: 'El lenguaje de la web: navegador, Node.js y todo lo que hay en medio.', guia: 'javascript', librosgratis: 'javascript', orden: 10 },
  { slug: 'typescript', nombre: 'TypeScript', abrev: 'TS', logo: 'typescript', area: 'lenguajes', descripcion: 'JavaScript con tipos: menos errores en producción y mejor autocompletado.', guia: 'typescript', librosgratis: 'typescript', orden: 11 },
  { slug: 'python', nombre: 'Python', abrev: 'Py', logo: 'python', area: 'lenguajes', descripcion: 'Sintaxis clara para scripts, datos, automatización, web e inteligencia artificial.', guia: 'python', librosgratis: 'python', orden: 12 },
  { slug: 'ruby', nombre: 'Ruby', abrev: 'Rb', logo: 'ruby', area: 'lenguajes', descripcion: 'Elegante y expresivo, famoso por Ruby on Rails y por hacer feliz al programador.', librosgratis: 'ruby', orden: 13 },
  { slug: 'rust', nombre: 'Rust', abrev: 'Rs', logo: 'rust', area: 'lenguajes', descripcion: 'Seguridad de memoria sin recolector de basura. Sistemas, WebAssembly y CLI.', guia: 'rust', librosgratis: 'rust', orden: 14 },
  { slug: 'blockchain', nombre: 'Blockchain', abrev: 'BC', logo: 'blockchain', area: 'lenguajes', descripcion: 'Criptografía, contratos inteligentes y cómo funcionan las cadenas de bloques.', librosgratis: 'blockchain', orden: 15 },
  { slug: 'php', nombre: 'PHP', abrev: 'PHP', logo: 'php', area: 'lenguajes', descripcion: 'El lenguaje que mueve gran parte de la web: Laravel, Symfony y hosting compartido.', guia: 'php', librosgratis: 'php', orden: 16 },
  { slug: 'haskell', nombre: 'Haskell', abrev: 'Hs', logo: 'haskell', area: 'lenguajes', descripcion: 'Programación funcional pura: tipos algebraicos, mónadas e inmutabilidad.', librosgratis: 'haskell', orden: 17 },
  { slug: 'go', nombre: 'Go', abrev: 'Go', logo: 'go', area: 'lenguajes', descripcion: 'Simple, compilado y concurrente. Ideal para servicios en la nube y herramientas CLI.', guia: 'go', librosgratis: 'go', orden: 18 },
  { slug: 'kotlin', nombre: 'Kotlin', abrev: 'Kt', logo: 'kotlin', area: 'lenguajes', descripcion: 'Moderno y conciso sobre la JVM. El lenguaje oficial para Android.', librosgratis: 'kotlin', orden: 19 },
  { slug: 'dart', nombre: 'Dart', abrev: 'Da', logo: 'dart', area: 'lenguajes', descripcion: 'El lenguaje de Flutter: interfaces móviles, web y escritorio con un solo código.', librosgratis: 'dart', orden: 20 },
  { slug: 'c', nombre: 'C', abrev: 'C', logo: 'c', area: 'lenguajes', descripcion: 'El lenguaje de los sistemas: punteros, memoria y rendimiento sin intermediarios.', guia: 'c', librosgratis: 'c', orden: 21 },
  { slug: 'cpp', nombre: 'C++', abrev: 'C++', logo: 'cpp', area: 'lenguajes', descripcion: 'C con abstracciones modernas: videojuegos, motores, finanzas y alto rendimiento.', librosgratis: 'cpp', orden: 22 },
  { slug: 'c-sharp', nombre: 'C#', abrev: 'C#', logo: 'c-sharp', area: 'lenguajes', descripcion: 'El lenguaje de .NET: aplicaciones de escritorio, web, juegos con Unity y más.', guia: 'c-sharp', librosgratis: 'c-sharp', orden: 23 },
  { slug: 'java', nombre: 'Java', abrev: 'Jv', logo: 'java', area: 'lenguajes', descripcion: 'Lenguaje robusto para backend empresarial, Android y sistemas grandes.', guia: 'java', librosgratis: 'java', orden: 24 },
  { slug: 'r', nombre: 'R', abrev: 'R', logo: 'r', area: 'lenguajes', descripcion: 'Estadística, ciencia de datos y visualización con tidyverse y ggplot2.', librosgratis: 'r', orden: 25 },
  { slug: 'ensamblador', nombre: 'Ensamblador', abrev: 'ASM', area: 'lenguajes', descripcion: 'Lo más cercano al procesador: registros, instrucciones y cómo funciona de verdad una CPU.', librosgratis: 'ensamblador', orden: 26 },
  { slug: 'erlang', nombre: 'Erlang', abrev: 'Er', logo: 'erlang', area: 'lenguajes', descripcion: 'Concurrencia masiva y tolerancia a fallos: la base de sistemas de telecomunicaciones y mensajería.', librosgratis: 'erlang', orden: 27 },
  { slug: 'lisp', nombre: 'Lisp', abrev: 'λ', area: 'lenguajes', descripcion: 'La familia de lenguajes más influyente: Common Lisp, Scheme, Racket y Clojure.', librosgratis: 'lisp', orden: 28 },
  { slug: 'perl', nombre: 'Perl', abrev: 'Pl', logo: 'perl', area: 'lenguajes', descripcion: 'La navaja suiza del texto: expresiones regulares, scripts y automatización de sistemas.', librosgratis: 'perl', orden: 29 },
  { slug: 'raku', nombre: 'Raku', abrev: 'Rk', area: 'lenguajes', descripcion: 'El sucesor de Perl 6: gramáticas, concurrencia y un diseño muy expresivo.', librosgratis: 'raku', orden: 30 },
  { slug: 'scala', nombre: 'Scala', abrev: 'Sl', logo: 'scala', area: 'lenguajes', descripcion: 'Funcional y orientado a objetos sobre la JVM: datos a gran escala y sistemas concurrentes.', librosgratis: 'scala', orden: 31 },

  // Desarrollo web
  { slug: 'html-css', nombre: 'HTML y CSS', abrev: 'H5', logo: 'html-css', area: 'desarrollo-web', descripcion: 'La base de toda página: estructura semántica, estilos, flexbox, grid y responsive.', guia: 'html-css', librosgratis: 'css', orden: 40 },
  { slug: 'nodejs', nombre: 'Node.js', abrev: 'No', logo: 'nodejs', area: 'desarrollo-web', descripcion: 'JavaScript en el servidor: APIs, herramientas de línea de comandos y tiempo real.', librosgratis: 'nodejs', orden: 41 },
  { slug: 'accesibilidad', nombre: 'Accesibilidad', abrev: 'A11y', area: 'desarrollo-web', descripcion: 'Sitios que todas las personas pueden usar: WCAG, lectores de pantalla y teclado.', orden: 42 },

  // Frameworks
  { slug: 'react', nombre: 'React', abrev: 'Re', logo: 'react', area: 'frameworks', descripcion: 'Interfaces por componentes, hooks y el ecosistema más grande del frontend.', librosgratis: 'react', orden: 50 },
  { slug: 'angular', nombre: 'Angular', abrev: 'Ng', logo: 'angular', area: 'frameworks', descripcion: 'El framework completo de Google: TypeScript, componentes, servicios e inyección de dependencias.', librosgratis: 'angular', orden: 51 },
  { slug: 'qwik', nombre: 'Qwik', abrev: 'Qw', logo: 'qwik', area: 'frameworks', descripcion: 'Un framework web resumible: carga instantánea y mínimo JavaScript inicial.', librosgratis: 'qwik', orden: 52 },
  { slug: 'astro', nombre: 'Astro', abrev: 'As', logo: 'astro', area: 'frameworks', descripcion: 'Sitios de contenido rápidos por defecto. Con él está hecho este sitio.', orden: 53 },
  { slug: 'django', nombre: 'Django', abrev: 'Dj', logo: 'django', area: 'frameworks', descripcion: 'El framework web de Python con baterías incluidas: ORM, admin y seguridad.', librosgratis: 'django', orden: 54 },

  // Plataformas
  { slug: 'android', nombre: 'Android', abrev: 'An', logo: 'android', area: 'plataformas', descripcion: 'Apps móviles con Kotlin y Jetpack Compose.', librosgratis: 'android', orden: 60 },

  // Herramientas
  { slug: 'git', nombre: 'Git y GitHub', abrev: 'Git', logo: 'git', area: 'herramientas', descripcion: 'Control de versiones: ramas, commits, pull requests y trabajo en equipo.', guia: 'git', librosgratis: 'git', orden: 70 },
  { slug: 'docker', nombre: 'Docker', abrev: 'Dk', logo: 'docker', area: 'herramientas', descripcion: 'Contenedores para que tu app corra igual en tu máquina y en producción.', librosgratis: 'docker', orden: 71 },
  { slug: 'linux', nombre: 'Linux y terminal', abrev: 'Lx', logo: 'linux', area: 'herramientas', descripcion: 'La línea de comandos, bash, permisos y administración básica.', librosgratis: 'linux', orden: 72 },
  { slug: 'latex', nombre: 'LaTeX', abrev: 'TeX', logo: 'latex', area: 'herramientas', descripcion: 'Documentos científicos y técnicos impecables: fórmulas, bibliografía y tesis.', librosgratis: 'latex', orden: 73 },
  { slug: 'subversion', nombre: 'Subversion', abrev: 'SVN', area: 'herramientas', descripcion: 'El control de versiones centralizado clásico, todavía vivo en muchas empresas.', librosgratis: 'subversion', orden: 74 },

  // Bases de datos
  { slug: 'sql', nombre: 'SQL', abrev: 'SQL', area: 'bases-de-datos', descripcion: 'Consultas, joins, índices y diseño relacional con PostgreSQL, MySQL y SQLite.', guia: 'sql', librosgratis: 'sql', orden: 80 },
  { slug: 'nosql', nombre: 'NoSQL', abrev: 'NoS', logo: 'mongodb', area: 'bases-de-datos', descripcion: 'MongoDB, Redis y otras bases no relacionales: cuándo usarlas y cómo modelar datos.', librosgratis: 'nosql', orden: 81 },

  // IA y datos
  { slug: 'inteligencia-artificial', nombre: 'Inteligencia artificial', abrev: 'IA', area: 'ia-y-datos', descripcion: 'Modelos de lenguaje, machine learning y cómo usarlos para aprender y crear.', librosgratis: 'inteligencia-artificial', orden: 90 },
];

export const TEMAS: Tema[] = TEMAS_RAW.map((t) => temaSchema.parse(t)).sort((a, b) => (a.orden ?? 999) - (b.orden ?? 999));

export const temaPorSlug = (slug: string): Tema | undefined => TEMAS.find((t) => t.slug === slug);

export const temasPorArea = (area: Tema['area']): Tema[] => TEMAS.filter((t) => t.area === area);
