/**
 * List of noisy non-actionable errors (e.g. browser extensions, devtools, favicon)
 * that should be ignored for user-facing toasts and alerts.
 */
export const IGNORED_ERROR_PATTERNS = [
  // Chrome / Browser Extension messaging noise
  "A listener indicated an asynchronous response",
  "chrome-extension://",
  "moz-extension://",
  "safari-extension://",
  "The message port closed before a response was received",

  // Favicon 404
  "favicon.ico",

  // React DevTools / Fast Refresh / Hydration mismatch from extensions
  "React DevTools",
  "Extra attributes from the server",
  "Fast Refresh",
  "hydrated",

  // ResizeObserver benign loop limit
  "ResizeObserver loop completed with undelivered notifications",
  "ResizeObserver loop limit exceeded",
];

/**
 * Returns true if an error message, stack, or source is identified as ignorable noise
 */
export function isIgnorableError(err: unknown): boolean {
  if (!err) return false;

  const text =
    typeof err === "string"
      ? err
      : err instanceof Error
      ? `${err.message} ${err.stack || ""}`
      : typeof err === "object"
      ? JSON.stringify(err)
      : String(err);

  const lower = text.toLowerCase();

  return IGNORED_ERROR_PATTERNS.some((pattern) =>
    lower.includes(pattern.toLowerCase())
  );
}
