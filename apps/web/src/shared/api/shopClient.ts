/**
 * SAC-3 authenticated shop client. Does not replace AppContext.
 * Server remains shop API authority. UI SoT remains local until SAC-5.
 */

async function parse(res: Response) {
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(body.message || body.error || `HTTP ${res.status}`);
    (err as Error & { code?: string; status?: number }).code = body.error;
    (err as Error & { status?: number }).status = res.status;
    throw err;
  }
  return body;
}

export async function shopRequest(
  path: string,
  token: string,
  init: RequestInit & { tenantId?: string; workspaceId?: string } = {}
) {
  const headers = new Headers(init.headers);
  headers.set('Authorization', `Bearer ${token}`);
  headers.set('Content-Type', 'application/json');
  if (init.tenantId) headers.set('x-tenant-id', init.tenantId);
  if (init.workspaceId) headers.set('x-workspace-id', init.workspaceId);
  const { tenantId: _t, workspaceId: _w, ...rest } = init;
  return parse(await fetch(path, { ...rest, headers }));
}
