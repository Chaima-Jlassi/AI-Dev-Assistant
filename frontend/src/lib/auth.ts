const API = 'http://localhost:5000/api/auth';

export async function registerUser(username: string, email: string, password: string) {
  const res = await fetch(`${API}/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, email, password }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Registration failed');
  localStorage.setItem('token', data.token);
  localStorage.setItem('user', JSON.stringify(data.user));
  return data;
}

export async function loginUser(email: string, password: string) {
  const res = await fetch(`${API}/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Login failed');
  localStorage.setItem('token', data.token);
  localStorage.setItem('user', JSON.stringify(data.user));
  return data;
}

export function logout() {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  window.location.href = '/login';
}

export function getToken(): string | null {
  return localStorage.getItem('token');
}

export function getCurrentUser() {
  const u = localStorage.getItem('user');
  return u ? JSON.parse(u) : null;
}

export function isLoggedIn(): boolean {
  return !!getToken();
}