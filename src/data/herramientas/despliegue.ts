import type { HerramientaInput } from '../herramientas';

const herramientas: HerramientaInput[] = [
  { id: 'vercel', nombre: 'Vercel', categoria: 'despliegue', descripcion: 'Plataforma para publicar sitios y apps frontend conectando tu repositorio. Es la casa de Next.js y despliega cada cambio automáticamente.', url: 'https://vercel.com/', logo: 'ia/vercel', gratis: 'limitado', sistemas: ['web'], idioma: 'en', destacado: false, verificado: '2026-10-09' },
  { id: 'netlify', nombre: 'Netlify', categoria: 'despliegue', descripcion: 'Hosting para sitios estáticos y apps web con despliegue desde Git, formularios y funciones sin servidor. Muy sencillo para empezar.', url: 'https://www.netlify.com/', gratis: 'limitado', sistemas: ['web'], idioma: 'en', destacado: false, verificado: '2026-10-09' },
  { id: 'cloudflare-pages', nombre: 'Cloudflare Pages', categoria: 'despliegue', descripcion: 'Publica tu sitio frontend en la red global de Cloudflare conectando un repositorio. Se integra con el resto de sus servicios.', url: 'https://www.cloudflare.com/products/pages/', gratis: 'limitado', sistemas: ['web'], idioma: 'en', destacado: false, verificado: '2026-10-09' },
  { id: 'github-pages', nombre: 'GitHub Pages', categoria: 'despliegue', descripcion: 'Hosting estático directo desde un repositorio de GitHub. Una forma simple de publicar tu portafolio o la documentación de un proyecto.', url: 'https://pages.github.com/', logo: 'github', gratis: 'limitado', sistemas: ['web'], idioma: 'en', destacado: true, verificado: '2026-10-09' },
  { id: 'render', nombre: 'Render', categoria: 'despliegue', descripcion: 'Plataforma en la nube para desplegar sitios, APIs y bases de datos desde Git. Alternativa para proyectos con backend.', url: 'https://render.com/', gratis: 'limitado', sistemas: ['web'], idioma: 'en', destacado: false, verificado: '2026-10-09' },
  { id: 'railway', nombre: 'Railway', categoria: 'despliegue', descripcion: 'Plataforma para desplegar aplicaciones y bases de datos con pocos clics desde un repositorio. Cómoda para prototipos con backend.', url: 'https://railway.com/', gratis: 'limitado', sistemas: ['web'], idioma: 'en', destacado: false, verificado: '2026-10-09' },
];

export default herramientas;
