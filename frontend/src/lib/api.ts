const BASE = (import.meta.env.development.VITE_API_URL || "").replace(
  /\/+$/,
  "",
);

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { "Content-Type": "application/json", ...(init?.headers || {}) },
    credentials: "include", // keep if you’ll use cookies/sessions
    ...init,
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(
      `${res.status} ${res.statusText}${text ? " – " + text : ""}`,
    );
  }
  return res.json() as Promise<T>;
}

export const api = {
  health: () => request<{ ok: boolean }>("/health"),
  ping: () => request<{ ok: boolean; ts?: number }>("/api/v1/ping"),
  // add more endpoints here as you build them
};
