import React from "react";
import { interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { CaptionPage } from "../lib/captionTiming";
import { FONTS } from "../lib/palette";
import { THEME } from "../theme";

interface TikTokCaptionsProps {
  pages: CaptionPage[];
  showEnglish: boolean;
}

/**
 * Word-by-word pop captions. The word being spoken pops and turns indigo;
 * upcoming words keep their layout slot (invisible) so lines never reflow.
 */
export const TikTokCaptions: React.FC<TikTokCaptionsProps> = ({ pages, showEnglish }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const { colors, captions: c } = THEME;

  const page = pages.find((p) => frame >= p.start && frame < p.end);
  if (!page) return null;

  const pageIn = spring({ frame: frame - page.start + 1, fps, config: { damping: 16, stiffness: 240 } });
  const pageOut =
    page.end === page.segmentEnd
      ? interpolate(frame, [page.end - 5, page.end], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })
      : 1;
  const enIn = interpolate(frame, [page.segmentStart, page.segmentStart + 8], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <div
      style={{
        position: "absolute",
        left: c.safeLeft,
        right: c.safeRight,
        bottom: c.safeBottom,
        display: "flex",
        justifyContent: "center",
        zIndex: 80,
        pointerEvents: "none",
        opacity: pageOut,
        transform: `translateY(${(1 - pageIn) * 24}px) scale(${0.94 + pageIn * 0.06})`,
      }}
    >
      <div
        style={{
          maxWidth: "100%",
          padding: "18px 32px 20px",
          borderRadius: 24,
          backgroundColor: `rgba(15, 23, 42, ${c.backingOpacity})`, // slate-900
          border: `2px solid ${colors.border}`,
          boxShadow: "0 12px 32px rgba(2, 6, 23, 0.55)",
          textAlign: "center",
        }}
      >
        <div
          style={{
            fontFamily: FONTS.caption,
            fontWeight: c.fontWeight,
            fontSize: c.fontSize,
            lineHeight: c.lineHeight,
            color: colors.text,
            WebkitTextStroke: `${c.strokeWidth}em ${colors.bg}`,
            paintOrder: "stroke fill",
          }}
        >
          {page.words.map((w, i) => {
            const shown = frame >= w.start;
            const active = shown && frame < w.end;
            // +1 so a word is already partly visible on its first frame (no empty plate)
            const pop = spring({ frame: frame - w.start + 1, fps, config: { damping: 11, stiffness: 260, mass: 0.6 } });
            const scale = shown ? (0.6 + pop * 0.4) * (active ? c.activeScale : 1) : 0.6;
            return (
              <span
                key={i}
                style={{
                  display: "inline-block",
                  whiteSpace: "pre",
                  opacity: shown ? Math.min(1, pop * 1.4) : 0,
                  transform: `translateY(${shown ? (1 - pop) * 18 : 18}px) scale(${scale})`,
                  color: active ? colors.accentSoft : colors.text,
                  textShadow: active ? `0 0 24px ${colors.accent}` : "none",
                }}
              >
                {w.text}
              </span>
            );
          })}
        </div>

        {showEnglish && page.en && (
          <div
            style={{
              marginTop: 8,
              fontFamily: FONTS.caption,
              fontWeight: 700,
              fontSize: c.englishFontSize,
              lineHeight: 1.3,
              color: colors.textMuted,
              opacity: enIn,
            }}
          >
            {page.en}
          </div>
        )}
      </div>
    </div>
  );
};
