import type { ApiResponse } from "@/lib/types";

const DEFAULT_API_URL = "http://localhost:8000";

export class ApiError extends Error {
  status: number;
  data: unknown;

  constructor(message: string, status = 400, data: unknown = null) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.data = data;
  }
}

export type AuthRole = "student" | "admin" | "auto";

function getBaseUrl() {
  return (
    process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") || DEFAULT_API_URL
  );
}

function readToken(role: AuthRole): string | null {
  if (typeof window === "undefined") return null;
  if (role === "student") return localStorage.getItem("student_token");
  if (role === "admin") return localStorage.getItem("admin_token");
  return (
    localStorage.getItem("admin_token") ||
    localStorage.getItem("student_token")
  );
}

export function setStudentToken(token: string | null) {
  if (typeof window === "undefined") return;
  if (token) localStorage.setItem("student_token", token);
  else localStorage.removeItem("student_token");
}

export function setAdminToken(token: string | null) {
  if (typeof window === "undefined") return;
  if (token) localStorage.setItem("admin_token", token);
  else localStorage.removeItem("admin_token");
}

export function getStudentToken() {
  return readToken("student");
}

export function getAdminToken() {
  return readToken("admin");
}

type RequestOptions = {
  method?: string;
  body?: unknown;
  auth?: AuthRole;
  token?: string | null;
  headers?: Record<string, string>;
  formData?: FormData;
  query?: Record<string, string | number | boolean | null | undefined>;
};

function buildUrl(path: string, query?: RequestOptions["query"]) {
  const url = new URL(
    path.startsWith("http") ? path : `${getBaseUrl()}${path.startsWith("/") ? "" : "/"}${path}`,
  );
  if (query) {
    Object.entries(query).forEach(([key, value]) => {
      if (value === undefined || value === null || value === "") return;
      url.searchParams.set(key, String(value));
    });
  }
  return url.toString();
}

export async function apiRequest<T>(
  path: string,
  options: RequestOptions = {},
): Promise<T> {
  const {
    method = "GET",
    body,
    auth = "auto",
    token,
    headers = {},
    formData,
    query,
  } = options;

  const finalHeaders: Record<string, string> = { ...headers };
  const bearer = token !== undefined ? token : readToken(auth);
  if (bearer) {
    finalHeaders.Authorization = `Bearer ${bearer}`;
  }

  let payload: BodyInit | undefined;
  if (formData) {
    payload = formData;
  } else if (body !== undefined) {
    finalHeaders["Content-Type"] = "application/json";
    payload = JSON.stringify(body);
  }

  const response = await fetch(buildUrl(path, query), {
    method,
    headers: finalHeaders,
    body: payload,
    cache: "no-store",
  });

  let json: ApiResponse<T> | null = null;
  try {
    json = (await response.json()) as ApiResponse<T>;
  } catch {
    if (!response.ok) {
      throw new ApiError("Server javobi o‘qilmadi", response.status);
    }
    throw new ApiError("Noto‘g‘ri server javobi", response.status);
  }

  if (!response.ok || !json.success) {
    throw new ApiError(
      json.message || "So‘rov bajarilmadi",
      response.status,
      json.data,
    );
  }

  return json.data as T;
}

export const api = {
  get: <T>(path: string, options?: Omit<RequestOptions, "method" | "body">) =>
    apiRequest<T>(path, { ...options, method: "GET" }),
  post: <T>(
    path: string,
    body?: unknown,
    options?: Omit<RequestOptions, "method" | "body">,
  ) => apiRequest<T>(path, { ...options, method: "POST", body }),
  patch: <T>(
    path: string,
    body?: unknown,
    options?: Omit<RequestOptions, "method" | "body">,
  ) => apiRequest<T>(path, { ...options, method: "PATCH", body }),
  delete: <T>(path: string, options?: Omit<RequestOptions, "method" | "body">) =>
    apiRequest<T>(path, { ...options, method: "DELETE" }),
  upload: <T>(
    path: string,
    formData: FormData,
    options?: Omit<RequestOptions, "method" | "formData" | "body">,
  ) => apiRequest<T>(path, { ...options, method: "POST", formData }),
};
