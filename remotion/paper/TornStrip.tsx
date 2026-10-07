import React from "react";
import { FONTS, PALETTE } from "../lib/palette";
import { useBoil, usePop } from "../lib/stopMotion";
import { fitHeadline } from "../lib/textFit";

interface TornStripProps {
  id: string;
  text?: string;
  children?: React.ReactNode;
  bg?: string;
  textColor?: string;
  delay?: number;
  rotate?: number;
  fontSize?: number;
  padding?: string;
  style?: React.CSSProperties;
  className?: string;
}

export const TornStrip: React.FC<TornStripProps> = ({
  id,
  text,
  children,
  bg = PALETTE.sunnyYellow,
  textColor = PALETTE.ink,
  delay = 0,
  rotate = -1.5,
  fontSize = 88, // V2 rule: Headline minimum 88px
  padding = "18px 40px",
  style = {},
}) => {
  const pop = usePop(delay);
  const boil = useBoil(id, 3, { rot: 0.8, pos: 1.5, scale: 0.01 });

  // Clamp text rotation within ±3° as per Rule A2
  const clampedRotate = Math.max(-3, Math.min(3, rotate + boil.rotate * 0.5));

  // Determine lines: use text fitting if text string is provided, else render children
  let renderedContent: React.ReactNode = children;
  let effectiveFontSize = fontSize;

  if (typeof text === "string" && text.trim().length > 0) {
    const fitted = fitHeadline(text, fontSize);
    effectiveFontSize = fitted.fontSize;
    renderedContent = (
      <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
        {fitted.lines.map((line, idx) => (
          <div key={idx}>{line}</div>
        ))}
      </div>
    );
  }

  return (
    <div
      style={{
        position: "relative",
        display: "inline-block",
        transform: `translate(${boil.x}px, ${boil.y}px) rotate(${clampedRotate}deg) scale(${pop * boil.scale})`,
        transformOrigin: "center center",
        zIndex: 20,
        ...style,
      }}
    >
      {/* 📜 LAYER 1: Background Paper Strip (WITH #torn filter) */}
      <div
        style={{
          position: "absolute",
          inset: "-6px -12px",
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
          whiteSpace: "pre-wrap",
          wordBreak: "break-word",
          WebkitTextStroke: "0.04em rgba(255, 255, 255, 0.4)",
          paintOrder: "stroke fill",
        }}
      >
        {renderedContent}
      </div>
    </div>
  );
};
