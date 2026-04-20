const API = (import.meta.env.VITE_AUTH_API_URL as string | undefined)?.replace(
  /\/$/,
  "",
) || "http://localhost:5000/api/auth";

async function parseJsonSafe(res: Response) {
  try {
    return await res.json();
  } catch {
    return {};
  }
}

async function postAuth<TBody extends Record<string, unknown>>(
  path: string,
  body: TBody,
  fallbackError: string,
) {
  let res: Response;
  try {
    res = await fetch(`${API}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  } catch {
    throw new Error(
      "Cannot reach the authentication server. Make sure backend server is running on port 5000.",
    );
  }

  const data = await parseJsonSafe(res);
  if (!res.ok) throw new Error(data.error || fallbackError);
  return data;
}

export async function registerUser(username: string, email: string, password: string) {
  const data = await postAuth("/register", { username, email, password }, "Registration failed");
  localStorage.setItem("token", data.token);
  localStorage.setItem("user", JSON.stringify(data.user));
  return data;
}

export async function loginUser(email: string, password: string) {
  const data = await postAuth("/login", { email, password }, "Login failed");
  localStorage.setItem("token", data.token);
  localStorage.setItem("user", JSON.stringify(data.user));
  return data;
}

export function logout() {
  localStorage.removeItem("token");
  localStorage.removeItem("user");
  window.location.href = "/login";
}

export function getToken(): string | null {
  return localStorage.getItem("token");
}

export function getCurrentUser() {
  const u = localStorage.getItem("user");
  return u ? JSON.parse(u) : null;
}

export function isLoggedIn(): boolean {
  return !!getToken();
}
