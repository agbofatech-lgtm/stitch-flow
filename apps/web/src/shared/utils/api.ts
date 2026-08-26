export const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';

export async function apiGet<T = unknown>(url: string): Promise<T> {
  const res = await fetch(`${API_BASE}${url}`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

export async function apiPost<T = unknown>(url: string, data: unknown): Promise<T> {
  const res = await fetch(`${API_BASE}${url}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

export async function apiPut<T = unknown>(url: string, data: unknown): Promise<T> {
  const res = await fetch(`${API_BASE}${url}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

export async function apiDelete<T = unknown>(url: string): Promise<T> {
  const res = await fetch(`${API_BASE}${url}`, { method: 'DELETE' });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json().catch(() => ({} as T));
}

export async function parseJson<T>(response: Response): Promise<T> {
  return response.json();
}