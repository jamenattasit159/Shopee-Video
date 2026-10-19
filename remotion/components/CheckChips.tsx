import React from "react";
import { Audio, Sequence } from "remotion";
import { fitText } from "@remotion/layout-utils";
import { FONTS, PALETTE } from "../lib/palette";
import { boil, POP_TIMING, progress, slideSpring } from "../lib/popMotion";
import { THEME } from "../theme";
import { resolveMediaSrc } from "../utils";

const INK = PALETTE.ink;

/** Checklist chips that slide in from the right one by one, each ticking its check mark. */
export const CheckChips: React.FC<{
  items: string[];
  accent: string;
  frame: number;
  fps: number;
  showCheck?: boolean;
  sfx?: boolean;
}> = ({ items, accent, frame, fps, showCheck = true, sfx = true }) => (
  <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 22 }}>
    {items.map((text, i) => {
      const start = POP_TIMING.chipStart + i * POP_TIMING.chipStagger;
      const s = slideSpring(frame, fps, start);
      const tick = progress(frame, start + POP_TIMING.checkLag, POP_TIMING.checkFrames);
      const size = Math.max(28, Math.min(44, fitText({ text, fontFamily: FONTS.heading, fontWeight: 800, withinWidth: 380 }).fontSize));
      return (
        <div
          key={i}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 14,
            background: INK,
            color: "white",
            borderRadius: 16,
            padding: showCheck ? "10px 30px 10px 12px" : "12px 30px",
            boxShadow: `6px 7px 0 ${accent}`,
            fontSize: size,
            fontWeight: 800,
            lineHeight: 1.3,
            whiteSpace: "nowrap",
            transform: `translateX(${(1 - s) * 200}px) skewX(-6deg) scale(${0.7 + 0.3 * s}) rotate(${boil(frame, i + 3, 0.6)}deg)`,
            opacity: Math.min(1, s * 2),
          }}
        >
          {showCheck && (
            <svg width={size * 1.3} height={size * 1.3} viewBox="0 0 24 24" fill="none" aria-hidden>
              <circle cx={12} cy={12} r={10.5} fill="white" stroke={accent} strokeWidth={2.5} />
              <path d="M17 8.5 10.5 15 7 11.5" stroke={accent} strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" pathLength={1} strokeDasharray={1} strokeDashoffset={1 - tick} />
            </svg>
          )}
          <span>{text}</span>
          {sfx && (
            <Sequence from={start} durationInFrames={12} layout="none">
              <Audio src={resolveMediaSrc(THEME.audio.hookSfx)} volume={THEME.audio.sfxVolume * 0.55} />
            </Sequence>
          )}
        </div>
      );
    })}
  </div>
);
