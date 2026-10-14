import { archivoRecurso, idRecurso, urlNuevoArchivoGitHub, validarPropuesta, type Propuesta } from '@/lib/contribuir';
import { copiarTexto } from './copiar';
import { mostrarToast } from './toast';

/** Formulario de /contribuir/: valida en vivo y arma el enlace al editor de GitHub. */
export const montarContribuir = (): void => {
  const form = document.getElementById('form-recurso') as HTMLFormElement | null;
  const datos = document.getElementById('datos-contribuir');
  if (!form || !datos) return;

  const ctx = JSON.parse(datos.textContent ?? '{}') as { temas: string[]; urlsExistentes: string[]; repo: string };
  const errores = document.getElementById('errores-recurso') as HTMLElement;
  const salida = document.getElementById('salida-recurso') as HTMLElement;
  const codigo = document.getElementById('codigo-recurso') as HTMLElement;
  const ruta = document.getElementById('ruta-recurso') as HTMLElement;
  const abrir = document.getElementById('abrir-github') as HTMLAnchorElement;
  const copiar = document.getElementById('copiar-codigo') as HTMLButtonElement;
  let tocado = false;

  const leer = (): Propuesta => {
    const f = new FormData(form);
    const v = (k: string) => String(f.get(k) ?? '').trim();
    return {
      titulo: v('titulo'),
      autor: v('autor'),
      url: v('url'),
      tema: v('tema'),
      tipo: v('tipo'),
      nivel: v('nivel'),
      formato: v('formato'),
      idioma: v('idioma'),
      licencia: v('licencia'),
      descripcion: v('descripcion'),
      etiquetas: v('etiquetas').split(/[,\s]+/).map((t) => t.toLowerCase()).filter(Boolean),
    };
  };

  const hoy = () => new Date().toISOString().slice(0, 10);

  const actualizar = () => {
    const p = leer();
    const lista = validarPropuesta(p, ctx);
    const completo = Boolean(p.titulo && p.autor && p.url && p.tema && p.descripcion);
    if (tocado || completo) {
      errores.hidden = lista.length === 0;
      errores.innerHTML = lista.length ? `<p class="mb-1 font-semibold">Revisa esto antes de enviar:</p><ul class="list-disc space-y-0.5 pl-5">${lista.map((x) => `<li>${x.replace(/</g, '&lt;')}</li>`).join('')}</ul>` : '';
    }
    const valido = completo && lista.length === 0;
    salida.hidden = !valido;
    if (valido) {
      codigo.textContent = archivoRecurso(p, hoy());
      ruta.textContent = `src/data/recursos/comunidad/${idRecurso(p.tema, p.titulo)}.ts`;
      abrir.href = urlNuevoArchivoGitHub(ctx.repo, p, hoy());
    }
  };

  form.addEventListener('input', actualizar);
  form.addEventListener('change', actualizar);
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    tocado = true;
    actualizar();
    if (!salida.hidden) salida.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' });
  });
  copiar.addEventListener('click', async () => {
    const ok = await copiarTexto(codigo.textContent ?? '');
    mostrarToast(ok ? 'Código copiado' : 'No se pudo copiar', ok ? 'ok' : 'info');
  });
  actualizar();
};
