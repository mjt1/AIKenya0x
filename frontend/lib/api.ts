import type { AgentProfile, AuthTokenResponse, LoginInput } from "./types";

/**
 * Base URL of the Suluhu NestJS backend.
 * Configurable via NEXT_PUBLIC_API_URL; defaults to the docker-compose backend port.
 */
const API_BASE = (
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000"
).replace(/\/+$/, "");

const TOKEN_KEY = "suluhu.token";

/* ------------------------------ token storage ----------------------------- */

export function getStoredToken(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setStoredToken(token: string): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(TOKEN_KEY, token);
  } catch {
    /* ignore quota / privacy-mode errors */
  }
}

export function clearStoredToken(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(TOKEN_KEY);
  } catch {
    /* ignore */
  }
}

/* --------------------------------- errors --------------------------------- */

export class ApiError extends Error {
  readonly status: number;
  constructor(status: number, message: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

/* ------------------------------- core fetch ------------------------------- */

type ApiFetchOptions = Omit<RequestInit, "body"> & {
  body?: unknown;
  /** Attach the stored bearer token. Defaults to true. */
  auth?: boolean;
};

export async function apiFetch<T>(
  path: string,
  options: ApiFetchOptions = {},
): Promise<T> {
  const { body, auth = true, headers, ...rest } = options;

  // FormData (file uploads) must go out untouched: don't JSON.stringify it,
  // and don't set Content-Type — the browser adds the multipart boundary.
  const isFormData = typeof FormData !== "undefined" && body instanceof FormData;

  const finalHeaders = new Headers(headers);
  if (body !== undefined && !isFormData && !finalHeaders.has("Content-Type")) {
    finalHeaders.set("Content-Type", "application/json");
  }
  if (auth) {
    const token = getStoredToken();
    if (token) finalHeaders.set("Authorization", `Bearer ${token}`);
  }

  let res: Response;
  try {
    res = await fetch(`${API_BASE}${path}`, {
      ...rest,
      headers: finalHeaders,
      body:
        body === undefined
          ? undefined
          : isFormData
            ? (body as FormData)
            : JSON.stringify(body),
    });
  } catch {
    throw new ApiError(
      0,
      "Network error — couldn't reach the Suluhu API. Is the backend running?",
    );
  }

  if (res.status === 204) return undefined as T;

  const raw = await res.text();
  const data = raw ? safeJson(raw) : null;

  if (!res.ok) {
    throw new ApiError(res.status, extractMessage(data, res.statusText));
  }
  return data as T;
}

function safeJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

function extractMessage(data: unknown, fallback: string): string {
  if (data && typeof data === "object" && "message" in data) {
    const m = (data as { message: unknown }).message;
    if (Array.isArray(m)) return m.join(", ");
    if (typeof m === "string") return m;
  }
  return fallback || "Request failed";
}

/* ------------------------------ auth endpoints ---------------------------- */

export function login(input: LoginInput): Promise<AuthTokenResponse> {
  return apiFetch<AuthTokenResponse>("/auth/login", {
    method: "POST",
    body: input,
    auth: false,
  });
}

export function fetchProfile(): Promise<AgentProfile> {
  return apiFetch<AgentProfile>("/auth/me", { method: "GET" });
}
