import React from "react";
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { FONTS } from "../lib/palette";
import { renderKeep } from "../lib/thaiKeep";
import { PaperBackground } from "../paper/PaperBackground";
import { PackId, PaperTheme } from "../types";
import { THEME } from "../theme";

const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;

const COLLAGE_PACKS: PackId[] = [
  "kraft-scrapbook",
  "notebook-doodle",
  "zine-newspaper",
  "sticker-bomb",
  "pinboard-corkboard",
  "comic-popart",
  "supermarket-flyer",
  "soft-kawaii",
];

export function isCollagePackId(packId?: PackId): boolean {
  return !!packId && COLLAGE_PACKS.includes(packId);
}

/** Overrides the paper sticker outline on product cutouts with a soft card when in Pro Studio packs. */
export const PRODUCT_CARD_STYLE: React.CSSProperties = {
  filter: "drop-shadow(0 28px 48px rgba(2, 6, 23, 0.55))",
  borderRadius: 32,
  overflow: "hidden",
};

/**
 * Dynamic SceneBackground that renders the chosen Style Pack (12 distinct packs:
 * 4 Pro Commercial Studio packs + 8 Paper Collage packs) instead of a static background.
 */
export const SceneBackground: React.FC<{
  glowY?: string;
  packId?: PackId;
  bgColor?: string;
  paperTheme?: PaperTheme;
  accentColor?: string;
}> = ({
  glowY = "55%",
  packId = "pro-minimal-luxury",
  bgColor,
  paperTheme = "kraft",
  accentColor = THEME.colors.accent,
}) => {
  const frame = useCurrentFrame();
  const drift = Math.sin(frame / 40) * 3;
  const showTornBorders = isCollagePackId(packId);

  return (
    <AbsoluteFill>
      <PaperBackground
        packId={packId}
        theme={paperTheme}
        bg={bgColor}
        overlayOpacity={showTornBorders ? 0.12 : 0.05}
        showTornBorders={showTornBorders}
      />
      {/* Subtle dynamic accent aura behind product */}
      <AbsoluteFill
        style={{
          background: `radial-gradient(circle at 50% calc(${glowY} + ${drift}%), ${accentColor}26 0%, transparent 58%)`,
          pointerEvents: "none",
        }}
      />
    </AbsoluteFill>
  );
};

/** Scene-level enter (spring slide + fade) and exit (fade + slight zoom-out). */
export const SceneShell: React.FC<{ children: React.ReactNode; punch?: boolean }> = ({ children, punch }) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  const { sceneEnterFrames, sceneExitFrames, hookPunchScale } = THEME.motion;

  const enter = spring({ frame, fps, durationInFrames: sceneEnterFrames, config: { damping: 18, stiffness: 200 } });
  const exit = interpolate(frame, [durationInFrames - sceneExitFrames, durationInFrames], [0, 1], clamp);
  const punchScale = punch
    ? interpolate(spring({ frame, fps, config: { damping: 12, stiffness: 160 } }), [0, 1], [hookPunchScale, 1])
    : 1;

  return (
    <AbsoluteFill
      style={{
        opacity: Math.min(enter * 1.5, 1) * (1 - exit * 0.6),
        transform: `translateY(${(1 - enter) * 40}px) scale(${punchScale * (1 - exit * 0.04)})`,
      }}
    >
      {children}
    </AbsoluteFill>
  );
};

/** Slow continuous zoom (Ken Burns) over the whole scene duration. */
export const SlowZoom: React.FC<{ children: React.ReactNode; direction?: 1 | -1 }> = ({ children, direction = 1 }) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const p = interpolate(frame, [0, durationInFrames], [0, 1], clamp);
  const zoom = direction === 1 ? 1 + p * THEME.motion.kenBurnsZoom : 1 + (1 - p) * THEME.motion.kenBurnsZoom;
  return (
    <AbsoluteFill style={{ transform: `scale(${zoom}) translateY(${-p * 12}px)`, transformOrigin: "50% 55%" }}>
      {children}
    </AbsoluteFill>
  );
};

/**
 * Dynamic selection frame that drags open around a focus area, adapting to the active pack's accentColor.
 */
export const HighlightFrame: React.FC<{
  x: number;
  y: number;
  width: number;
  height: number;
  delay?: number;
  label?: string;
  accentColor?: string;
}> = ({ x, y, width, height, delay = 10, label, accentColor = THEME.colors.accent }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const drag = spring({ frame: frame - delay, fps, config: { damping: 20, stiffness: 120 } });
  if (frame < delay) return null;
  const pulse = 1 + Math.sin((frame - delay) / 8) * 0.012;
  const corner = 44;
  const cornerStyle = (pos: React.CSSProperties): React.CSSProperties => ({
    position: "absolute",
    width: corner,
    height: corner,
    borderColor: accentColor,
    borderStyle: "solid",
    borderWidth: 0,
    ...pos,
  });

  return (
    <div
      style={{
        position: "absolute",
        left: x,
        top: y,
        width: width * drag,
        height: height * drag,
        border: `3px solid ${accentColor}`,
        borderRadius: 28,
        boxShadow: `0 0 36px ${accentColor}44`,
        transform: `scale(${pulse})`,
        zIndex: 18,
        pointerEvents: "none",
      }}
    >
      <div style={cornerStyle({ top: -8, left: -8, borderTopWidth: 8, borderLeftWidth: 8, borderTopLeftRadius: 28 })} />
      <div style={cornerStyle({ top: -8, right: -8, borderTopWidth: 8, borderRightWidth: 8, borderTopRightRadius: 28 })} />
      <div style={cornerStyle({ bottom: -8, left: -8, borderBottomWidth: 8, borderLeftWidth: 8, borderBottomLeftRadius: 28 })} />
      <div style={cornerStyle({ bottom: -8, right: -8, borderBottomWidth: 8, borderRightWidth: 8, borderBottomRightRadius: 28 })} />
      {label && drag > 0.9 && (
        <div
          style={{
            position: "absolute",
            top: -64,
            left: 0,
            backgroundColor: accentColor,
            color: "#FFFFFF",
            fontFamily: FONTS.heading,
            fontWeight: 700,
            fontSize: 34,
            padding: "6px 20px",
            borderRadius: 14,
            whiteSpace: "nowrap",
            boxShadow: "0 8px 20px rgba(0,0,0,0.3)",
          }}
        >
          {label}
        </div>
      )}
    </div>
  );
};

/** Lines slide up and fade in one after another. */
export const LineReveal: React.FC<{
  lines: string[];
  delay?: number;
  stagger?: number;
  fontSize?: number;
  accentColor?: string;
  style?: React.CSSProperties;
}> = ({ lines, delay = 6, stagger = 6, fontSize = 50, accentColor = THEME.colors.border, style }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return (
    <div
      style={{
        display: "inline-flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 4,
        padding: "16px 32px",
        borderRadius: 24,
        backgroundColor: "rgba(15, 23, 42, 0.9)",
        border: `2px solid ${accentColor}`,
        boxShadow: "0 14px 32px rgba(2, 6, 23, 0.45)",
        fontFamily: FONTS.heading,
        fontWeight: 700,
        fontSize,
        lineHeight: 1.35,
        color: "#F8FAFC",
        zIndex: 22,
        position: "relative",
        ...style,
      }}
    >
      {lines.map((line, i) => {
        const p = spring({ frame: frame - delay - i * stagger, fps, config: { damping: 18, stiffness: 180 } });
        return (
          <div
            key={i}
            style={{
              whiteSpace: "nowrap",
              opacity: p,
              transform: `translateY(${(1 - p) * 28}px)`,
              clipPath: `inset(0 ${(1 - p) * 100}% 0 0)`,
            }}
          >
            {renderKeep(line)}
          </div>
        );
      })}
    </div>
  );
};
