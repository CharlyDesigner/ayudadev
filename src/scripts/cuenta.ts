import { mostrarToast } from './toast';
import { progreso, reemplazarProgreso, alCambiarProgreso } from './progreso';
import { favoritos, reemplazarFavoritos, alCambiarFavoritos } from './favoritos';
import { diferencia, fusionarConcurrente, hayCambios, mensajeDeError, mismoConjunto } from '@/lib/cuenta';

/**
 * Cuenta opcional: el sitio funciona igual sin ella. Si la persona entró, progreso y favoritos
 * se sincronizan con el servidor. Lo que ya había en el navegador se une a la cuenta, no se pisa.
 *
 * `ayudadev:cuenta` es solo un indicio ("aquí hubo una sesión") para no consultar al servidor
 * a quien nunca entró. La seguridad la da la cookie de sesión del servidor, no esto.
 */
const INDICIO = 'ayudadev:cuenta';
const BASE = (tipo: Tipo) => `ayudadev:cuenta:base:${tipo}`;

type Tipo = 'progreso' | 'favoritos';

export interface Usuario {
  email: string;
  nombre: string;
  tiene_clave: boolean;
  totp: boolean;
  respaldo: number;
  github: string | null;
  desde: number;
}

export type Respuesta = { ok: boolean; code: string } & Record<string, any>;

let csrf: string | null = null;
let usuario: Usuario | null = null;
let consulta: Promise<Usuario | null> | null = null;

const guardarLocal = (clave: string, valor: string | null): void => {
  try {
    if (valor === null) localStorage.removeItem(clave);
    else localStorage.setItem(clave, valor);
  } catch {
    /* sin almacenamiento: la cuenta sigue funcionando en esta visita */
  }
};
const leerLocal = (clave: string): string | null => {
  try {
    return localStorage.getItem(clave);
  } catch {
    return null;
  }
};

const leerBase = (tipo: Tipo): string[] | null => {
  const crudo = leerLocal(BASE(tipo));
  if (crudo === null) return null;
  try {
    const lista = JSON.parse(crudo);
    return Array.isArray(lista) ? lista.filter((x) => typeof x === 'string') : null;
  } catch {
    return null;
  }
};
const guardarBase = (tipo: Tipo, lista: string[]): void => guardarLocal(BASE(tipo), JSON.stringify(lista));

export const hayIndicioDeSesion = (): boolean => leerLocal(INDICIO) === '1';
export const usuarioActual = (): Usuario | null => usuario;

/** Llamada a la API de cuentas. Nunca lanza: devuelve { ok: false, code } si algo falla. */
export const llamar = async (accion: string, cuerpo?: Record<string, unknown>): Promise<Respuesta> => {
  const esPost = cuerpo !== undefined;
  try {
    const res = await fetch(`/api/cuenta.php?a=${encodeURIComponent(accion)}`, {
      method: esPost ? 'POST' : 'GET',
      credentials: 'same-origin',
      headers: {
        Accept: 'application/json',
        ...(esPost ? { 'Content-Type': 'application/json' } : {}),
        ...(csrf ? { 'X-CSRF-Token': csrf } : {}),
      },
      body: esPost ? JSON.stringify(cuerpo) : undefined,
    });
    const datos = (await res.json().catch(() => null)) as Respuesta | null;
    if (!datos || typeof datos.ok !== 'boolean') return { ok: false, code: res.status === 404 ? 'no_disponible' : 'error' };
    return datos;
  } catch {
    return { ok: false, code: 'error' };
  }
};

/** ¿El servidor tiene las cuentas activas? En desarrollo o sin PHP responde que no y la interfaz se oculta. */
export const cuentasDisponibles = async (): Promise<{ disponible: boolean; github: boolean }> => {
  const r = await llamar('estado');
  return { disponible: r.ok && r.disponible === true, github: r.ok && r.github === true };
};

/** Consulta la sesión una sola vez por carga de página. */
export const cargarSesion = (): Promise<Usuario | null> => {
  consulta ??= llamar('yo').then((r) => {
    if (r.ok && r.usuario) {
      usuario = r.usuario as Usuario;
      csrf = String(r.csrf ?? '');
      guardarLocal(INDICIO, '1');
      return usuario;
    }
    if (r.code === 'sin_sesion') olvidarSesion();
    return null;
  });
  return consulta;
};

/** Vuelve a pedir el perfil al servidor (por ejemplo, tras activar el doble factor). */
export const recargarSesion = (): Promise<Usuario | null> => {
  consulta = null;
  return cargarSesion();
};

/** Tras entrar o crear la cuenta: guarda el CSRF, recarga el perfil y empieza a sincronizar. */
export const abrirSesion = async (token: string): Promise<Usuario | null> => {
  csrf = token;
  consulta = null;
  const u = await cargarSesion();
  if (u) await arrancarSincronizacion();
  return u;
};

/** Olvida la sesión solo en este navegador (el servidor ya la cerró o la cuenta ya no existe). No toca progreso ni favoritos. */
export const descartarSesionLocal = (): void => olvidarSesion();

const olvidarSesion = (): void => {
  csrf = null;
  usuario = null;
  consulta = null;
  guardarLocal(INDICIO, null);
  guardarLocal(BASE('progreso'), null);
  guardarLocal(BASE('favoritos'), null);
};

/** Cierra la sesión. Si la última sincronización salió bien, quita de este navegador lo que ya está en la cuenta. */
export const cerrarSesion = async (): Promise<boolean> => {
  const sincronizado = await sincronizar();
  const r = await llamar('salir', {});
  if (!r.ok) return false;
  olvidarSesion();
  if (sincronizado) {
    reemplazarProgreso([]);
    reemplazarFavoritos([]);
  }
  return true;
};

/* ---------------------------------------------------------------- sincronización */

let enCurso = false;
let repetir = false;
let temporizador: number | undefined;
let escuchando = false;

const programar = (): void => {
  if (!usuario) return;
  const hayAlgo = hayCambios(diferencia(progreso(), leerBase('progreso'))) || hayCambios(diferencia(favoritos(), leerBase('favoritos')));
  if (!hayAlgo) return;
  window.clearTimeout(temporizador);
  temporizador = window.setTimeout(() => void sincronizar(), 800);
};

const aplicar = (tipo: Tipo, servidor: string[], enviado: string[], ahora: string[], reemplazar: (l: string[]) => void): void => {
  const final = fusionarConcurrente(servidor, enviado, ahora);
  guardarBase(tipo, servidor);
  if (!mismoConjunto(final, ahora)) reemplazar(final);
};

/** Une lo local con la cuenta. Devuelve true si el servidor quedó al día. */
export const sincronizar = async (): Promise<boolean> => {
  if (!usuario) return false;
  if (enCurso) {
    repetir = true;
    return false;
  }
  enCurso = true;
  try {
    const enviadoProgreso = progreso();
    const enviadoFavoritos = favoritos();
    const r = await llamar('datos', {
      progreso: diferencia(enviadoProgreso, leerBase('progreso')),
      favoritos: diferencia(enviadoFavoritos, leerBase('favoritos')),
    });
    if (!r.ok) {
      if (r.code === 'sin_sesion') {
        olvidarSesion();
        mostrarToast('Tu sesión caducó. Vuelve a entrar para seguir sincronizando.', 'info');
      } else if (r.code === 'limite') {
        mostrarToast(mensajeDeError('limite'), 'info');
      }
      return false;
    }
    aplicar('progreso', r.progreso as string[], enviadoProgreso, progreso(), reemplazarProgreso);
    aplicar('favoritos', r.favoritos as string[], enviadoFavoritos, favoritos(), reemplazarFavoritos);
    return true;
  } finally {
    enCurso = false;
    if (repetir) {
      repetir = false;
      programar();
    }
  }
};

const arrancarSincronizacion = async (): Promise<void> => {
  if (!escuchando) {
    escuchando = true;
    alCambiarProgreso(programar);
    alCambiarFavoritos(programar);
  }
  await sincronizar();
};

/** Se llama en todas las páginas: si hubo sesión, la confirma y sincroniza. Sin indicio no hace ninguna petición. */
export const iniciarCuenta = (): void => {
  if (!hayIndicioDeSesion()) return;
  void cargarSesion().then((u) => (u ? arrancarSincronizacion() : undefined));
};
