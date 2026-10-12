import React from "react";
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { FONTS } from "../lib/palette";
import { renderKeep } from "../lib/thaiKeep";
import { THEME } from "../theme";

const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;

/** Overrides the paper sticker outline on product cutouts with a soft dark-UI card. */
export const PRODUCT_CARD_STYLE: React.CSSProperties = {
  filter: "drop-shadow(0 28px 48px rgba(2, 6, 23, 0.65))",
  borderRadius: 32,
  overflow: "hidden",
};

/** Solid Slate background with a soft indigo glow behind the product area. */
export const SceneBackground: React.FC<{ glowY?: string }> = ({ glowY = "55%" }) => {
  const frame = useCurrentFrame();
  const drift = Math.sin(frame / 40) * 3;
  return (
    <AbsoluteFill style={{ backgroundColor: THEME.colors.bg }}>
      <AbsoluteFill
        style={{
          background: `radial-gradient(circle at 50% calc(${glowY} + ${drift}%), ${THEME.colors.glow} 0%, transparent 55%)`,
        }}
      />
      {/* Fine dot grid for depth without noise */}
      <AbsoluteFill
        style={{
          opacity: 0.35,
          backgroundImage: `radial-gradient(${THEME.colors.surfaceRaised} 1.5px, transparent 1.5px)`,
          backgroundSize: "36px 36px",
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
  // Hook: start zoomed-in and snap back for an instant attention grab
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
 * Indigo selection frame that "drags" open around a focus area, like a capture box,
 * then gently pulses. Coordinates are canvas px.
 */
export const HighlightFrame: React.FC<{
  x: number;
  y: number;
  width: number;
  height: number;
  delay?: number;
  label?: string;
}> = ({ x, y, width, height, delay = 10, label }) => {
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
    borderColor: THEME.colors.accentSoft,
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
        border: `3px solid ${THEME.colors.accent}`,
        borderRadius: 28,
        boxShadow: `0 0 40px ${THEME.colors.glow}`,
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
            backgroundColor: THEME.colors.accent,
            color: THEME.colors.text,
            fontFamily: FONTS.heading,
            fontWeight: 700,
            fontSize: 34,
            padding: "6px 20px",
            borderRadius: 14,
            whiteSpace: "nowrap",
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
  style?: React.CSSProperties;
}> = ({ lines, delay = 6, stagger = 6, fontSize = 52, style }) => {
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
        backgroundColor: THEME.colors.surface,
        border: `2px solid ${THEME.colors.border}`,
        fontFamily: FONTS.heading,
        fontWeight: 700,
        fontSize,
        lineHeight: 1.35,
        color: THEME.colors.textMuted,
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
