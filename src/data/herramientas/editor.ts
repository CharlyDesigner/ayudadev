import type { HerramientaInput } from '../herramientas';

const herramientas: HerramientaInput[] = [
  { id: 'visual-studio-code', nombre: 'Visual Studio Code', categoria: 'editor', descripcion: 'Editor gratuito de Microsoft con extensiones, terminal integrada y depurador. Es la opción más común para empezar con casi cualquier lenguaje.', url: 'https://code.visualstudio.com/', logo: 'vscode', gratis: 'si', sistemas: ['windows', 'macos', 'linux', 'web'], idioma: 'en', destacado: true, verificado: '2026-10-09' },
  { id: 'neovim', nombre: 'Neovim', categoria: 'editor', descripcion: 'Editor de texto modal basado en Vim, extensible con Lua. Elígelo si quieres trabajar sin ratón y moldear tu entorno a tu gusto.', url: 'https://neovim.io/', gratis: 'si', sistemas: ['windows', 'macos', 'linux'], idioma: 'en', destacado: false, verificado: '2026-10-09' },
  { id: 'zed', nombre: 'Zed', categoria: 'editor', descripcion: 'Editor de código rápido pensado para colaborar en tiempo real. Una alternativa ligera si VS Code te resulta pesado.', url: 'https://zed.dev/', gratis: 'si', sistemas: ['windows', 'macos', 'linux'], idioma: 'en', destacado: false, verificado: '2026-10-09' },
  { id: 'cursor', nombre: 'Cursor', categoria: 'editor', descripcion: 'Editor basado en VS Code con un asistente de inteligencia artificial integrado. Elígelo si quieres programar con ayuda de IA dentro del editor.', url: 'https://cursor.com/', logo: 'ia/cursor', gratis: 'limitado', sistemas: ['windows', 'macos', 'linux'], idioma: 'en', destacado: false, verificado: '2026-10-09' },
  { id: 'thonny', nombre: 'Thonny', categoria: 'editor', descripcion: 'Entorno sencillo para aprender Python, con depurador paso a paso que muestra cómo cambian las variables. Ideal para tus primeros programas.', url: 'https://thonny.org/', logo: 'python', gratis: 'si', sistemas: ['windows', 'macos', 'linux'], idioma: 'en', destacado: true, verificado: '2026-10-09' },
  { id: 'android-studio', nombre: 'Android Studio', categoria: 'editor', descripcion: 'El entorno oficial de Google para crear apps Android con Kotlin, con emulador y herramientas de diseño de interfaz incluidos.', url: 'https://developer.android.com/studio', logo: 'android', gratis: 'si', sistemas: ['windows', 'macos', 'linux'], idioma: 'en', destacado: false, verificado: '2026-10-09' },
];

export default herramientas;
