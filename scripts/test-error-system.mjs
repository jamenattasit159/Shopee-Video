import assert from "node:assert";
import { redact, toAppError, generateErrorId } from "../src/lib/errors.js";
import { ERROR_CATALOG } from "../src/lib/errorCatalog.js";
import { isIgnorableError } from "../src/lib/errorIgnore.js";

console.log("=== RUNNING AUTOMATED ERROR ALERT SYSTEM TEST SUITE ===");

// 1. Test Redact
console.log("\n[Test 1] Redaction of secrets and paths:");
const sensitiveKey = "AIzaSyD" + "01234567890123456789012345678901234";
const sensitiveUrl = "https://shopee.co.th/product-i.123.456?aff_id=secret99&token=abc123xyz";
const sensitivePathWin = "C:\\Users\\JohnDoe\\AppData\\Local\\secret.json";
const sensitivePathUnix = "/home/johndoe/projects/secret.json";

const redactedKey = redact(sensitiveKey);
assert.strictEqual(redactedKey.includes("AIza***[REDACTED]"), true, "API key should be redacted");
assert.strictEqual(redactedKey.includes("0123456789"), false, "Plain key must not leak");
console.log("  ✓ API Key redacted:", redactedKey);

const redactedUrl = redact(sensitiveUrl);
assert.strictEqual(redactedUrl.includes("?[QUERY_REDACTED]"), true, "Query params must be redacted");
assert.strictEqual(redactedUrl.includes("secret99"), false, "Query params must not leak");
console.log("  ✓ Affiliate URL query redacted:", redactedUrl);

const redactedPathWin = redact(sensitivePathWin);
assert.strictEqual(redactedPathWin.includes("C:\\Users\\***"), true, "Windows username must be redacted");
assert.strictEqual(redactedPathWin.includes("JohnDoe"), false, "Username must not leak");
console.log("  ✓ Windows Path redacted:", redactedPathWin);

const redactedPathUnix = redact(sensitivePathUnix);
assert.strictEqual(redactedPathUnix.includes("/home/***"), true, "Unix username must be redacted");
assert.strictEqual(redactedPathUnix.includes("johndoe"), false, "Username must not leak");
console.log("  ✓ Unix Path redacted:", redactedPathUnix);

// 2. Test toAppError & Catalog Mapping
console.log("\n[Test 2] toAppError and Error Catalog Mapping:");
const sampleErr = new Error("Sample test failure");
const appErr = toAppError(sampleErr, "IMAGE_DECODE_FAILED", { file: "test.png" });
assert.strictEqual(appErr.code, "IMAGE_DECODE_FAILED");
assert.strictEqual(appErr.severity, "error");
assert.strictEqual(appErr.messageTh, ERROR_CATALOG.IMAGE_DECODE_FAILED.messageTh);
assert.strictEqual(appErr.hintTh, ERROR_CATALOG.IMAGE_DECODE_FAILED.hintTh);
assert.strictEqual(appErr.context?.file, "test.png");
console.log("  ✓ toAppError mapped correctly with catalog:", appErr.code, "->", appErr.messageTh);

// Unknown fallback
const unknownErr = toAppError("Something strange happened");
assert.strictEqual(unknownErr.code, "UNKNOWN");
assert.strictEqual(unknownErr.source, ERROR_CATALOG.UNKNOWN.source);
console.log("  ✓ Unknown error mapped to UNKNOWN catalog entry");

// 3. Test Ignore List
console.log("\n[Test 3] Error Ignore Filter (Noise rejection):");
assert.strictEqual(
  isIgnorableError("A listener indicated an asynchronous response by returning true"),
  true,
  "Extension message must be ignored"
);
assert.strictEqual(
  isIgnorableError("chrome-extension://abcdef/content.js"),
  true,
  "Extension script origin must be ignored"
);
assert.strictEqual(
  isIgnorableError("/favicon.ico"),
  true,
  "favicon 404 must be ignored"
);
assert.strictEqual(
  isIgnorableError("Extra attributes from the server"),
  true,
  "Hydration extension warning must be ignored"
);
assert.strictEqual(
  isIgnorableError("Actual system rendering failure"),
  false,
  "Real system errors must NOT be ignored"
);
console.log("  ✓ Noise filters passed: extension errors, favicon, and hydration noise filtered correctly");

// 4. Test API withErrorHandling behavior against live server
console.log("\n[Test 4] Live API Error Handling Middleware:");
async function runLiveApiTests() {
  // Test invalid import link (triggers error with standardized format)
  const res1 = await fetch("http://localhost:3000/api/import-link", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ input: "https://invalid-non-shopee-domain.com/item" }),
  });
  const data1 = await res1.json();
  assert.strictEqual(res1.status >= 400, true, "Should return 4xx status");
  assert.strictEqual(data1.ok, false, "Should return ok: false");
  assert.strictEqual(typeof data1.error, "object", "Should contain standardized error object");
  assert.strictEqual(typeof data1.error.id, "string", "Error must have unique id");
  assert.strictEqual(typeof data1.error.code, "string", "Error must have error code");
  assert.strictEqual(typeof data1.error.messageTh, "string", "Error must have Thai message");
  assert.strictEqual(typeof data1.error.hintTh, "string", "Error must have Thai hint");
  console.log("  ✓ /api/import-link returned standardized error structure:", data1.error.code, "-", data1.error.messageTh);

  // Test health check route
  const res2 = await fetch("http://localhost:3000/api/health");
  const data2 = await res2.json();
  assert.strictEqual(res2.status, 200, "Health check must return 200");
  assert.strictEqual(["healthy", "warning", "unhealthy"].includes(data2.status), true);
  assert.strictEqual(typeof data2.checks.storage.diskFreeGB, "number");
  console.log("  ✓ /api/health returned diagnostics: status =", data2.status, ", free disk =", data2.checks.storage.diskFreeGB, "GB");
}

await runLiveApiTests();

console.log("\n🎉 ALL AUTOMATED ERROR ALERT SYSTEM TESTS PASSED SUCCESSFULLY!\n");
