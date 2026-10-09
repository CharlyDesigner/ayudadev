/**
 * Comparativa cualitativa de herramientas de IA para aprender a programar.
 * Sin precios ni límites numéricos: cada fila enlaza a la página oficial de precios.
 * Actualiza VERIFICADO cada vez que vuelvas a comprobar las URLs y los planes.
 */

export interface FilaComparativa {
  /** Slug de la ficha en src/content/ia. */
  slug: string;
  nombre: string;
  /** Texto legible del tipo de herramienta. */
  tipo: string;
  /** Dónde se usa: navegador, editor, terminal, tu computadora. */
  dondeCorre: string;
  planGratis: 'si' | 'limitado' | 'no' | 'pendiente';
  /** En qué destaca, en una frase corta. */
  brillaEn: string;
  /** Para quién o para qué momento del aprendizaje es ideal. */
  ideal: string;
  precioUrl: string;
}

export const VERIFICADO = '2026-10-09';

export const COMPARATIVA: FilaComparativa[] = [
  {
    slug: 'claude',
    nombre: 'Claude',
    tipo: 'Chat',
    dondeCorre: 'Navegador, app de escritorio y celular',
    planGratis: 'si',
    brillaEn: 'Explicaciones claras y revisión de código con paciencia',
    ideal: 'Tu tutor diario: pistas, ejercicios y revisión de lo que escribes',
    precioUrl: 'https://claude.com/pricing',
  },
  {
    slug: 'claude-code',
    nombre: 'Claude Code',
    tipo: 'Agente en terminal',
    dondeCorre: 'Terminal, VS Code, JetBrains, app de escritorio y web',
    planGratis: 'no',
    brillaEn: 'Lee y edita tu proyecto completo, corre comandos y pruebas',
    ideal: 'Cuando ya tienes un proyecto real y quieres aprender flujos de trabajo',
    precioUrl: 'https://claude.com/pricing',
  },
  {
    slug: 'chatgpt',
    nombre: 'ChatGPT',
    tipo: 'Chat',
    dondeCorre: 'Navegador, app de escritorio y celular',
    planGratis: 'si',
    brillaEn: 'Respuestas rápidas, ejemplos y rutas de estudio',
    ideal: 'Dudas puntuales y práctica guiada desde el primer día',
    precioUrl: 'https://openai.com/chatgpt/pricing/',
  },
  {
    slug: 'gemini',
    nombre: 'Gemini',
    tipo: 'Chat',
    dondeCorre: 'Navegador, celular y productos de Google',
    planGratis: 'si',
    brillaEn: 'Búsqueda con fuentes, imágenes e integración con Google',
    ideal: 'Si ya vives en Gmail y Drive, o preguntas con capturas de pantalla',
    precioUrl: 'https://gemini.google/subscriptions/',
  },
  {
    slug: 'copilot',
    nombre: 'GitHub Copilot',
    tipo: 'Asistente en el editor',
    dondeCorre: 'VS Code, Visual Studio, JetBrains, Neovim y GitHub',
    planGratis: 'limitado',
    brillaEn: 'Autocompletado y chat que conoce el archivo abierto',
    ideal: 'Cuando ya dominas lo básico y quieres velocidad sin salir del editor',
    precioUrl: 'https://github.com/features/copilot/plans',
  },
  {
    slug: 'cursor',
    nombre: 'Cursor',
    tipo: 'Editor con IA',
    dondeCorre: 'App de escritorio basada en VS Code',
    planGratis: 'limitado',
    brillaEn: 'Agente que edita varios archivos y chat con contexto del proyecto',
    ideal: 'Si quieres un editor completo con IA integrada desde el inicio',
    precioUrl: 'https://cursor.com/pricing',
  },
  {
    slug: 'perplexity',
    nombre: 'Perplexity',
    tipo: 'Buscador con IA',
    dondeCorre: 'Navegador, app de escritorio y celular',
    planGratis: 'limitado',
    brillaEn: 'Respuestas con fuentes citadas e información actual',
    ideal: 'Investigar librerías, errores raros e instalaciones oficiales',
    precioUrl: 'https://www.perplexity.ai/pro',
  },
  {
    slug: 'ollama',
    nombre: 'Ollama',
    tipo: 'Modelos locales',
    dondeCorre: 'Tu propia computadora, sin internet',
    planGratis: 'si',
    brillaEn: 'Privacidad total, sin límites de uso y código abierto',
    ideal: 'Experimentar, aprender cómo funciona un modelo y tu primer proyecto con IA',
    precioUrl: 'https://ollama.com/pricing',
  },
];
