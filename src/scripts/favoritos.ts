const CLAVE = 'ayudadev:favoritos';
const EVENTO = 'ayudadev:favoritos-change';

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
    /* sin almacenamiento: los favoritos no persisten */
  }
  document.dispatchEvent(new CustomEvent(EVENTO));
};

export const favoritos = (): string[] => leer();
export const esFavorito = (id: string): boolean => leer().includes(id);
export const alternarFavorito = (id: string): boolean => {
  const lista = leer();
  const i = lista.indexOf(id);
  if (i >= 0) lista.splice(i, 1);
  else lista.push(id);
  guardar(lista);
  return i < 0;
};
export const reemplazarFavoritos = (lista: string[]): void => guardar(lista);
export const alCambiarFavoritos = (cb: () => void): void => {
  document.addEventListener(EVENTO, cb);
  window.addEventListener('storage', (e) => {
    if (e.key === CLAVE) cb();
  });
};

/** Conecta todos los botones [data-fav-id] de la página y el contador del header. */
export const montarFavoritos = (): void => {
  const sync = () => {
    const lista = leer();
    document.querySelectorAll<HTMLButtonElement>('[data-fav-id]').forEach((btn) => {
      const activo = lista.includes(btn.dataset.favId ?? '');
      btn.setAttribute('aria-pressed', String(activo));
      btn.title = activo ? 'Quitar de favoritos' : 'Guardar en favoritos';
    });
    document.querySelectorAll<HTMLElement>('[data-fav-count]').forEach((el) => {
      el.textContent = String(lista.length);
      el.hidden = lista.length === 0;
    });
  };
  document.addEventListener('click', (e) => {
    const btn = (e.target as HTMLElement).closest<HTMLButtonElement>('[data-fav-id]');
    if (!btn) return;
    e.preventDefault();
    alternarFavorito(btn.dataset.favId ?? '');
  });
  alCambiarFavoritos(sync);
  sync();
};
