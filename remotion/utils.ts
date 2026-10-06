import { staticFile } from "remotion";

/**
 * Safely resolves an image path for Remotion whether it is:
 * - A full external URL (http:// or https://)
 * - An inline data URI (data:image/...)
 * - A local public path (/uploads/xxx.jpg or /samples/xxx.svg)
 */
export function resolveMediaSrc(src: string): string {
  if (!src) return "";

  if (
    src.startsWith("http://") ||
    src.startsWith("https://") ||
    src.startsWith("data:")
  ) {
    return src;
  }

  // Remove leading slash for staticFile
  const relativePath = src.startsWith("/") ? src.slice(1) : src;

  try {
    return staticFile(relativePath);
  } catch {
    return src;
  }
}
