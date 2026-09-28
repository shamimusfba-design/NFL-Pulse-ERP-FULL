const API = '/api';
export function getToken() { if (typeof window === 'undefined') return ''; return localStorage.getItem('nfl_access_token') || ''; }
export async function api(path: string, init: RequestInit = {}) {
  const headers = new Headers(init.headers || {});
  if (!(init.body instanceof FormData)) headers.set('Content-Type', 'application/json');
  const token = getToken();
  if (token) headers.set('Authorization', `Bearer ${token}`);
  const res = await fetch(`${API}${path}`, { ...init, headers, cache: 'no-store' });
  if (res.status === 401 && typeof window !== 'undefined') { localStorage.removeItem('nfl_access_token'); window.location.href = '/login'; }
  if (!res.ok) { const data = await res.json().catch(() => ({})); throw new Error(data.message || `Request failed: ${res.status}`); }
  return res.json();
}
