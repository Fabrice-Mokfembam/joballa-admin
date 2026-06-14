import { ApiError, parseApiError } from "./errors";
import type { ApiErrorBody, ApiSuccess } from "./types";

const PUBLIC_AUTH_PATHS = [
  "/admin/auth/login",
  "/admin/auth/forgot-password",
  "/admin/auth/reset-password",
];

const ACCESS_TOKEN_STORAGE_KEY = "joballa-admin-token";
const REFRESH_TOKEN_STORAGE_KEY = "joballa-admin-refresh-token";
const REFRESH_PATH = "/admin/auth/refresh";

let accessToken: string | null = null;
let refreshToken: string | null = null;
let refreshPromise: Promise<string | null> | null = null;
const sessionExpiredListeners = new Set<() => void>();

const SENSITIVE_LOG_FIELDS = /password|token|authorization|secret|otp/i;

function redactForLog(value: unknown, key = ""): unknown {
  if (SENSITIVE_LOG_FIELDS.test(key)) {
    return value === undefined || value === null || value === "" ? value : "[REDACTED]";
  }
  if (Array.isArray(value)) {
    return value.map((item) => redactForLog(item));
  }
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([entryKey, entryValue]) => [
        entryKey,
        redactForLog(entryValue, entryKey),
      ])
    );
  }
  return value;
}

function requestBodyForLog(body: BodyInit | null | undefined): unknown {
  if (typeof body !== "string") return body ?? undefined;
  try {
    return JSON.parse(body) as unknown;
  } catch {
    return body;
  }
}

function logRequest(method: string, path: string, data?: unknown) {
  console.log(`[API REQUEST] ${method} ${path}`, redactForLog(data));
}

function logResponse(method: string, path: string, status: number, data?: unknown) {
  console.log(`[API RESPONSE] ${method} ${path} ${status}`, redactForLog(data));
}

function getApiBase() {
  const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL?.trim().replace(/\/$/, "");
  if (!apiBase) {
    throw new ApiError("NEXT_PUBLIC_API_BASE_URL is not configured.", 500);
  }
  return apiBase;
}

function readStoredAccessToken(): string | null {
  if (typeof window === "undefined") return null;

  const fromLocal = window.localStorage.getItem(ACCESS_TOKEN_STORAGE_KEY);
  if (fromLocal) return fromLocal;

  const legacy = window.sessionStorage.getItem(ACCESS_TOKEN_STORAGE_KEY);
  if (legacy) {
    window.localStorage.setItem(ACCESS_TOKEN_STORAGE_KEY, legacy);
    window.sessionStorage.removeItem(ACCESS_TOKEN_STORAGE_KEY);
    return legacy;
  }

  return null;
}

function readStoredRefreshToken(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(REFRESH_TOKEN_STORAGE_KEY);
}

function writeStoredAccessToken(token: string | null) {
  if (typeof window === "undefined") return;
  if (token) {
    window.localStorage.setItem(ACCESS_TOKEN_STORAGE_KEY, token);
  } else {
    window.localStorage.removeItem(ACCESS_TOKEN_STORAGE_KEY);
  }
}

function writeStoredRefreshToken(token: string | null) {
  if (typeof window === "undefined") return;
  if (token) {
    window.localStorage.setItem(REFRESH_TOKEN_STORAGE_KEY, token);
  } else {
    window.localStorage.removeItem(REFRESH_TOKEN_STORAGE_KEY);
  }
}

export function setAccessToken(token: string | null) {
  accessToken = token;
  writeStoredAccessToken(token);
}

export function getAccessToken(): string | null {
  if (accessToken) return accessToken;
  accessToken = readStoredAccessToken();
  return accessToken;
}

export function setRefreshToken(token: string | null) {
  refreshToken = token;
  writeStoredRefreshToken(token);
}

export function getRefreshToken(): string | null {
  if (refreshToken) return refreshToken;
  refreshToken = readStoredRefreshToken();
  return refreshToken;
}

export function setTokens(access: string | null, refresh: string | null) {
  setAccessToken(access);
  setRefreshToken(refresh);
}

export function clearAccessToken() {
  clearTokens();
}

export function clearTokens() {
  accessToken = null;
  refreshToken = null;
  writeStoredAccessToken(null);
  writeStoredRefreshToken(null);
}

/** Keep in-memory tokens in sync when another tab logs in or out. */
if (typeof window !== "undefined") {
  window.addEventListener("storage", (event) => {
    if (event.key === ACCESS_TOKEN_STORAGE_KEY) {
      accessToken = event.newValue;
    }
    if (event.key === REFRESH_TOKEN_STORAGE_KEY) {
      refreshToken = event.newValue;
    }
  });
}

export function onSessionExpired(listener: () => void) {
  sessionExpiredListeners.add(listener);
  return () => {
    sessionExpiredListeners.delete(listener);
  };
}

function notifySessionExpired() {
  for (const listener of sessionExpiredListeners) {
    listener();
  }
}

function isPublicAuthPath(path: string) {
  return PUBLIC_AUTH_PATHS.some((publicPath) => path.endsWith(publicPath));
}

function isRefreshPath(path: string) {
  return path.endsWith(REFRESH_PATH);
}

function shouldAttemptRefresh(
  path: string,
  hasAccessToken: boolean,
  skipAuth?: boolean,
  skipRefresh?: boolean
) {
  if (skipAuth || skipRefresh) return false;
  if (!hasAccessToken) return false;
  if (isRefreshPath(path)) return false;
  return !isPublicAuthPath(path);
}

function shouldNotifySessionExpired(
  status: number,
  options: {
    skipAuth?: boolean;
    skipSessionExpired?: boolean;
    refreshAttempted: boolean;
    path: string;
  }
) {
  if (status !== 401 || options.skipAuth || options.skipSessionExpired) return false;
  if (options.refreshAttempted) return true;
  return isRefreshPath(options.path);
}

async function refreshAccessToken(options?: { skipSessionExpired?: boolean }): Promise<string | null> {
  if (refreshPromise) return refreshPromise;

  refreshPromise = (async () => {
    try {
      const storedRefreshToken = getRefreshToken();
      const refreshBody = storedRefreshToken ? { refreshToken: storedRefreshToken } : undefined;
      logRequest("POST", REFRESH_PATH, refreshBody);
      const response = await fetch(`${getApiBase()}${REFRESH_PATH}`, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: refreshBody ? JSON.stringify(refreshBody) : undefined,
      });
      const responseLogBody = await response.clone().json().catch(() => undefined);
      logResponse("POST", REFRESH_PATH, response.status, responseLogBody);

      if (response.status === 401) {
        if (!options?.skipSessionExpired) {
          notifySessionExpired();
        }
        clearTokens();
        return null;
      }

      if (!response.ok) {
        return null;
      }

      const body = (await response.json()) as ApiSuccess<{
        accessToken: string;
        refreshToken?: string;
      }>;

      if (!body.data?.accessToken) {
        return null;
      }

      setAccessToken(body.data.accessToken);
      if (body.data.refreshToken) {
        setRefreshToken(body.data.refreshToken);
      }
      return body.data.accessToken;
    } catch (error) {
      console.log(`[API ERROR] POST ${REFRESH_PATH}`, error);
      return null;
    } finally {
      refreshPromise = null;
    }
  })();

  return refreshPromise;
}

export async function tryRefreshSession(options?: { skipSessionExpired?: boolean }): Promise<string | null> {
  if (!getAccessToken()) return null;
  return refreshAccessToken(options);
}

function buildQuery(params?: Record<string, string | number | boolean | undefined>): string {
  if (!params) return "";
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== "") {
      search.set(key, String(value));
    }
  }
  const query = search.toString();
  return query ? `?${query}` : "";
}

export async function apiRequest<T>(
  path: string,
  options: RequestInit & {
    params?: Record<string, string | number | boolean | undefined>;
    skipAuth?: boolean;
    skipRefresh?: boolean;
    skipSessionExpired?: boolean;
  } = {}
): Promise<T> {
  const { params, skipAuth, skipRefresh, skipSessionExpired, ...init } = options;
  const url = `${getApiBase()}${path}${buildQuery(params)}`;
  const method = init.method?.toUpperCase() ?? "GET";

  async function doFetch(token: string | null): Promise<Response> {
    const headers = new Headers(init.headers);
    const isFormData = typeof FormData !== "undefined" && init.body instanceof FormData;
    if (!headers.has("Content-Type") && init.body && !isFormData) {
      headers.set("Content-Type", "application/json");
    }
    if (token && !skipAuth) {
      headers.set("Authorization", `Bearer ${token}`);
    }

    logRequest(method, path, {
      params,
      body: requestBodyForLog(init.body),
    });

    try {
      return await fetch(url, {
        ...init,
        headers,
        credentials: "include",
      });
    } catch (error) {
      console.log(`[API ERROR] ${method} ${path}`, error);
      throw error;
    }
  }

  let token = skipAuth ? null : getAccessToken();
  let response = await doFetch(token);
  let refreshAttempted = false;

  if (response.status === 401 && shouldAttemptRefresh(path, Boolean(token), skipAuth, skipRefresh)) {
    refreshAttempted = true;
    const newToken = await refreshAccessToken({ skipSessionExpired });
    if (newToken) {
      token = newToken;
      response = await doFetch(newToken);
    } else if (!skipSessionExpired) {
      clearTokens();
    }
  }

  if (response.status === 204) {
    logResponse(method, path, response.status);
    return undefined as T;
  }

  let body: ApiSuccess<T> | ApiErrorBody | null = null;
  try {
    body = (await response.json()) as ApiSuccess<T> | ApiErrorBody;
  } catch {
    body = null;
  }
  logResponse(method, path, response.status, body);

  if (!response.ok) {
    if (
      shouldNotifySessionExpired(response.status, {
        skipAuth,
        skipSessionExpired,
        refreshAttempted,
        path,
      })
    ) {
      notifySessionExpired();
    }
    throw parseApiError(response.status, body as ApiErrorBody | null);
  }

  if (body && "success" in body && body.success) {
    if (body.meta && Array.isArray(body.data)) {
      return {
        items: body.data,
        page: body.meta.page,
        limit: body.meta.limit,
        total: body.meta.total,
        totalPages: body.meta.totalPages,
      } as T;
    }
    return body.data;
  }

  throw new ApiError("Unexpected response from server.", response.status);
}

export async function apiGet<T>(
  path: string,
  params?: Record<string, string | number | boolean | undefined>
): Promise<T> {
  return apiRequest<T>(path, { method: "GET", params });
}

export async function apiPost<T>(path: string, body?: unknown): Promise<T> {
  return apiRequest<T>(path, {
    method: "POST",
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
}

export async function apiPostForm<T>(path: string, formData: FormData): Promise<T> {
  return apiRequest<T>(path, {
    method: "POST",
    body: formData,
  });
}

export async function apiPatch<T>(path: string, body?: unknown): Promise<T> {
  return apiRequest<T>(path, {
    method: "PATCH",
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
}

export async function apiPut<T>(path: string, body?: unknown): Promise<T> {
  return apiRequest<T>(path, {
    method: "PUT",
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
}

export async function apiDelete<T>(path: string): Promise<T> {
  return apiRequest<T>(path, { method: "DELETE" });
}

export async function apiDownload(
  path: string,
  params?: Record<string, string | number | boolean | undefined>
): Promise<{ blob: Blob; filename: string }> {
  const url = `${getApiBase()}${path}${buildQuery(params)}`;
  const method = "GET";

  async function doFetch(token: string | null): Promise<Response> {
    const headers = new Headers({ Accept: "text/csv,application/octet-stream" });
    if (token) {
      headers.set("Authorization", `Bearer ${token}`);
    }
    logRequest(method, path, { params });
    return fetch(url, { method, headers, credentials: "include" });
  }

  let token = getAccessToken();
  let response = await doFetch(token);
  let refreshAttempted = false;

  if (response.status === 401 && shouldAttemptRefresh(path, Boolean(token))) {
    refreshAttempted = true;
    const newToken = await refreshAccessToken();
    if (newToken) {
      token = newToken;
      response = await doFetch(newToken);
    } else {
      clearTokens();
    }
  }

  if (!response.ok) {
    let body: ApiErrorBody | null = null;
    try {
      body = (await response.json()) as ApiErrorBody;
    } catch {
      body = null;
    }
    if (shouldNotifySessionExpired(response.status, { refreshAttempted, path })) {
      notifySessionExpired();
    }
    throw parseApiError(response.status, body);
  }

  const disposition = response.headers.get("Content-Disposition") ?? "";
  const filenameMatch = disposition.match(/filename="([^"]+)"/);
  const filename = filenameMatch?.[1] ?? "joballa-admin-report.csv";
  const blob = await response.blob();
  logResponse(method, path, response.status, { filename, size: blob.size });
  return { blob, filename };
}
