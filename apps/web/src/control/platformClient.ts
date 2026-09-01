/**
 * Platform Control Center client. Uses same-origin proxy in Vite.
 * Does not invent metrics. Server remains commercial authority.
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

export async function platformLogin(email: string, password: string) {
  return parse(
    await fetch('/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    })
  );
}

export async function controlGet(path: string, token: string) {
  return parse(
    await fetch(path, {
      headers: { Authorization: `Bearer ${token}` },
    })
  );
}
