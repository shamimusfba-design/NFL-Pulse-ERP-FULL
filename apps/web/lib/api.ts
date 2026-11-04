const API = '/api';

export function getToken() {
  if (typeof window === 'undefined') return '';
  return localStorage.getItem('nfl_access_token') || '';
}

export async function api(path: string, init: RequestInit = {}) {
  const headers = new Headers(init.headers || {});
  if (!(init.body instanceof FormData)) headers.set('Content-Type', 'application/json');
  const token = getToken();
  if (token) headers.set('Authorization', `Bearer ${token}`);
  
  const res = await fetch(`${API}${path}`, { ...init, headers, cache: 'no-store' });

  if (res.status === 401 && typeof window !== 'undefined') {
    if (window.location.pathname !== '/login' && !path.includes('/auth/')) {
      localStorage.removeItem('nfl_access_token');
      window.location.href = '/login';
    }
  }

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
