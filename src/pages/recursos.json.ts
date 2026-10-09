import type { APIRoute } from 'astro';
import { RECURSOS } from '@data/library';

/** Catálogo completo en JSON: lo usa la página de favoritos y cualquier persona que quiera reutilizarlo. */
export const GET: APIRoute = () =>
  new Response(JSON.stringify(RECURSOS), { headers: { 'Content-Type': 'application/json; charset=utf-8' } });
