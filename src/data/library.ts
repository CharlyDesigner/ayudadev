/**
 * Catálogo completo. Cada tema vive en su archivo dentro de ./recursos.
 * Política: solo enlaces a la fuente original, con licencia y fecha de verificación.
 */
import { recursoSchema, type Recurso } from '@lib/schemas';
import { recursosPorTema as porTema, contarPorTema, destacados as destacar, ordenRecursos } from '@lib/catalog';
import { TEMAS } from './temas';

const modulos = import.meta.glob<{ default: unknown[] }>('./recursos/*.ts', { eager: true });

const crudos = Object.values(modulos).flatMap((m) => m.default);

export const RECURSOS: Recurso[] = crudos.map((r) => recursoSchema.parse(r)).sort(ordenRecursos);

export const recursosPorTema = (slug: string): Recurso[] => porTema(RECURSOS, slug);
export const conteoPorTema = (): Map<string, number> => contarPorTema(RECURSOS);
export const recursosDestacados = (max = 8): Recurso[] => destacar(RECURSOS, max);
export const recursoPorId = (id: string): Recurso | undefined => RECURSOS.find((r) => r.id === id);

export const conteoPorArea = (): Map<string, number> => {
  const porTemaMap = conteoPorTema();
  const conteo = new Map<string, number>();
  for (const t of TEMAS) conteo.set(t.area, (conteo.get(t.area) ?? 0) + (porTemaMap.get(t.slug) ?? 0));
  return conteo;
};
