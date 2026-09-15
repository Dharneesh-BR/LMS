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
  const { getFirebaseAuth } = await import("@/lib/firebase");
  const auth = getFirebaseAuth();
  return auth?.currentUser?.getIdToken();
}

export async function apiFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);
  const token = headers.has("Authorization") ? undefined : await getToken();

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

export async function apiDownloadFile(path: string, fallbackFilename: string) {
  const token = await getToken();
  const headers = new Headers();
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const response = await fetch(apiUrl(path), {
    headers,
    cache: "no-store"
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    throw new Error(payload.error || `Download failed (${response.status})`);
  }

  const disposition = response.headers.get("Content-Disposition") || "";
  const filenameMatch = disposition.match(/filename="?([^"]+)"?/i);
  const filename = filenameMatch?.[1] || fallbackFilename;
  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export async function publicApiFetch<T>(path: string): Promise<T> {
  const response = await fetch(apiUrl(path), { cache: "no-store" });

  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    throw new Error(payload.error || `Request failed (${response.status})`);
  }

  return response.json();
}
