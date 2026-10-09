import { SITE } from '@data/site';

type Plantilla = 'nuevo-recurso' | 'enlace-roto';

/** URL de un issue prellenado en el repositorio del proyecto. */
export const issueUrl = (plantilla: Plantilla, campos: Record<string, string> = {}): string => {
  const params = new URLSearchParams({ template: `${plantilla}.yml` });
  for (const [clave, valor] of Object.entries(campos)) {
    if (valor) params.set(clave, valor);
  }
  return `${SITE.repo}/issues/new?${params.toString()}`;
};

export const starUrl = (): string => SITE.repo;
