export interface MascotAnimation { frames: Array<{ url: string; durationMs: number }>; }

export function mascotFrameUrl(fallback: string, animation: MascotAnimation | undefined, seconds: number) {
  const frames = animation?.frames;
  if (!frames?.length) return fallback;
  const total = frames.reduce((sum, frame) => sum + frame.durationMs, 0);
  if (!(total > 0)) return fallback;
  let time = Math.max(0, seconds * 1000) % total;
  for (const frame of frames) {
    if (time < frame.durationMs) return frame.url;
    time -= frame.durationMs;
  }
  return frames[0].url;
}
