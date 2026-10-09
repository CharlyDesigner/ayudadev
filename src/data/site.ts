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

export const NAV = [
  { label: 'Biblioteca', href: '/biblioteca/' },
  { label: 'Guías', href: '/guias/' },
  { label: 'IA', href: '/ia/' },
  { label: 'Noticias', href: '/noticias/' },
  { label: 'Apoya', href: '/apoya/' },
] as const;

export const FOOTER_LINKS = [
  { label: 'Acerca de', href: '/acerca/' },
  { label: 'Enviar recurso', href: '/enviar-recurso/' },
  { label: 'Newsletter', href: '/newsletter/' },
  { label: 'Privacidad', href: '/privacidad/' },
  { label: 'RSS', href: '/rss.xml' },
] as const;
