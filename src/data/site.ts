/**
 * Datos globales del sitio. Todo lo que cambia de un proyecto a otro vive aquí.
 */
export const SITE = {
  nombre: 'AyudaDev',
  lema: 'Aprende a programar en español, gratis y con ejemplos.',
  descripcion:
    'Biblioteca de recursos gratuitos de programación en español, guías con ejemplos paso a paso y un apartado de IA para aprender con Claude, ChatGPT, Gemini y más.',
  url: 'https://dev.carlosnavarro.site',
  idioma: 'es-MX',
  autor: {
    nombre: 'Carlos Navarro',
    url: 'https://carlosnavarro.site',
    github: 'https://github.com/CharlyDesigner',
  },
  organizacion: {
    nombre: 'Mark House',
    url: 'https://markhouseoficial.com',
  },
  contacto: 'contacto@markhouseoficial.com',
  repo: 'https://github.com/CharlyDesigner/ayudadev',
  redes: [
    { nombre: 'GitHub', url: 'https://github.com/CharlyDesigner' },
    { nombre: 'Instagram', url: 'https://instagram.com/marketinghouseoficial' },
    { nombre: 'YouTube', url: 'https://youtube.com/@markhouseoficial' },
  ],
  donaciones: {
    stripe: (import.meta.env.PUBLIC_STRIPE_PAYMENT_LINK as string | undefined)?.trim() ?? '',
    sponsors: (import.meta.env.PUBLIC_GITHUB_SPONSORS as string | undefined)?.trim() ?? '',
  },
  inspiracion: {
    nombre: 'librosgratis.dev',
    url: 'https://librosgratis.dev',
    repo: 'https://github.com/midudev/libros-programacion-gratis',
  },
  ogDefault: '/og/default.png',
} as const;

export interface NavItem {
  label: string;
  href: string;
  descripcion?: string;
  icono?: string;
  hijos?: NavItem[];
}

export const NAV: NavItem[] = [
  { label: 'Biblioteca', href: '/biblioteca/' },
  { label: 'Guías', href: '/guias/' },
  { label: 'Rutas', href: '/rutas/' },
  { label: 'IA', href: '/ia/' },
  {
    label: 'Referencia',
    href: '/explorar/',
    hijos: [
      { label: 'Fundamentos', href: '/fundamentos/', icono: 'school', descripcion: 'Conceptos explicados desde cero' },
      { label: 'Glosario', href: '/glosario/', icono: 'book', descripcion: 'Términos en lenguaje sencillo' },
      { label: 'Hojas de referencia', href: '/hojas/', icono: 'file-text', descripcion: 'Cheatsheets para consultar rápido' },
      { label: 'Retos', href: '/retos/', icono: 'puzzle', descripcion: 'Ejercicios con pistas y solución' },
      { label: 'Proyectos', href: '/proyectos/', icono: 'rocket', descripcion: 'Ideas para tu portafolio' },
      { label: 'Herramientas', href: '/herramientas/', icono: 'tool', descripcion: 'Editores, playgrounds y más' },
      { label: 'Comunidad', href: '/comunidad/', icono: 'share', descripcion: 'Canales, podcasts y comunidades' },
      { label: 'Carrera', href: '/carrera/', icono: 'newspaper', descripcion: 'Portafolio, entrevistas, freelance' },
    ],
  },
  { label: 'Noticias', href: '/noticias/' },
];

export const FOOTER_LINKS = [
  { label: 'Acerca de', href: '/acerca/' },
  { label: 'Enviar recurso', href: '/enviar-recurso/' },
  { label: 'Newsletter', href: '/newsletter/' },
  { label: 'Apoya el proyecto', href: '/apoya/' },
  { label: 'Privacidad', href: '/privacidad/' },
  { label: 'RSS', href: '/rss.xml' },
] as const;
