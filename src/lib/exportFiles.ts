import path from 'node:path';

export function exportDirectory(date: string | null, slug: string | null): string | null {
  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date) || !slug || !/^[a-z0-9ก-๙-]{1,100}$/i.test(slug)) return null;
  return path.resolve(process.cwd(), 'exports', date, slug);
}

export const exportMimeTypes: Record<string, string> = {
  'video.mp4': 'video/mp4', 'cover.jpg': 'image/jpeg', 'captions.srt': 'application/x-subrip; charset=utf-8',
  'caption.txt': 'text/plain; charset=utf-8', 'meta.json': 'application/json; charset=utf-8', 'bundle.zip': 'application/zip',
};
