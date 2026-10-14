import { mensajeDeError } from '@/lib/cuenta';
import type { Respuesta } from './cuenta';

/** Piezas comunes de las páginas /cuenta/, /cuenta/registro/ y /cuenta/clave/. */

export const qs = <T extends HTMLElement = HTMLElement>(selector: string, raiz: ParentNode = document): T | null => raiz.querySelector<T>(selector);

/** Muestra una sola vista de la página (`[data-vista]`) y oculta las demás. */
export const mostrarVista = (nombre: string): void => {
  document.querySelectorAll<HTMLElement>('[data-vista]').forEach((el) => {
    el.hidden = el.dataset.vista !== nombre;
  });
};

/** Mensaje en la región `[data-cta-aviso]`, anunciado por lectores de pantalla. */
export const aviso = (texto: string, tipo: 'ok' | 'error' = 'ok'): void => {
  const el = qs('[data-cta-aviso]');
  if (!el) return;
  el.hidden = texto === '';
  el.textContent = texto;
  el.className = `mt-4 rounded-2xl border border-line bg-surface px-4 py-3 text-sm ${tipo === 'ok' ? 'text-accent-ink' : 'text-danger'}`;
};

export const valor = (form: HTMLFormElement, nombre: string): string => {
  const campo = form.elements.namedItem(nombre);
  return campo instanceof HTMLInputElement || campo instanceof HTMLSelectElement || campo instanceof HTMLTextAreaElement ? campo.value : '';
};

export const marcado = (form: HTMLFormElement, nombre: string): boolean => {
  const campo = form.elements.namedItem(nombre);
  return campo instanceof HTMLInputElement && campo.checked;
};

/**
 * Conecta un formulario: evita el doble envío, muestra el error en `[data-cta-error]` del propio formulario
 * y, si el manejador devuelve `ok`, no hace nada más (cada pantalla decide qué sigue).
 */
export const conectarFormulario = (form: HTMLFormElement | null, manejador: (form: HTMLFormElement) => Promise<Respuesta | undefined>): void => {
  if (!form) return;
  const error = qs('[data-cta-error]', form);
  const boton = qs<HTMLButtonElement>('button[type="submit"]', form);
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!form.reportValidity()) return;
    if (error) error.hidden = true;
    if (boton) boton.disabled = true;
    try {
      const r = await manejador(form);
      if (r && !r.ok && error) {
        error.textContent = mensajeDeError(r.code);
        error.hidden = false;
      }
    } finally {
      if (boton) boton.disabled = false;
    }
  });
};

/** Casillas "Mostrar contraseña": alternan el tipo de los campos de contraseña de su formulario. */
export const conectarMostrarClave = (): void => {
  document.querySelectorAll<HTMLInputElement>('[data-cta-mostrar]').forEach((casilla) => {
    casilla.addEventListener('change', () => {
      casilla.form?.querySelectorAll<HTMLInputElement>('input[data-cta-clave]').forEach((campo) => {
        campo.type = casilla.checked ? 'text' : 'password';
      });
    });
  });
};

/** Quita de la barra de direcciones lo que no debe quedarse en el historial (tokens, mensajes). */
export const limpiarDireccion = (): void => {
  history.replaceState(null, '', location.pathname);
};
