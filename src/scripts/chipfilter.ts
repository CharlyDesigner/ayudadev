/**
 * Filtros por chips para listados. Marcado esperado:
 *  - contenedor [data-chipfilter] con botones [data-chip-grupo="nivel"][data-chip-valor="principiante"]
 *  - elementos filtrables [data-item] con atributos data-<grupo>="valor" (varios valores separados por espacio)
 *  - [data-chip-count] muestra cuántos elementos visibles hay; [data-chip-empty] aparece si no hay ninguno.
 */
const limpiar = (s: string): string => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();

export const montarChipFilter = (): void => {
  const raiz = document.querySelector<HTMLElement>('[data-chipfilter]');
  if (!raiz) return;
  const items = [...document.querySelectorAll<HTMLElement>('[data-item]')];
  const botones = [...raiz.querySelectorAll<HTMLButtonElement>('[data-chip-grupo]')];
  const buscador = raiz.querySelector<HTMLInputElement>('[data-chip-q]');
  const estado: Record<string, string> = {};

  const aplicar = () => {
    const q = limpiar(buscador?.value ?? '');
    let visibles = 0;
    for (const it of items) {
      let ok = true;
      for (const [grupo, valor] of Object.entries(estado)) {
        if (!valor) continue;
        const attr = (it.dataset[grupo] ?? '').split(' ');
        if (!attr.includes(valor)) { ok = false; break; }
      }
      if (ok && q) {
        const texto = limpiar(it.dataset.texto ?? it.textContent ?? '');
        ok = q.split(/\s+/).every((p) => texto.includes(p));
      }
      it.hidden = !ok;
      if (ok) visibles++;
    }
    document.querySelectorAll<HTMLElement>('[data-chip-count]').forEach((el) => (el.textContent = String(visibles)));
    document.querySelectorAll<HTMLElement>('[data-chip-empty]').forEach((el) => (el.hidden = visibles > 0));
    document.querySelectorAll<HTMLElement>('[data-chip-seccion]').forEach((s) => (s.hidden = !s.querySelector('[data-item]:not([hidden])')));
  };

  botones.forEach((b) =>
    b.addEventListener('click', () => {
      const grupo = b.dataset.chipGrupo ?? '';
      const valor = b.dataset.chipValor ?? '';
      estado[grupo] = valor;
      botones.filter((x) => x.dataset.chipGrupo === grupo).forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
      aplicar();
    })
  );
  buscador?.addEventListener('input', aplicar);
  aplicar();
};
