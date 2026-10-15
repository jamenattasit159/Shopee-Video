import React from "react";
import { interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { CaptionPage } from "../lib/captionTiming";
import { FONTS } from "../lib/palette";
import { THEME } from "../theme";
import { CaptionPosition, CaptionStyleId } from "../types";

interface TikTokCaptionsProps {
  pages: CaptionPage[];
  showEnglish: boolean;
  styleVariant?: CaptionStyleId;
  position?: CaptionPosition;
  highlightColor?: string;
  fontSize?: number;
}

/**
 * Multi-style Subtitle Engine for ShopeeProductVideo:
 * - tiktok-pop: Word-by-word pop & scale with active word highlight
 * - karaoke-pill: Rounded glass capsule where spoken words light up smoothly
 * - clean-bar: Clean full-sentence readable broadcast bar
 * - minimal-outline: Bold outlined text without background plate (ideal for full-screen video clips)
 */
export const TikTokCaptions: React.FC<TikTokCaptionsProps> = ({
  pages,
  showEnglish,
  styleVariant = "tiktok-pop",
  position = "bottom",
  highlightColor = "#FACC15",
  fontSize,
}) => {
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

  const posStyle: React.CSSProperties =
    position === "top"
      ? { top: 290 }
      : position === "center"
      ? { top: "52%", transform: `translateY(-50%) scale(${0.94 + pageIn * 0.06})` }
      : { bottom: c.safeBottom, transform: `translateY(${(1 - pageIn) * 24}px) scale(${0.94 + pageIn * 0.06})` };

  const resolvedFontSize = fontSize || c.fontSize;
  const isMinimalOutline = styleVariant === "minimal-outline";
  const isCleanBar = styleVariant === "clean-bar";
  const isKaraokePill = styleVariant === "karaoke-pill";

  const plateStyle: React.CSSProperties = isMinimalOutline
    ? {
        maxWidth: "100%",
        padding: "8px 16px",
        textAlign: "center",
      }
    : isKaraokePill
    ? {
        maxWidth: "100%",
        padding: "16px 36px 18px",
        borderRadius: 999,
        backgroundColor: "rgba(15, 23, 42, 0.88)",
        border: `3px solid ${highlightColor}`,
        boxShadow: "0 14px 36px rgba(2, 6, 23, 0.55)",
        textAlign: "center",
      }
    : isCleanBar
    ? {
        maxWidth: "100%",
        padding: "16px 32px",
        borderRadius: 20,
        backgroundColor: "rgba(255, 255, 255, 0.95)",
        border: "2px solid rgba(15, 23, 42, 0.12)",
        boxShadow: "0 14px 32px rgba(2, 6, 23, 0.35)",
        textAlign: "center",
      }
    : {
        maxWidth: "100%",
        padding: "18px 32px 20px",
        borderRadius: 24,
        backgroundColor: `rgba(15, 23, 42, ${c.backingOpacity})`,
        border: `2px solid ${colors.border}`,
        boxShadow: "0 12px 32px rgba(2, 6, 23, 0.55)",
        textAlign: "center",
      };

  return (
    <div
      style={{
        position: "absolute",
        left: c.safeLeft,
        right: c.safeRight,
        display: "flex",
        justifyContent: "center",
        zIndex: 80,
        pointerEvents: "none",
        opacity: pageOut,
        ...posStyle,
      }}
    >
      <div style={plateStyle}>
        <div
          style={{
            fontFamily: FONTS.caption,
            fontWeight: c.fontWeight,
            fontSize: resolvedFontSize,
            lineHeight: c.lineHeight,
            color: isCleanBar ? "#0F172A" : colors.text,
            WebkitTextStroke: isCleanBar
              ? "none"
              : isMinimalOutline
              ? `0.12em #020617`
              : `${c.strokeWidth}em ${colors.bg}`,
            paintOrder: "stroke fill",
          }}
        >
          {page.words.map((w, i) => {
            const shown = frame >= w.start;
            const active = shown && frame < w.end;
            const pop = spring({ frame: frame - w.start + 1, fps, config: { damping: 11, stiffness: 260, mass: 0.6 } });

            if (isCleanBar) {
              return (
                <span
                  key={i}
                  style={{
                    display: "inline-block",
                    whiteSpace: "normal",
                    overflowWrap: "anywhere",
                    color: active ? "#EE4D2D" : "#0F172A",
                    fontWeight: active ? 900 : 700,
                  }}
                >
                  {w.text}
                </span>
              );
            }

            const scale = shown ? (0.6 + pop * 0.4) * (active ? c.activeScale : 1) : 0.6;
            return (
              <span
                key={i}
                style={{
                  display: "inline-block",
                  whiteSpace: "normal",
                  overflowWrap: "anywhere",
                  opacity: isKaraokePill ? (shown ? 1 : 0.42) : shown ? Math.min(1, pop * 1.4) : 0,
                  transform: isKaraokePill
                    ? `scale(${active ? 1.08 : 1})`
                    : `translateY(${shown ? (1 - pop) * 18 : 18}px) scale(${scale})`,
                  color: active ? highlightColor : colors.text,
                  textShadow: active ? `0 0 24px ${highlightColor}88` : isMinimalOutline ? "0 6px 18px rgba(0,0,0,0.85)" : "none",
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
              color: isCleanBar ? "#475569" : colors.textMuted,
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
