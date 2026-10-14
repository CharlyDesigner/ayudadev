import type { HerramientaInput } from '../herramientas';

const herramientas: HerramientaInput[] = [
  { id: 'windows-terminal', nombre: 'Windows Terminal', categoria: 'terminal', descripcion: 'Terminal moderna de Microsoft con pestañas y paneles para PowerShell, CMD y WSL. Es la mejor forma de trabajar con la línea de comandos en Windows.', url: 'https://learn.microsoft.com/es-es/windows/terminal/', gratis: 'si', sistemas: ['windows'], idioma: 'es', destacado: true, verificado: '2026-10-09' },
  { id: 'iterm2', nombre: 'iTerm2', categoria: 'terminal', descripcion: 'Reemplazo de la terminal de macOS con paneles divididos, búsqueda y perfiles. Elígela si programas en un Mac y quieres más control.', url: 'https://iterm2.com/', gratis: 'si', sistemas: ['macos'], idioma: 'en', destacado: false, verificado: '2026-10-09' },
  { id: 'wezterm', nombre: 'WezTerm', categoria: 'terminal', descripcion: 'Terminal multiplataforma acelerada por GPU y configurable con Lua. Funciona igual en Windows, macOS y Linux.', url: 'https://wezterm.org/', gratis: 'si', sistemas: ['windows', 'macos', 'linux'], idioma: 'en', destacado: false, verificado: '2026-10-09' },
  { id: 'oh-my-zsh', nombre: 'Oh My Zsh', categoria: 'terminal', descripcion: 'Framework para configurar Zsh con temas y plugins listos para usar, por ejemplo atajos para Git. Hace más cómoda tu terminal en pocos minutos.', url: 'https://ohmyz.sh/', gratis: 'si', sistemas: ['macos', 'linux'], idioma: 'en', destacado: false, verificado: '2026-10-09' },
  { id: 'starship', nombre: 'Starship', categoria: 'terminal', descripcion: 'Prompt rápido y personalizable para cualquier shell. Muestra la rama de Git, la versión del lenguaje y más sin que tengas que configurarlo todo.', url: 'https://starship.rs/', gratis: 'si', sistemas: ['windows', 'macos', 'linux'], idioma: 'en', destacado: true, verificado: '2026-10-09' },
  { id: 'tmux', nombre: 'tmux', categoria: 'terminal', descripcion: 'Multiplexor de terminal: varias sesiones, ventanas y paneles en una sola pantalla que sobreviven si te desconectas. Muy útil al trabajar con servidores.', url: 'https://github.com/tmux/tmux/wiki', gratis: 'si', sistemas: ['macos', 'linux'], idioma: 'en', destacado: false, verificado: '2026-10-09' },
];

export default herramientas;
