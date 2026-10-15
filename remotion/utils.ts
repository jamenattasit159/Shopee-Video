import { staticFile } from "remotion";

/**
 * Checks whether a media URL or filename is a video clip (.mp4, .mov, .webm, .m4v)
 */
export function isVideoMedia(src?: string): boolean {
  if (!src) return false;
  const clean = src.split("?")[0].split("#")[0].toLowerCase();
  return (
    clean.endsWith(".mp4") ||
    clean.endsWith(".mov") ||
    clean.endsWith(".webm") ||
    clean.endsWith(".m4v") ||
    src.startsWith("data:video/")
  );
}

/**
 * Safely resolves an image or video path for Remotion whether it is:
 * - A full external URL (http:// or https://)
 * - An inline data/blob URI (data:... or blob:...)
 * - A local public path (/uploads/xxx.jpg, /uploads/xxx.mp4, /samples/xxx.svg)
 */
export function resolveMediaSrc(src: string): string {
  if (!src) return "";

  if (
    src.startsWith("http://") ||
    src.startsWith("https://") ||
    src.startsWith("data:") ||
    src.startsWith("blob:")
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
