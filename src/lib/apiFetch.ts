import { toAppError, AppError } from "./errors";
import { dispatchError } from "./errorStore";

export class ApiError extends Error {
  appError: AppError;

  constructor(appError: AppError) {
    super(appError.messageTh);
    this.name = "ApiError";
    this.appError = appError;
  }
}

export interface ApiFetchOptions {
  silent?: boolean;
  retryAction?: () => void | Promise<void>;
}

export type ApiFetchInit = Omit<RequestInit, "body"> & { body?: any };

/**
 * Universal client-side fetch wrapper.
 * Intercepts network failures, HTTP 4xx/5xx errors, and JSON errors,
 * formats them into standardized AppErrors, and broadcasts them to ErrorStore.
 * Automatically serializes plain object bodies and parses JSON responses.
 */
export async function apiFetch<T = any>(
  input: RequestInfo | URL,
  init?: ApiFetchInit,
  options?: ApiFetchOptions
): Promise<T> {
  let finalInit: RequestInit | undefined = init;

  if (
    init &&
    init.body &&
    typeof init.body === "object" &&
    !(init.body instanceof FormData) &&
    !(init.body instanceof Blob) &&
    !(init.body instanceof URLSearchParams)
  ) {
    finalInit = {
      ...init,
      headers: {
        "Content-Type": "application/json",
        ...init.headers,
      },
      body: JSON.stringify(init.body),
    };
  }

  try {
    const res = await fetch(input, finalInit);

    if (!res.ok) {
      let errorBody: any = null;
      try {
        const text = await res.text();
        try {
          errorBody = JSON.parse(text);
        } catch (jsonErr: any) {
          console.debug("[apiFetch] Error body is not JSON:", jsonErr?.message);
          errorBody = text;
        }
      } catch (readErr: any) {
        console.debug("[apiFetch] Failed to read error body:", readErr?.message);
        errorBody = null;
      }

      let appError: AppError;

      if (errorBody && typeof errorBody === "object" && errorBody.error) {
        appError = toAppError(errorBody.error);
      } else if (typeof errorBody === "string" && errorBody.trim()) {
        appError = toAppError(errorBody);
      } else {
        const urlStr = typeof input === "string" ? input : (input as any)?.url || "API";
        appError = toAppError(new Error(`HTTP ${res.status}: ${res.statusText} (${urlStr})`));
      }

      if (!options?.silent) {
        dispatchError(appError, options?.retryAction);
      }

      throw new ApiError(appError);
    }

    // Parse JSON or text response
    const contentType = res.headers.get("content-type") || "";
    let data: any;

    if (contentType.includes("application/json")) {
      data = await res.json();
    } else {
      try {
        const text = await res.text();
        try {
          data = JSON.parse(text);
        } catch (parseErr: any) {
          console.debug("[apiFetch] Plain text response:", parseErr?.message);
          data = text;
        }
      } catch (readTextErr: any) {
        console.debug("[apiFetch] Failed to read text:", readTextErr?.message);
        data = null;
      }
    }

    // If payload contains warnings (e.g. FALLBACK_USED), dispatch them
    if (data && typeof data === "object" && Array.isArray(data.warnings)) {
      data.warnings.forEach((warn: any) => {
        dispatchError(toAppError(warn));
      });
    }

    return data as T;
  } catch (err: any) {
    if (err instanceof ApiError) {
      throw err;
    }

    // Network disconnection or unexpected client error
    const isOffline = typeof navigator !== "undefined" && !navigator.onLine;
    const appError = toAppError(
      isOffline
        ? {
            code: "NETWORK_OFFLINE",
            messageTh: "ไม่สามารถเชื่อมต่ออินเทอร์เน็ตได้",
            hintTh: "กรุณาตรวจสอบการเชื่อมต่อ Wi-Fi หรืออินเทอร์เน็ตของคุณ แล้วลองใหม่อีกครั้ง",
            severity: "warning",
            source: "ui",
          }
        : err
    );

    if (!options?.silent) {
      dispatchError(appError, options?.retryAction);
    }

    throw new ApiError(appError);
  }
}

/**
 * Convenience helper to fetch and parse JSON with AppError interception
 */
export async function apiFetchJson<T = any>(
  input: RequestInfo | URL,
  init?: RequestInit,
  options?: ApiFetchOptions
): Promise<T> {
  return apiFetch<T>(input, init, options);
}
