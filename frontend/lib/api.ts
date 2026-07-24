const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

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

  const response = await fetch(`${API_URL}${path}`, {
    ...init,
    headers,
    cache: "no-store"
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    throw new Error(payload.error || "Request failed");
  }

  return response.json();
}

export async function publicApiFetch<T>(path: string): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, { cache: "no-store" });

  if (!response.ok) {
    throw new Error("Request failed");
  }

  return response.json();
}
