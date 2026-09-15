const API_URL: string = import.meta.env.VITE_API_URL ?? "/api";

export class ApiError extends Error {
  status: number;
  detail?: string;
  constructor(status: number, message: string, detail?: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.detail = detail;
  }
}

export function isMockMode(): boolean {
  return import.meta.env.VITE_USE_MOCK !== "false";
}

export function sessionExpiredEventName(): string {
  return "auth:session-expired";
}

export function emitSessionExpired() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(sessionExpiredEventName()));
}

export interface ApiOptions {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  body?: unknown;
  token?: string | null;
  signal?: AbortSignal;
  formData?: FormData;
}

function buildHeaders(opts: ApiOptions): Record<string, string> {
  const headers: Record<string, string> = {};
  if (opts.token) headers["Authorization"] = `Bearer ${opts.token}`;
  if (opts.body !== undefined && !opts.formData) {
    headers["Content-Type"] = "application/json";
  }
  return headers;
}

async function parseResponse<T>(res: Response): Promise<T> {
  if (res.status === 204) return undefined as T;

  const raw = await res.text();
  let data: unknown = null;
  if (raw) {
    try {
      data = JSON.parse(raw);
    } catch {
      data = raw;
    }
  }

  if (!res.ok) {
    if (res.status === 429) {
      const retry = res.headers.get("Retry-After");
      throw new ApiError(
        429,
        retry
          ? `Too many attempts. Try again in ${retry}s.`
          : "Too many requests. Please slow down.",
        retry ?? undefined
      );
    }
    const detail =
      data && typeof data === "object" && "detail" in data
        ? String((data as { detail: unknown }).detail)
        : undefined;
    throw new ApiError(
      res.status,
      detail ?? `Request failed (${res.status})`,
      detail
    );
  }

  return data as T;
}

async function doFetch<T>(path: string, opts: ApiOptions): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    method: opts.method ?? "GET",
    headers: buildHeaders(opts),
    body: opts.formData
      ? opts.formData
      : opts.body !== undefined
      ? JSON.stringify(opts.body)
      : undefined,
    signal: opts.signal,
  });
  return await parseResponse<T>(res);
}

let refreshInFlight: Promise<boolean> | null = null;

async function requestRefresh(refreshToken: string): Promise<boolean> {
  try {
    const res = await fetch(`${API_URL}/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refresh_token: refreshToken }),
    });
    if (!res.ok) return false;
    const data = (await res.json().catch(() => null)) as
      | { access_token?: string; refresh_token?: string }
      | null;
    if (!data || typeof data.access_token !== "string") return false;
    storeTokens(data.access_token, data.refresh_token ?? refreshToken);
    return true;
  } catch {
    return false;
  }
}

export function refreshSession(): Promise<boolean> {
  const refresh = getStoredTokens().refresh;
  if (!refresh) return Promise.resolve(false);
  if (!refreshInFlight) {
    refreshInFlight = requestRefresh(refresh).finally(() => {
      refreshInFlight = null;
    });
  }
  return refreshInFlight;
}

export async function apiFetch<T>(
  path: string,
  opts: ApiOptions = {}
): Promise<T> {
  try {
    return await doFetch<T>(path, opts);
  } catch (err) {
    const retried = (opts as ApiOptions & { _retried?: boolean })._retried;
    if (
      err instanceof ApiError &&
      err.status === 401 &&
      opts.token &&
      !retried
    ) {
      const refreshed = await refreshSession();
      if (refreshed) {
        const attempt: ApiOptions & { _retried?: boolean } = {
          ...opts,
          token: getStoredTokens().access,
          _retried: true,
        };
        return await doFetch<T>(path, attempt);
      }
      clearStoredTokens();
      emitSessionExpired();
    }
    throw err;
  }
}

export function getStoredTokens(): {
  access: string | null;
  refresh: string | null;
} {
  try {
    const raw = localStorage.getItem("sp-tokens");
    if (!raw) return { access: null, refresh: null };
    const parsed = JSON.parse(raw) as { access?: string; refresh?: string };
    return {
      access: typeof parsed.access === "string" ? parsed.access : null,
      refresh: typeof parsed.refresh === "string" ? parsed.refresh : null,
    };
  } catch {
    return { access: null, refresh: null };
  }
}

export function storeTokens(access: string, refresh: string) {
  localStorage.setItem(
    "sp-tokens",
    JSON.stringify({ access, refresh })
  );
}

export function clearStoredTokens() {
  localStorage.removeItem("sp-tokens");
}