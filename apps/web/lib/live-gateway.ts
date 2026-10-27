/**
 * NOS live-backend gateway.
 *
 * Background (audit 27 Oct 2026): commit 27c3074 removed the Next.js rewrite
 * that forwarded /api/* to the NestJS + PostgreSQL API. Since then every
 * request has been answered by the in-memory mock in app/api/[...path]/route.ts,
 * so confirmed orders, imports and tasks are lost on restart and login accepts
 * any user.
 *
 * NOS_API_MODE controls behaviour (server-side env, read at request time):
 *   - "demo" (default): unchanged behaviour, everything answered by the mock.
 *   - "live": every route the Nest API actually implements is forwarded to
 *     API_INTERNAL_URL (default http://127.0.0.1:4000). Routes Nest does not
 *     implement yet still fall back to the mock, and those responses carry
 *     the header `x-nos-data-source: demo` so they can be found and migrated.
 *
 * LIVE_ROUTES is generated from the @Controller/@Get/@Post/... decorators in
 * apps/api/src. scripts/verify-live-routes.ts fails if the two drift apart.
 */

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

export const LIVE_ROUTES: Array<[HttpMethod, string]> = [
  ['POST', 'auth/login'],
  ['GET', 'cad/workqueue'],
  ['GET', 'cad/orders/:orderId/consumption'],
  ['PUT', 'cad/orders/:orderId/consumption'],
  ['GET', 'demo/module/:slug'],
  ['GET', 'demo/job360'],
  ['GET', 'demo/job360/:orderId'],
  ['GET', 'demo/status'],
  ['POST', 'demo/load'],
  ['DELETE', 'demo/clear'],
  ['GET', 'documents/styles'],
  ['GET', 'documents/styles/:styleId/forms'],
  ['GET', 'documents/styles/:styleId/forms/:formId'],
  ['POST', 'documents/styles/:styleId/forms'],
  ['POST', 'documents/styles/:styleId/forms/:formId/sync-order-data'],
  ['PATCH', 'documents/styles/:styleId/forms/:formId'],
  ['GET', 'domain/modules'],
  ['GET', 'health'],
  ['GET', 'ie-ops/target-context'],
  ['GET', 'ie-ops/jobs/search'],
  ['POST', 'ie-ops/targets'],
  ['PUT', 'ie-ops/targets/:id/close'],
  ['GET', 'ie-ops/targets'],
  ['POST', 'ie-ops/mis/import'],
  ['POST', 'ie-ops/npt/import'],
  ['POST', 'ie-ops/npt'],
  ['GET', 'ie-ops/npt'],
  ['GET', 'ie-ops/npt/summary'],
  ['GET', 'ie-ops/qco/rules'],
  ['PUT', 'ie-ops/qco/rules'],
  ['POST', 'ie-ops/qco/import'],
  ['POST', 'ie-ops/qco'],
  ['GET', 'ie-ops/qco'],
  ['GET', 'ie-ops/line-performance'],
  ['GET', 'ie-ops/overview'],
  ['GET', 'ie-ops/responsibility'],
  ['POST', 'ie-ops/responsibility'],
  ['DELETE', 'ie-ops/responsibility/:id'],
  ['GET', 'ie-ops/kpi'],
  ['POST', 'ie-ops/kpi/manual'],
  ['POST', 'ie-ops/actual-assign/import'],
  ['GET', 'ie-ops/actual-assign'],
  ['GET', 'ie-ops/skill-matrix'],
  ['POST', 'ie-ops/skill-matrix'],
  ['DELETE', 'ie-ops/skill-matrix/:id'],
  ['GET', 'ie-ops/checkpoints'],
  ['GET', 'ie-ops/kpi/yearly'],
  ['GET', 'ie-ops/kaizen'],
  ['POST', 'ie-ops/kaizen'],
  ['PUT', 'ie-ops/kaizen/:id/status'],
  ['GET', 'ie/workqueue'],
  ['GET', 'ie/daily-targets'],
  ['PUT', 'ie/styles/:styleId/bulletin'],
  ['GET', 'imports/catalog'],
  ['POST', 'imports/preview'],
  ['PUT', 'imports/:batchId/mapping'],
  ['POST', 'imports/:batchId/commit'],
  ['POST', 'imports/:batchId/rollback'],
  ['GET', 'imports/batches'],
  ['GET', 'imports/:batchId/rows'],
  ['PATCH', 'imports/:batchId/rows/:rowId'],
  ['GET', 'imports/running/:moduleSlug'],
  ['GET', 'imports/job/:jobNo'],
  ['GET', 'imports/:batchId'],
  ['GET', 'maintenance/dashboard'],
  ['GET', 'maintenance/weekly-requirement'],
  ['GET', 'maintenance/master'],
  ['POST', 'maintenance/master'],
  ['PUT', 'maintenance/master/:id'],
  ['PUT', 'maintenance/daily/:machineId'],
  ['POST', 'maintenance/daily/import'],
  ['GET', 'masters/factories'],
  ['GET', 'masters/buyers'],
  ['GET', 'masters/lines'],
  ['GET', 'masters/reference-categories'],
  ['GET', 'masters/references'],
  ['GET', 'masters/references/:category'],
  ['PUT', 'masters/lines/:lineId/machines'],
  ['POST', 'orders/import/preview'],
  ['POST', 'orders/import/confirm'],
  ['GET', 'orders/job-sequence'],
  ['POST', 'orders/job-sequence'],
  ['GET', 'orders/repeat-bases'],
  ['GET', 'orders'],
  ['GET', 'orders/:id'],
  ['PATCH', 'orders/styles/:styleId/merchandising-followup'],
  ['PATCH', 'orders/styles/:styleId/quantity'],
  ['POST', 'orders'],
  ['GET', 'planning/ta/workqueue'],
  ['GET', 'planning/ta/orders/:orderId'],
  ['POST', 'planning/ta/generate-pending'],
  ['POST', 'planning/ta/orders/:orderId/generate'],
  ['GET', 'planning/capacity/policies'],
  ['PUT', 'planning/capacity/policies'],
  ['GET', 'planning/capacity/heatmap'],
  ['GET', 'planning/ta/orders/:orderId/capacity-check'],
  ['PUT', 'planning/ta/orders/:orderId'],
  ['GET', 'planning/gantt'],
  ['GET', 'planning/gantt/find'],
  ['POST', 'planning/gantt/generate'],
  ['PUT', 'planning/gantt/styles/:styleId'],
  ['GET', 'planning/gantt/styles/:styleId/history'],
  ['POST', 'planning/gantt/styles/:styleId/undo'],
  ['POST', 'planning/gantt/approve'],
  ['GET', 'production-lots/styles'],
  ['GET', 'production-lots/styles/:styleId/overview'],
  ['POST', 'production-lots/styles/:styleId'],
  ['PATCH', 'production-lots/:lotId/status'],
  ['GET', 'tasks/my'],
  ['POST', 'uploads/item-image'],
  ['GET', 'uploads/items/:filename'],
];

const compiled = LIVE_ROUTES.map(([method, pattern]) => ({
  method,
  pattern,
  regex: new RegExp('^' + pattern.split('/').map((seg) => (seg.startsWith(':') ? '[^/]+' : seg.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))).join('/') + '$'),
}));

export function isLiveMode(): boolean {
  return (process.env.NOS_API_MODE || 'demo').trim().toLowerCase() === 'live';
}

/** True when the Nest API implements this method + path (path has no leading slash). */
export function isLiveRoute(method: string, path: string): boolean {
  const clean = path.replace(/^\/+|\/+$/g, '');
  const m = method.toUpperCase();
  return compiled.some((r) => r.method === m && r.regex.test(clean));
}

function apiBase(): string {
  return (process.env.API_INTERNAL_URL || 'http://127.0.0.1:4000').replace(/\/+$/, '');
}

const HOP_BY_HOP = new Set(['connection', 'keep-alive', 'transfer-encoding', 'upgrade', 'host', 'content-length', 'accept-encoding']);

/**
 * Forward the request to Nest when running in live mode and Nest implements the
 * route. Returns null when the caller should fall back to the demo mock.
 * The original request body is read only when forwarding, so the mock can still
 * read it when null is returned.
 */
export async function forwardToLiveApi(request: Request, path: string): Promise<Response | null> {
  if (!isLiveMode() || !isLiveRoute(request.method, path)) return null;

  const incoming = new URL(request.url);
  const target = `${apiBase()}/api/${path.replace(/^\/+/, '')}${incoming.search}`;
  const headers = new Headers();
  request.headers.forEach((value, key) => {
    if (!HOP_BY_HOP.has(key.toLowerCase())) headers.set(key, value);
  });

  const hasBody = !['GET', 'HEAD'].includes(request.method.toUpperCase());
  let upstream: Response;
  try {
    upstream = await fetch(target, {
      method: request.method,
      headers,
      body: hasBody ? await request.arrayBuffer() : undefined,
      cache: 'no-store',
      redirect: 'manual',
    });
  } catch (error: any) {
    // In live mode never silently fall back to demo data for a live route.
    return new Response(
      JSON.stringify({ message: `NOS API is unreachable at ${apiBase()}. Start the API service (live mode).`, detail: error?.message }),
      { status: 502, headers: { 'Content-Type': 'application/json', 'x-nos-data-source': 'live-unreachable' } },
    );
  }

  const outHeaders = new Headers();
  upstream.headers.forEach((value, key) => {
    if (!HOP_BY_HOP.has(key.toLowerCase()) && key.toLowerCase() !== 'content-encoding') outHeaders.set(key, value);
  });
  outHeaders.set('x-nos-data-source', 'live');
  return new Response(await upstream.arrayBuffer(), { status: upstream.status, headers: outHeaders });
}

/** Mark a mock response so demo data can never be mistaken for live data. */
export function markDemo(response: Response): Response {
  try {
    response.headers.set('x-nos-data-source', 'demo');
  } catch {
    /* immutable headers – ignore */
  }
  return response;
}
