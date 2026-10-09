import type { Recurso, Tema, AreaId, Tipo, Nivel, Formato } from './schemas';
import { normalizar } from './text';

export interface Criterios {
  texto?: string;
  area?: AreaId | '';
  tema?: string;
  tipo?: Tipo | '';
  nivel?: Nivel | '';
  formato?: Formato | '';
  idioma?: 'es' | 'en' | '';
}

/** Filtro puro: se usa en build y en el navegador. */
export const filtrarRecursos = (lista: Recurso[], c: Criterios, temas: Tema[]): Recurso[] => {
  const q = normalizar(c.texto ?? '');
  const temasArea = c.area ? new Set(temas.filter((t) => t.area === c.area).map((t) => t.slug)) : null;
  return lista.filter((r) => {
    if (temasArea && !temasArea.has(r.tema)) return false;
    if (c.tema && r.tema !== c.tema) return false;
    if (c.tipo && r.tipo !== c.tipo) return false;
    if (c.nivel && r.nivel !== c.nivel) return false;
    if (c.formato && r.formato !== c.formato) return false;
    if (c.idioma && r.idioma !== c.idioma) return false;
    if (q) {
      const pajar = normalizar(`${r.titulo} ${r.autor} ${r.descripcion} ${r.etiquetas.join(' ')} ${r.tema}`);
      if (!q.split(/\s+/).every((palabra) => pajar.includes(palabra))) return false;
    }
    return true;
  });
};

export const recursosPorTema = (lista: Recurso[], tema: string): Recurso[] =>
  lista.filter((r) => r.tema === tema).sort(ordenRecursos);

export const contarPorTema = (lista: Recurso[]): Map<string, number> => {
  const conteo = new Map<string, number>();
  for (const r of lista) conteo.set(r.tema, (conteo.get(r.tema) ?? 0) + 1);
  return conteo;
};

const pesoNivel: Record<Nivel, number> = { principiante: 0, intermedio: 1, avanzado: 2 };

/** Destacados primero, luego por nivel y título. */
export const ordenRecursos = (a: Recurso, b: Recurso): number => {
  if (a.destacado !== b.destacado) return a.destacado ? -1 : 1;
  if (pesoNivel[a.nivel] !== pesoNivel[b.nivel]) return pesoNivel[a.nivel] - pesoNivel[b.nivel];
  return a.titulo.localeCompare(b.titulo, 'es');
};

export const destacados = (lista: Recurso[], max = 8): Recurso[] =>
  lista.filter((r) => r.destacado).sort((a, b) => a.titulo.localeCompare(b.titulo, 'es')).slice(0, max);
