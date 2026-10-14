import type { APIRoute, GetStaticPaths } from 'astro';
import { todosLosDocs } from '@lib/mcp-docs';

/** Un documento por archivo Markdown: /api/mcp/<tipo>/<id>.md */
export const getStaticPaths = (async () => {
  const docs = await todosLosDocs();
  return docs.map((d) => ({ params: { tipo: d.meta.tipo, slug: d.meta.id }, props: { markdown: d.markdown } }));
}) satisfies GetStaticPaths;

export const GET: APIRoute = ({ props }) =>
  new Response(props.markdown as string, { headers: { 'Content-Type': 'text/markdown; charset=utf-8' } });
