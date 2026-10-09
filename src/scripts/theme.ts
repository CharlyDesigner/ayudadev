export type Tema = 'light' | 'dark';

const CLAVE = 'ayudadev-theme';
const root = document.documentElement;
const media = window.matchMedia('(prefers-color-scheme: light)');

export const temaActual = (): Tema => (root.dataset.theme as Tema | undefined) ?? (media.matches ? 'light' : 'dark');

export const aplicarTema = (tema: Tema): void => {
  root.dataset.theme = tema;
  try {
    localStorage.setItem(CLAVE, tema);
  } catch {
    /* almacenamiento bloqueado: el tema dura solo esta visita */
  }
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', tema === 'light' ? '#f3f3f1' : '#0b0b0c');
  document.dispatchEvent(new CustomEvent('ayudadev:theme-change', { detail: tema }));
};

export const alternarTema = (): Tema => {
  const siguiente: Tema = temaActual() === 'light' ? 'dark' : 'light';
  aplicarTema(siguiente);
  return siguiente;
};

export const alCambiarTema = (cb: (tema: Tema) => void): void => {
  document.addEventListener('ayudadev:theme-change', () => cb(temaActual()));
  media.addEventListener('change', () => cb(temaActual()));
};
