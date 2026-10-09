export const copiarTexto = async (texto: string): Promise<boolean> => {
  try {
    await navigator.clipboard.writeText(texto);
    return true;
  } catch {
    const ta = document.createElement('textarea');
    ta.value = texto;
    ta.setAttribute('readonly', '');
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.append(ta);
    ta.select();
    let ok = false;
    try {
      ok = document.execCommand('copy');
    } catch {
      ok = false;
    }
    ta.remove();
    return ok;
  }
};

const marcar = (btn: HTMLElement, ok: boolean) => {
  const original = btn.dataset.labelOriginal ?? btn.textContent ?? 'Copiar';
  btn.dataset.labelOriginal = original;
  btn.dataset.copied = String(ok);
  btn.textContent = ok ? 'Copiado' : 'No se pudo copiar';
  window.setTimeout(() => {
    btn.textContent = original;
    delete btn.dataset.copied;
  }, 1600);
};

/** Añade un botón "Copiar" a cada bloque de código y activa los [data-copy]. */
export const montarCopiar = (): void => {
  document.querySelectorAll<HTMLPreElement>('pre.astro-code').forEach((pre) => {
    if (pre.parentElement?.classList.contains('code-wrap')) return;
    const wrap = document.createElement('div');
    wrap.className = 'code-wrap';
    pre.replaceWith(wrap);
    wrap.append(pre);
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'copy-btn';
    btn.textContent = 'Copiar';
    btn.setAttribute('aria-label', 'Copiar código');
    btn.addEventListener('click', async () => marcar(btn, await copiarTexto(pre.innerText)));
    wrap.append(btn);
  });

  document.addEventListener('click', async (e) => {
    const btn = (e.target as HTMLElement).closest<HTMLElement>('[data-copy]');
    if (!btn) return;
    const objetivo = btn.dataset.copy ? document.querySelector<HTMLElement>(btn.dataset.copy) : null;
    const texto = objetivo?.innerText ?? btn.dataset.copyText ?? '';
    if (!texto) return;
    marcar(btn, await copiarTexto(texto));
  });
};
