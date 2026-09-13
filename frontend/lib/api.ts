const API_URL = (
  process.env.NEXT_PUBLIC_LMS_API_URL ||
  process.env.NEXT_PUBLIC_API_URL ||
  "http://localhost:4000"
).replace(/\/$/, "");

function apiUrl(path: string) {
  return `${API_URL}${path.startsWith("/") ? path : `/${path}`}`;
}

async function getToken() {
  if (typeof window === "undefined") return undefined;
  const { auth } = await import("@/lib/firebase");
  return auth.currentUser?.getIdToken();
}

export async function apiFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = await getToken();
  const headers = new Headers(init.headers);

  headers.set("Content-Type", "application/json");
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const response = await fetch(apiUrl(path), {
    ...init,
    headers,
    cache: "no-store"
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    throw new Error(payload.error || `Request failed (${response.status})`);
  }

  return response.json();
}

export async function publicApiFetch<T>(path: string): Promise<T> {
  const response = await fetch(apiUrl(path), { cache: "no-store" });

  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    throw new Error(payload.error || `Request failed (${response.status})`);
  }

  return response.json();
}
