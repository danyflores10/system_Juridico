export class ApiError extends Error {
  readonly status: number;
  readonly details: unknown;

  constructor(message: string, status: number, details: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.details = details;
  }
}

function getApiBaseUrl() {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? process.env.NEXT_PUBLIC_DJANGO_API_URL;
  if (!apiUrl) {
    throw new Error("Falta configurar NEXT_PUBLIC_API_URL en Frontend/.env.local.");
  }
  return apiUrl.replace(/\/$/, "");
}

function getErrorMessage(payload: unknown, fallback: string) {
  if (payload && typeof payload === "object" && "detail" in payload && typeof payload.detail === "string") {
    return payload.detail;
  }
  return fallback;
}

export async function apiRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const isFormData = typeof FormData !== "undefined" && init?.body instanceof FormData;
  const response = await fetch(`${getApiBaseUrl()}/${path.replace(/^\//, "")}`, {
    ...init,
    headers: {
      Accept: "application/json",
      ...(init?.body && !isFormData ? { "Content-Type": "application/json" } : {}),
      ...init?.headers,
    },
  });

  const payload: unknown = response.status === 204 ? null : await response.json().catch(() => null);
  if (!response.ok) {
    throw new ApiError(
      getErrorMessage(payload, `La API respondió con el estado ${response.status}.`),
      response.status,
      payload,
    );
  }
  return payload as T;
}

export function getApiErrorMessage(error: unknown) {
  if (error instanceof ApiError) {
    if (error.details && typeof error.details === "object") {
      const messages = Object.values(error.details).flatMap((value) => {
        if (Array.isArray(value)) return value.filter((item): item is string => typeof item === "string");
        return typeof value === "string" ? [value] : [];
      });
      if (messages.length > 0) return messages.join(" ");
    }
    return error.message;
  }
  if (error instanceof Error) return error.message;
  return "Ocurrió un error inesperado.";
}
