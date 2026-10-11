import { NextRequest, NextResponse } from "next/server";
import { AppError, toAppError } from "./errors";
import { logError } from "./errorLogger";

export type ApiHandler = (
  req: NextRequest,
  context?: any
) => Promise<NextResponse | Response>;

/**
 * Maps error codes to appropriate HTTP status codes
 */
export function getHttpStatusForError(err: AppError, explicitStatus?: number): number {
  if (explicitStatus && explicitStatus >= 400 && explicitStatus <= 599) {
    return explicitStatus;
  }

  switch (err.code) {
    case "NO_URL":
    case "DOMAIN_NOT_ALLOWED":
    case "UPLOAD_INVALID":
    case "VOICE_CONSENT_MISMATCH":
    case "SCRIPT_TOO_LONG_FOR_DURATION":
      return 400;

    case "PRODUCT_NOT_FOUND":
    case "VOICE_NOT_FOUND":
      return 404;

    case "GEMINI_QUOTA":
    case "TTS_QUOTA":
      return 429;

    case "REDIRECT_FAILED":
    case "API_UNAVAILABLE":
      return 502;

    case "GEMINI_TIMEOUT":
    case "TTS_TIMEOUT":
    case "RENDER_TIMEOUT":
    case "DELAY_RENDER_TIMEOUT":
      return 504;

    case "DISK_FULL":
      return 507;

    default:
      return 500;
  }
}

/**
 * Higher-Order Function that wraps Next.js App Router API route handlers.
 * Standardizes error responses, redacts sensitive info, and logs to data/error-log.json.
 * Preserves success responses for 100% backward compatibility.
 */
export function withErrorHandling(handler: ApiHandler): ApiHandler {
  return async (req: NextRequest, context?: any) => {
    try {
      const response = await handler(req, context);
      return response;
    } catch (rawError: any) {
      const explicitStatus = rawError?.status || rawError?.statusCode;
      const appErr = toAppError(rawError);

      // Log error safely to error-log.json
      await logError(appErr);

      const status = getHttpStatusForError(appErr, explicitStatus);

      // Return standardized error response while providing fallback fields for legacy clients
      return NextResponse.json(
        {
          ok: false,
          success: false, // backward compatibility with legacy clients checking .success
          error: {
            id: appErr.id,
            code: appErr.code,
            severity: appErr.severity,
            source: appErr.source,
            messageTh: appErr.messageTh,
            hintTh: appErr.hintTh,
            retryable: appErr.retryable ?? true,
            details: appErr.details,
          },
        },
        { status }
      );
    }
  };
}
