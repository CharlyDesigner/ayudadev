/** Utilidades puras de las cuentas: diferencias entre conjuntos para sincronizar y mensajes de error. */

export interface Diferencia {
  add: string[];
  remove: string[];
}

/**
 * Qué enviar al servidor. Con `base` (lo que el servidor ya tenía la última vez) se mandan solo los cambios;
 * sin `base` (primera vez que esta cuenta se usa en este navegador) se manda todo lo local como altas,
 * así nada de lo que ya había en el navegador se pierde.
 */
export const diferencia = (actual: string[], base: string[] | null): Diferencia => {
  const ahora = new Set(actual);
  if (base === null) return { add: [...ahora], remove: [] };
  const antes = new Set(base);
  return {
    add: [...ahora].filter((x) => !antes.has(x)),
    remove: [...antes].filter((x) => !ahora.has(x)),
  };
};

export const hayCambios = (d: Diferencia): boolean => d.add.length > 0 || d.remove.length > 0;

export const mismoConjunto = (a: string[], b: string[]): boolean => {
  const conjunto = new Set(a);
  return conjunto.size === new Set(b).size && b.every((x) => conjunto.has(x));
};

/**
 * Mezcla la respuesta del servidor con lo que cambió en el navegador mientras la petición viajaba:
 * `enviado` es lo local al mandar, `ahora` es lo local al volver. Las marcas hechas entre medias se conservan.
 */
export const fusionarConcurrente = (servidor: string[], enviado: string[], ahora: string[]): string[] => {
  const antes = new Set(enviado);
  const despues = new Set(ahora);
  const nuevas = [...despues].filter((x) => !antes.has(x));
  const quitadas = new Set([...antes].filter((x) => !despues.has(x)));
  return [...new Set([...servidor.filter((x) => !quitadas.has(x)), ...nuevas])];
};

const MENSAJES: Record<string, string> = {
  invalid: 'Ese correo no parece válido. Revísalo e inténtalo de nuevo.',
  consent: 'Marca la casilla de aceptación para continuar.',
  rate_limit: 'Demasiados intentos. Espera unos minutos y vuelve a probar.',
  security: 'No pudimos validar el envío. Recarga la página e inténtalo otra vez.',
  credenciales: 'Correo o contraseña incorrectos.',
  codigo: 'Ese código no es válido o ya se usó. Prueba con el siguiente de tu app.',
  reto: 'Pasó demasiado tiempo. Vuelve a escribir tu contraseña.',
  token: 'Este enlace ya se usó o caducó. Pide uno nuevo.',
  existe: 'Ya hay una cuenta con ese correo. Entra o restablece tu contraseña.',
  clave_corta: 'La contraseña debe tener al menos 10 caracteres.',
  clave_larga: 'La contraseña es demasiado larga.',
  clave_comun: 'Esa contraseña es demasiado común. Prueba con una frase larga que solo tú sepas.',
  clave_correo: 'La contraseña no puede parecerse a tu correo.',
  clave_incorrecta: 'La contraseña actual no es correcta.',
  sin_clave: 'Primero crea una contraseña; si no, te quedarías sin forma de entrar.',
  ya_activo: 'El doble factor ya está activo.',
  no_activo: 'El doble factor no está activo.',
  sin_pendiente: 'Empieza de nuevo la configuración del doble factor.',
  correo_no_coincide: 'El correo escrito no coincide con el de tu cuenta.',
  confirmacion: 'Escribe BORRAR para confirmar.',
  limite: 'Llegaste al límite de elementos que podemos guardar en tu cuenta.',
  sin_sesion: 'Tu sesión caducó. Vuelve a entrar.',
  no_disponible: 'Las cuentas no están disponibles por ahora. El resto del sitio funciona igual.',
  github_no: 'El inicio de sesión con GitHub todavía no está activado.',
  github_estado: 'No pudimos validar el regreso desde GitHub. Inténtalo otra vez.',
  github_cancelado: 'Cancelaste el acceso con GitHub.',
  github_fallo: 'GitHub no respondió como esperábamos. Inténtalo de nuevo en un momento.',
  github_sin_correo: 'Tu cuenta de GitHub no tiene un correo principal verificado. Verifícalo en GitHub e inténtalo otra vez.',
  github_ocupado: 'Esa cuenta de GitHub ya está vinculada a otra cuenta de AyudaDev.',
  github_ya_vinculado: 'Tu cuenta ya tiene otro usuario de GitHub vinculado. Desvincúlalo primero.',
  error: 'Algo falló. Inténtalo de nuevo en un momento.',
};

export const mensajeDeError = (codigo: string | undefined): string => MENSAJES[codigo ?? ''] ?? MENSAJES.error;

/** Mensajes de las páginas de cuenta tras volver de GitHub (`?ok=`). */
export const MENSAJES_OK: Record<string, string> = {
  entrada: 'Listo, ya entraste.',
  github_vinculado: 'Vinculaste tu cuenta de GitHub.',
};
