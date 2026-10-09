const MENSAJES: Record<string, string> = {
  ok: 'Listo. Revisa tu correo y confirma la suscripción (mira también en spam).',
  invalid: 'Ese correo no parece válido. Revísalo e inténtalo de nuevo.',
  consent: 'Marca la casilla de aceptación para continuar.',
  rate_limit: 'Demasiados intentos. Espera unos minutos y vuelve a probar.',
  mail_failed: 'No pudimos enviar el correo de confirmación. Inténtalo más tarde.',
  security: 'No pudimos validar el envío. Recarga la página e inténtalo otra vez.',
  too_fast: 'Espera un par de segundos antes de enviar.',
  error: 'Algo falló. Inténtalo de nuevo en un momento.',
};

export const montarNewsletter = (): void => {
  document.querySelectorAll<HTMLFormElement>('[data-newsletter]').forEach((form) => {
    if (form.dataset.montado) return;
    form.dataset.montado = '1';
    const status = form.querySelector<HTMLElement>('[data-newsletter-status]');
    const boton = form.querySelector<HTMLButtonElement>('button[type="submit"]');
    const mostrar = (codigo: string, ok: boolean) => {
      if (!status) return;
      status.hidden = false;
      status.textContent = MENSAJES[codigo] ?? MENSAJES.error;
      status.className = `text-sm ${ok ? 'text-accent-ink' : 'text-danger'}`;
    };

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const email = form.querySelector<HTMLInputElement>('input[name="email"]');
      const consentimiento = form.querySelector<HTMLInputElement>('input[name="consentimiento"]');
      if (!email?.value || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.value)) return mostrar('invalid', false);
      if (consentimiento && !consentimiento.checked) return mostrar('consent', false);

      if (boton) boton.disabled = true;
      try {
        const res = await fetch(form.action, {
          method: 'POST',
          body: new FormData(form),
          headers: { Accept: 'application/json' },
        });
        const data = (await res.json().catch(() => ({}))) as { ok?: boolean; code?: string };
        mostrar(data.code ?? (res.ok ? 'ok' : 'error'), Boolean(data.ok));
        if (data.ok) form.reset();
      } catch {
        mostrar('error', false);
      } finally {
        if (boton) boton.disabled = false;
      }
    });
  });

  // Mensaje tras un envío sin JS (redirect con ?ok=1 o ?error=codigo).
  const params = new URLSearchParams(location.search);
  const status = document.querySelector<HTMLElement>('[data-newsletter-status]');
  if (status && (params.has('ok') || params.has('error'))) {
    status.hidden = false;
    const ok = params.has('ok');
    status.textContent = MENSAJES[ok ? 'ok' : params.get('error') ?? 'error'] ?? MENSAJES.error;
    status.className = `text-sm ${ok ? 'text-accent-ink' : 'text-danger'}`;
  }
};
