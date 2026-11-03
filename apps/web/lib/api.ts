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
  const rawText = await res.text().catch(() => '');
  let data: any = {};
  if (rawText && rawText.trim().length > 0) {
    try {
      data = JSON.parse(rawText);
    } catch {
      data = { message: rawText };
    }
  }
  if (!res.ok) {
    const details = Array.isArray(data?.details) ? ` ${data.details.join(' ')}` : '';
    throw new Error(`${data?.message || data?.error || `Request failed: ${res.status}`}${details}`);
  }
  return data;
}

