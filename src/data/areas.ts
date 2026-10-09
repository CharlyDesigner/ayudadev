import type { AreaId } from '@lib/schemas';

export interface Area {
  id: AreaId;
  nombre: string;
  descripcion: string;
  icono: string;
}

export const AREAS_INFO: Area[] = [
  { id: 'fundamentos', nombre: 'Fundamentos', descripcion: 'Lógica, algoritmos y cómo funciona una computadora.', icono: 'school' },
  { id: 'lenguajes', nombre: 'Lenguajes', descripcion: 'De JavaScript y Python a Rust, C o Kotlin.', icono: 'code' },
  { id: 'desarrollo-web', nombre: 'Desarrollo web', descripcion: 'HTML, CSS, accesibilidad y Node.js.', icono: 'world' },
  { id: 'frameworks', nombre: 'Frameworks', descripcion: 'React, Astro, Django y otras herramientas de alto nivel.', icono: 'layers' },
  { id: 'plataformas', nombre: 'Plataformas', descripcion: 'Android y desarrollo para móviles.', icono: 'device-mobile' },
  { id: 'herramientas', nombre: 'Herramientas', descripcion: 'Git, Docker y la terminal de Linux.', icono: 'tool' },
  { id: 'bases-de-datos', nombre: 'Bases de datos', descripcion: 'SQL y modelado de datos.', icono: 'database' },
  { id: 'ia-y-datos', nombre: 'IA y datos', descripcion: 'Inteligencia artificial, modelos de lenguaje y ciencia de datos.', icono: 'sparkles' },
];

export const areaPorId = (id: AreaId): Area => {
  const area = AREAS_INFO.find((a) => a.id === id);
  if (!area) throw new Error(`Área desconocida: ${id}`);
  return area;
};
