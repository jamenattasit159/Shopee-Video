import { getCatalogItem } from "./errorCatalog";

export type Severity = "info" | "warning" | "error" | "fatal";
export type Source =
  | "ui"
  | "api"
  | "gemini"
  | "tts"
  | "voice"
  | "render"
  | "import"
  | "storage"
  | "remotion"
  | "ffmpeg"
  | "preflight"
  | "export"
  | "queue"
  | "db"
  | "auth";

export interface AppError {
  id: string; // uuid ต่อครั้ง
  code: string; // รหัสจากแคตตาล็อก
  severity: Severity;
  source: Source;
  messageTh: string; // ข้อความสั้นที่ผู้ใช้เห็น
  hintTh: string; // วิธีแก้
  details?: unknown; // redact แล้วเท่านั้น
  context?: Record<string, unknown>; // เช่น sceneId, productId, fileName (ห้ามมีความลับ)
  retryable?: boolean;
  timestamp: string;
}

/**
 * Generate a lightweight unique identifier
 */
export function generateErrorId(): string {
  return "err_" + Date.now().toString(36) + "_" + Math.random().toString(36).substring(2, 7);
}

/**
 * Redacts secrets, credentials, API keys, URLs, and local user paths
 */
export function redact<T>(value: T): T {
  if (value === null || value === undefined) {
    return value;
  }

  if (typeof value === "string") {
    let str: string = value as string;

    // 1. Redact Google API keys starting with AIza...
    str = str.replace(/AIza[0-9A-Za-z-_]{35}/g, "AIza***[REDACTED]");

    // 2. Redact generic keys/tokens in query parameters or auth headers
    str = str.replace(/(key|token|secret|password|apiKey|api_key|access_token)=([^& \t\r\n]+)/gi, "$1=***");
    str = str.replace(/Bearer\s+[A-Za-z0-9\-._~+/]+=*/gi, "Bearer ***");

    // 3. Redact Affiliate query parameters and tracking tokens in URLs
    str = str.replace(/(https?:\/\/[^\s?#]+)\?[^\s]+/g, (match, base) => {
      // Keep URL base, redact query parameters
      return `${base}?[QUERY_REDACTED]`;
    });

    // 4. Redact Windows user paths (e.g. C:\Users\Username\... -> C:\Users\***\...)
    str = str.replace(/([A-Za-z]:\\Users\\)[^\\]+/gi, "$1***");
    str = str.replace(/(\/home\/)[^\/]+/gi, "$1***");

    return str as unknown as T;
  }

  if (Array.isArray(value)) {
    return value.map((item) => redact(item)) as unknown as T;
  }

  if (typeof value === "object") {
    const redactedObj: Record<string, unknown> = {};
    const secretKeyPattern = /key|secret|token|password|auth|cookie|credential/i;

    for (const [k, v] of Object.entries(value)) {
      if (secretKeyPattern.test(k)) {
        redactedObj[k] = "***[REDACTED]***";
      } else {
        redactedObj[k] = redact(v);
      }
    }
    return redactedObj as unknown as T;
  }

  return value;
}

/**
 * Converts any unknown error, string, or object into a standardized AppError
 */
export function toAppError(
  err: unknown,
  codeOrHint?: string,
  contextOverride?: Record<string, unknown>
): AppError {
  const timestamp = new Date().toISOString();
  const id = generateErrorId();

  let codeOverride: string | undefined = undefined;
  let hintOverride: string | undefined = undefined;

  if (codeOrHint) {
    if (getCatalogItem(codeOrHint).code === codeOrHint) {
      codeOverride = codeOrHint;
    } else {
      hintOverride = codeOrHint;
    }
  }

  // If already an AppError
  if (
    err &&
    typeof err === "object" &&
    "code" in err &&
    "messageTh" in err &&
    "severity" in err
  ) {
    const existing = err as AppError;
    const finalCode = codeOverride || existing.code;
    const cat = getCatalogItem(finalCode);
    return {
      ...existing,
      id: existing.id || id,
      code: cat.code,
      severity: cat.severity || existing.severity,
      source: cat.source || existing.source,
      messageTh: existing.messageTh || cat.messageTh,
      timestamp: existing.timestamp || timestamp,
      hintTh: hintOverride || existing.hintTh || cat.hintTh,
      context: {
        ...(existing.context || {}),
        ...(contextOverride || {}),
      },
      details: redact(existing.details),
    };
  }

  // Check if error is an API error response object with error property
  if (err && typeof err === "object" && "error" in err) {
    const errorProp = (err as any).error;
    if (typeof errorProp === "object" && errorProp && "code" in errorProp) {
      return toAppError(errorProp, codeOrHint, contextOverride);
    }
    if (typeof errorProp === "string") {
      return toAppError(new Error(errorProp), codeOrHint, contextOverride);
    }
  }

  let code = codeOverride || "UNKNOWN";
  let rawMessage = "";
  let stack: string | undefined;

  if (err instanceof Error) {
    rawMessage = err.message;
    stack = err.stack;
    if ((err as any).code && typeof (err as any).code === "string") {
      code = (err as any).code;
    }
  } else if (typeof err === "string") {
    rawMessage = err;
  } else {
    rawMessage = String(err);
  }

  // Automatic code inference from message text
  if (code === "UNKNOWN") {
    const msgLower = rawMessage.toLowerCase();
    if (
      msgLower.includes("consent flow failed") ||
      msgLower.includes("finish_reason_input_vr_takedown") ||
      msgLower.includes("didn't match the text")
    ) {
      code = "VOICE_CONSENT_MISMATCH";
    } else if (msgLower.includes("ffmpeg") && (msgLower.includes("not recognized") || msgLower.includes("enoent"))) {
      code = "FFMPEG_NOT_FOUND";
    } else if (msgLower.includes("quota") || msgLower.includes("429") || msgLower.includes("resource_exhausted")) {
      code = "GEMINI_QUOTA";
    } else if (msgLower.includes("api key") || msgLower.includes("api_key") || msgLower.includes("gemini_api_key")) {
      code = "GEMINI_BAD_KEY";
    } else if (msgLower.includes("timeout") || msgLower.includes("etimedout")) {
      code = "GEMINI_TIMEOUT";
    } else if (msgLower.includes("network") || msgLower.includes("failed to fetch") || msgLower.includes("econnrefused")) {
      code = "NETWORK_OFFLINE";
    } else if (msgLower.includes("image") && (msgLower.includes("decode") || msgLower.includes("corrupt"))) {
      code = "IMAGE_DECODE_FAILED";
    } else if (msgLower.includes("voice") && msgLower.includes("not found")) {
      code = "VOICE_NOT_FOUND";
    }
  }

  const catalog = getCatalogItem(code);

  return {
    id,
    code: catalog.code,
    severity: catalog.severity,
    source: catalog.source,
    messageTh: catalog.messageTh || rawMessage || "เกิดข้อผิดพลาดไม่ทราบสาเหตุ",
    hintTh: hintOverride || catalog.hintTh || "กรุณาลองใหม่อีกครั้ง หรือติดต่อผู้ดูแลระบบ",
    details: redact({
      rawMessage,
      stack: stack ? stack.split("\n").slice(0, 5).join("\n") : undefined,
      original: typeof err === "object" ? err : undefined,
    }),
    context: contextOverride ? (redact(contextOverride) as Record<string, unknown>) : undefined,
    retryable: catalog.retryable,
    timestamp,
  };
}
