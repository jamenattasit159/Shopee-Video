import React from "react";
import { fitText } from "@remotion/layout-utils";
import { FONTS, PALETTE } from "../lib/palette";
import { boil, popSpring, POP_TIMING, progress } from "../lib/popMotion";

const INK = PALETTE.ink;
/** Rough-edged marker stroke, stretched behind each headline line. */
const BRUSH = "M8 22 L60 9 L180 16 L320 5 L470 14 L620 3 L780 12 L930 5 L994 17 L986 40 L998 63 L985 89 L860 95 L700 86 L540 97 L380 88 L220 96 L90 90 L12 97 L3 70 L15 47 Z";

const Burst: React.FC<{ frame: number; fps: number; side: "left" | "right" }> = ({ frame, fps, side }) => {
  const s = popSpring(frame, fps, POP_TIMING.burst);
  return (
    <svg
      viewBox="0 0 120 120"
      aria-hidden
      style={{
        position: "absolute",
        top: -54,
        [side]: -78,
        width: 110,
        height: 110,
        overflow: "visible",
        transform: `scaleX(${side === "right" ? -1 : 1}) scale(${s}) rotate(${boil(frame, side === "left" ? 1 : 2, 3)}deg)`,
        transformOrigin: "100% 100%",
      }}
    >
      {[[98, 74, 34, 46], [104, 52, 78, 8], [92, 96, 24, 100]].map(([x1, y1, x2, y2], i) => (
        <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke={INK} strokeWidth={10} strokeLinecap="round" />
      ))}
    </svg>
  );
};

/** Illustrated headline: an ink brush wipes in, then each line pops with overshoot. */
export const PopHeadline: React.FC<{
  lines: string[];
  highlightWord?: string;
  accent: string;
  frame: number;
  fps: number;
  width: number;
  maxHeight: number;
}> = ({ lines, highlightWord, accent, frame, fps, width, maxHeight }) => {
  const word = highlightWord?.trim();
  const found = word ? lines.findIndex((l) => l.includes(word)) : -1;
  const bigIdx = lines.length < 2 ? 0 : found >= 0 ? found : lines.length - 1;
  const fit = (text: string, max: number) =>
    Math.min(max, fitText({ text, fontFamily: FONTS.heading, fontWeight: 800, withinWidth: width * 0.78 }).fontSize);
  const big = fit(lines[bigIdx] || "", 112);
  const raw = lines.map((l, i) => (i === bigIdx ? big : Math.min(fit(l, 72), big * 0.72)));
  const scale = Math.min(1, maxHeight / raw.reduce((n, s) => n + s * 1.4, 0));
  const sizes = raw.map((s) => s * scale);

  return (
    <div style={{ position: "relative", display: "inline-flex", flexDirection: "column", alignItems: "center" }}>
      <Burst frame={frame} fps={fps} side="left" />
      <Burst frame={frame} fps={fps} side="right" />
      {lines.map((line, i) => {
        const size = sizes[i];
        const isBig = i === bigIdx;
        const start = POP_TIMING.brushStart + i * POP_TIMING.lineStagger;
        const wipe = progress(frame, start, POP_TIMING.brushFrames);
        const pop = popSpring(frame, fps, start + POP_TIMING.textLag);
        const tilt = (i % 2 ? 1.5 : -3) + (isBig ? boil(frame, i) : 0);
        return (
          <div key={i} style={{ position: "relative", padding: `${size * 0.1}px ${size * 0.42}px`, marginTop: i ? -size * 0.06 : 0, transform: `rotate(${tilt}deg)` }}>
            <svg
              viewBox="0 0 1000 100"
              preserveAspectRatio="none"
              aria-hidden
              style={{ position: "absolute", inset: 0, width: "100%", height: "100%", clipPath: `inset(0 ${(1 - wipe) * 100}% 0 0)` }}
            >
              <path d={BRUSH} fill={INK} />
            </svg>
            <div
              style={{
                position: "relative",
                fontSize: size,
                lineHeight: 1.15,
                fontWeight: 800,
                color: "white",
                WebkitTextStroke: `${size * (isBig ? 0.09 : 0.07)}px ${accent}`,
                paintOrder: "stroke fill",
                whiteSpace: "nowrap",
                transform: `scale(${pop})`,
                opacity: Math.min(1, pop * 3),
              }}
            >
              {line}
            </div>
          </div>
        );
      })}
    </div>
  );
};
