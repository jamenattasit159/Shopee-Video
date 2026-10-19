import { interpolate, spring } from "remotion";

/** Shared timing for the illustrated pop-up text (30fps frame numbers, relative to scene start). */
export const POP_TIMING = {
  frameGrow: 0,
  brushStart: 4,
  brushFrames: 8,
  lineStagger: 6,
  textLag: 2,
  burst: 14,
  burstFrames: 12,
  chipStart: 20,
  chipStagger: 6,
  checkLag: 5,
  checkFrames: 7,
  boilAfter: 30,
} as const;

/** Overshooting pop: 0 → ~1.12 → 1. */
export const popSpring = (frame: number, fps: number, delay: number) =>
  spring({ frame: frame - delay, fps, config: { damping: 9, stiffness: 220, mass: 0.6 } });

/** Softer settle used for sliding pieces. */
export const slideSpring = (frame: number, fps: number, delay: number) =>
  spring({ frame: frame - delay, fps, config: { damping: 11, stiffness: 180, mass: 0.7 } });

/** Linear 0→1 progress clamped to a window. */
export const progress = (frame: number, start: number, length: number) =>
  interpolate(frame, [start, start + length], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

/** Stop-motion wobble in degrees, stepping every 4 frames so it reads as hand-drawn. */
export const boil = (frame: number, seed: number, amount = 0.8) =>
  frame < POP_TIMING.boilAfter ? 0 : Math.sin(Math.floor(frame / 4) * 1.7 + seed) * amount;
