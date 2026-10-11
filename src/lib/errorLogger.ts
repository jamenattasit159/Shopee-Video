import fs from "fs/promises";
import path from "path";
import { AppError, redact } from "./errors";

const MAX_LOG_ENTRIES = 500;
const ERROR_LOG_PATH = path.join(process.cwd(), "data", "error-log.json");

// Mutex queue to serialize writes to error-log.json safely
let writeQueue: Promise<void> = Promise.resolve();

/**
 * Logs an AppError to data/error-log.json (max 500 items) and console.error (redacted)
 */
export async function logError(err: AppError): Promise<void> {
  const redactedError = redact(err) as AppError;

  // Print redacted message to server console
  console.error(
    `[AppError] [${redactedError.code}] [${redactedError.severity.toUpperCase()}] ${redactedError.messageTh}`
  );
  if (redactedError.details) {
    console.error(`[AppError Details]`, JSON.stringify(redactedError.details));
  }

  // Queue write to avoid race condition
  writeQueue = writeQueue
    .then(async () => {
      try {
        await fs.mkdir(path.dirname(ERROR_LOG_PATH), { recursive: true });

        let entries: AppError[] = [];
        try {
          const raw = await fs.readFile(ERROR_LOG_PATH, "utf-8");
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed)) {
            entries = parsed;
          }
        } catch {
          // File might not exist yet or be empty
          entries = [];
        }

        // Prepend new error and trim to MAX_LOG_ENTRIES
        entries.unshift(redactedError);
        if (entries.length > MAX_LOG_ENTRIES) {
          entries = entries.slice(0, MAX_LOG_ENTRIES);
        }

        await fs.writeFile(
          ERROR_LOG_PATH,
          JSON.stringify(entries, null, 2),
          "utf-8"
        );
      } catch (logErr) {
        // Fallback console log if file write fails, never crash the caller
        console.error("[ErrorLogger] Failed to write error log to disk:", logErr);
      }
    })
    .catch((queueErr) => {
      console.error("[ErrorLogger] Write queue failure:", queueErr);
    });

  await writeQueue;
}

/**
 * Reads recent error logs from disk
 */
export async function getRecentErrorLogs(limit = 100): Promise<AppError[]> {
  try {
    const raw = await fs.readFile(ERROR_LOG_PATH, "utf-8");
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed.slice(0, limit);
    }
    return [];
  } catch {
    return [];
  }
}
