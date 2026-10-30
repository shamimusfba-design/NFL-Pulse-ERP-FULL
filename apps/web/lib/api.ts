const API = '/api';
export function getToken() {
  if (typeof window === 'undefined') return '';
  let t = localStorage.getItem('nfl_access_token');
  if (!t || t === 'undefined' || t === 'null') {
    t = 'demo-access-token';
    try { localStorage.setItem('nfl_access_token', t); } catch {}
  }
  return t;
}
export async function api(path: string, init: RequestInit = {}) {
  const headers = new Headers(init.headers || {});
  if (!(init.body instanceof FormData)) headers.set('Content-Type', 'application/json');
  const token = getToken();
  if (token) headers.set('Authorization', `Bearer ${token}`);
  const res = await fetch(`${API}${path}`, { ...init, headers, cache: 'no-store' });
  if (!res.ok) { const data = await res.json().catch(() => ({})); const details = Array.isArray(data.details) ? ` ${data.details.join(' ')}` : ''; throw new Error(`${data.message || data.error || `Request failed: ${res.status}`}${details}`); }
  return res.json();
}
