/** Aviso breve no intrusivo (role=status). Un solo contenedor en BaseLayout. */
let timer: number | undefined;

export const mostrarToast = (mensaje: string, tipo: 'ok' | 'info' = 'ok'): void => {
  const el = document.getElementById('toast');
  if (!el) return;
  el.textContent = mensaje;
  el.dataset.tipo = tipo;
  el.classList.add('is-visible');
  window.clearTimeout(timer);
  timer = window.setTimeout(() => el.classList.remove('is-visible'), 2200);
};
