import React from "react";
import { FONTS, PALETTE } from "../lib/palette";
import { useBoil, usePop } from "../lib/stopMotion";
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
  style?: React.CSSProperties;
  className?: string;
}

/**
 * GPU-friendly jagged torn paper polygon clip-path (replaces CPU-heavy SVG feTurbulence url(#torn)
 * that caused Headless Chromium to freeze machines at 1080x1920).
 */
const TORN_CLIP_POLYGON =
  "polygon(0% 4%, 4% 0%, 9% 3%, 15% 0%, 22% 3%, 29% 1%, 36% 4%, 44% 0%, 52% 3%, 60% 1%, 68% 4%, 76% 0%, 84% 3%, 92% 1%, 97% 4%, 100% 2%, 99% 25%, 100% 50%, 99% 75%, 100% 96%, 95% 100%, 88% 97%, 80% 100%, 72% 97%, 64% 100%, 55% 97%, 47% 100%, 39% 97%, 31% 100%, 23% 97%, 15% 100%, 7% 97%, 2% 100%, 0% 95%, 1% 70%, 0% 45%, 1% 20%)";

export const TornStrip: React.FC<TornStripProps> = ({
  id,
  text,
  lines,
  children,
  bg = PALETTE.sunnyYellow,
  textColor = PALETTE.ink,
  delay = 0,
  rotate = -1.5,
  fontSize = 88,
  padding = "18px 40px",
  style = {},
}) => {
  const pop = usePop(delay);
  const boil = useBoil(id, 3, { rot: 0.6, pos: 1.2, scale: 0.008 });

  const clampedRotate = Math.max(-3, Math.min(3, rotate + boil.rotate * 0.4));

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
        transform: `translate(${boil.x}px, ${boil.y}px) rotate(${clampedRotate}deg) scale(${pop * boil.scale})`,
        transformOrigin: "center center",
        filter: "drop-shadow(6px 10px 16px rgba(0, 0, 0, 0.28))",
        zIndex: 20,
        ...style,
      }}
    >
      {/* LAYER 1: GPU-Accelerated Torn Paper Strip */}
      <div
        style={{
          position: "absolute",
          inset: "-6px -14px",
          background: bg,
          clipPath: TORN_CLIP_POLYGON,
          borderRadius: "10px",
          zIndex: 1,
        }}
      />

      {/* LAYER 2: Crisp Text */}
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
          letterSpacing: "0.02em",
          textAlign: "center",
          whiteSpace: "nowrap",
          wordBreak: "keep-all",
          overflowWrap: "normal",
          WebkitTextStroke: "0.04em rgba(255, 255, 255, 0.35)",
          paintOrder: "stroke fill",
        }}
      >
        {renderedContent}
      </div>
    </div>
  );
};
