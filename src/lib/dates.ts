const formatoLargo = new Intl.DateTimeFormat('es-MX', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });
const formatoCorto = new Intl.DateTimeFormat('es-MX', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC' });

export const fechaLarga = (fecha: Date | string): string => formatoLargo.format(aFecha(fecha));
export const fechaCorta = (fecha: Date | string): string => formatoCorto.format(aFecha(fecha));
export const fechaISO = (fecha: Date | string): string => aFecha(fecha).toISOString().slice(0, 10);

export const aFecha = (fecha: Date | string): Date => (fecha instanceof Date ? fecha : new Date(`${fecha}T00:00:00Z`));
