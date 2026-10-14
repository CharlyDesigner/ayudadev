import { mostrarToast } from './toast';

/**
 * Progreso guardado solo en el navegador (localStorage).
 * ids: 'guia:<slug>', 'reto:<slug>', 'proyecto:<slug>', 'ruta:<slug>:<n>'
 */
const CLAVE = 'ayudadev:progreso';
const EVENTO = 'ayudadev:progreso-change';

const leer = (): string[] => {
  try {
    const raw = localStorage.getItem(CLAVE);
    const lista = raw ? JSON.parse(raw) : [];
    return Array.isArray(lista) ? lista.filter((x) => typeof x === 'string') : [];
  } catch {
    return [];
  }
};
const guardar = (lista: string[]): void => {
  try {
    localStorage.setItem(CLAVE, JSON.stringify([...new Set(lista)]));
  } catch {
    /* sin almacenamiento: el progreso no persiste */
  }
  document.dispatchEvent(new CustomEvent(EVENTO));
};

export const progreso = (): string[] => leer();
export const estaHecho = (id: string): boolean => leer().includes(id);
export const alternarHecho = (id: string): boolean => {
  const lista = leer();
  const i = lista.indexOf(id);
  if (i >= 0) lista.splice(i, 1);
  else lista.push(id);
  guardar(lista);
  return i < 0;
};
export const reemplazarProgreso = (lista: string[]): void => guardar(lista);
export const alCambiarProgreso = (cb: () => void): void => {
  document.addEventListener(EVENTO, cb);
  window.addEventListener('storage', (e) => e.key === CLAVE && cb());
};

/** Botones [data-prog-id], barras [data-prog-ruta] y contadores [data-prog-count]. */
export const montarProgreso = (): void => {
  const sync = () => {
    const hechos = new Set(leer());
    document.querySelectorAll<HTMLButtonElement>('[data-prog-id]').forEach((btn) => {
      const on = hechos.has(btn.dataset.progId ?? '');
      btn.setAttribute('aria-pressed', String(on));
      const etiqueta = btn.querySelector<HTMLElement>('[data-prog-label]');
      if (etiqueta) etiqueta.textContent = on ? (btn.dataset.labelOn ?? 'Completado') : (btn.dataset.labelOff ?? 'Marcar como completado');
      btn.closest<HTMLElement>('[data-prog-item]')?.toggleAttribute('data-hecho', on);
    });
    document.querySelectorAll<HTMLElement>('[data-prog-ruta]').forEach((barra) => {
      const slug = barra.dataset.progRuta ?? '';
      const total = Number(barra.dataset.progTotal ?? '0');
      const n = [...hechos].filter((id) => id.startsWith(`ruta:${slug}:`)).length;
      const pct = total ? Math.round((n / total) * 100) : 0;
      const fill = barra.querySelector<HTMLElement>('[data-prog-fill]');
      if (fill) fill.style.width = `${pct}%`;
      const texto = barra.querySelector<HTMLElement>('[data-prog-text]');
      if (texto) texto.textContent = n === 0 ? 'Aún no empiezas' : n === total ? 'Ruta completada' : `${n} de ${total} pasos`;
      barra.setAttribute('aria-valuenow', String(pct));
    });
    document.querySelectorAll<HTMLElement>('[data-prog-count]').forEach((el) => {
      const prefijo = el.dataset.progCount ?? '';
      el.textContent = String([...hechos].filter((id) => id.startsWith(prefijo)).length);
    });
  };

  document.addEventListener('click', (e) => {
    const btn = (e.target as HTMLElement).closest<HTMLButtonElement>('[data-prog-id]');
    if (!btn) return;
    e.preventDefault();
    const on = alternarHecho(btn.dataset.progId ?? '');
    mostrarToast(on ? 'Marcado como completado' : 'Quitado de tu progreso', on ? 'ok' : 'info');
  });
  alCambiarProgreso(sync);
  sync();
};
