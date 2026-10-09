import React from "react";
import { FONTS, PALETTE } from "../lib/palette";
import { useBoil, usePop } from "../lib/stopMotion";
import { useTextMotionStyle } from "../motion/presets";
import { TextMotionPreset } from "../motion/types";
import { fitHeadline } from "../lib/textFit";
import { renderKeep } from "../lib/thaiKeep";

interface TornStripProps {
  id: string;
  text?: string;
  lines?: string[];
  children?: React.ReactNode;
  bg?: string;
  textColor?: string;
  delay?: number;
  rotate?: number;
  fontSize?: number;
  padding?: string;
  motionPreset?: TextMotionPreset;
  style?: React.CSSProperties;
  className?: string;
}

export const TornStrip: React.FC<TornStripProps> = ({
  id,
  text,
  lines,
  children,
  bg = PALETTE.sunnyYellow,
  textColor = PALETTE.ink,
  delay = 0,
  rotate = -1.5,
  fontSize = 88, // V2 rule: Headline minimum 88px
  padding = "18px 40px",
  motionPreset = "kinetic-slide",
  style = {},
}) => {
  const boil = useBoil(id, 3, { rot: 0.8, pos: 1.5, scale: 0.01 });

  // Clamp text rotation within ±3° as per Rule A2
  const clampedRotate = Math.max(-3, Math.min(3, rotate + boil.rotate * 0.5));
  const motion = useTextMotionStyle(motionPreset, { delay, rotate: clampedRotate });

  // Determine lines: use text fitting if text or lines is provided, else render children
  let renderedContent: React.ReactNode = children;
  let effectiveFontSize = fontSize;
  let computedPlateWidth: number | undefined = undefined;

  const hasExplicitContent =
    (typeof text === "string" && text.trim().length > 0) ||
    (Array.isArray(lines) && lines.length > 0);

  if (hasExplicitContent) {
    const fitted = fitHeadline({ text, lines }, fontSize);
    effectiveFontSize = fitted.fontSize;
    computedPlateWidth = fitted.plateWidth;

    renderedContent = (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "6px",
          alignItems: "center",
        }}
      >
        {fitted.lines.map((line, idx) => (
          <div
            key={idx}
            style={{
              whiteSpace: "nowrap",
              wordBreak: "keep-all",
              overflowWrap: "normal",
            }}
          >
            {renderKeep(line)}
          </div>
        ))}
      </div>
    );
  }

  return (
    <div
      style={{
        position: "relative",
        display: "inline-block",
        maxWidth: computedPlateWidth ? `${computedPlateWidth}px` : "880px",
        transform: `translate(${boil.x}px, ${boil.y}px) ${motion.transform}`,
        opacity: motion.opacity,
        transformOrigin: "center center",
        zIndex: 20,
        ...style,
      }}
    >
      {/* 📜 LAYER 1: Background Paper Strip (WITH #torn filter) */}
      <div
        style={{
          position: "absolute",
          inset: "-6px -14px",
          background: bg,
          filter: "url(#torn)",
          boxShadow: "6px 10px 18px rgba(0, 0, 0, 0.28)",
          zIndex: 1,
        }}
      />

      {/* 🔤 LAYER 2: Text on top (ABSOLUTELY NO FILTER - 100% Crisp & Legible) */}
      <div
        style={{
          position: "relative",
          zIndex: 2,
          padding,
          fontFamily: FONTS.heading,
          fontWeight: 800,
          color: textColor,
          fontSize: effectiveFontSize,
          lineHeight: 1.35,
          letterSpacing: "0.02em", // Rule A2: 0.01em - 0.03em (No negative spacing)
          textAlign: "center",
          whiteSpace: "nowrap", // Strict rule Part E: white-space: nowrap, NO word-break!
          wordBreak: "keep-all",
          overflowWrap: "normal",
          WebkitTextStroke: "0.04em rgba(255, 255, 255, 0.4)",
          paintOrder: "stroke fill",
        }}
      >
        {renderedContent}
      </div>
    </div>
  );
};
