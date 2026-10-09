import React from "react";
import { FONTS, PALETTE } from "../lib/palette";
import { useBoil, usePop } from "../lib/stopMotion";
import { useTextMotionStyle } from "../motion/presets";
import { TextMotionPreset } from "../motion/types";
import { fitSubtitle } from "../lib/textFit";
import { renderKeep } from "../lib/thaiKeep";

interface StickerTextProps {
  id: string;
  text?: string;
  lines?: string[];
  highlightWord?: string;
  fontSize?: number; // Minimum 56px per Rule A2
  color?: string;
  strokeColor?: string;
  strokeWidthEm?: number; // In em units, max 0.08em per Rule A2
  strokeWidth?: number; // Backward-compatible pixel stroke width
  highlightColor?: string;
  rotate?: number;
  delay?: number;
  fontFamily?: string;
  textAlign?: "left" | "center" | "right";
  withSolidBacking?: boolean;
  motionPreset?: TextMotionPreset;
  style?: React.CSSProperties;
}

export const StickerText: React.FC<StickerTextProps> = ({
  id,
  text = "",
  lines,
  highlightWord,
  fontSize = 56, // V2 rule: minimum 56px for subtitle
  color = PALETTE.white,
  strokeColor = PALETTE.ink,
  strokeWidth,
  strokeWidthEm = strokeWidth ? Math.min(0.08, strokeWidth / fontSize) : 0.06, // Rule A2: stroke <= 0.08em
  highlightColor = PALETTE.markerYellow,
  rotate = 0,
  delay = 0,
  fontFamily = FONTS.heading,
  textAlign = "center",
  withSolidBacking = true,
  motionPreset = "kinetic-slide",
  style = {},
}) => {
  const boil = useBoil(id, 3, { rot: 0.6, pos: 1.5, scale: 0.01 });

  // Clamp rotation to max ±3°
  const clampedRotate = Math.max(-3, Math.min(3, rotate + boil.rotate * 0.4));
  const motion = useTextMotionStyle(motionPreset, { delay, rotate: clampedRotate });

  // Fit subtitle into max 2 balanced lines respecting Part E boundaries
  const fitted = fitSubtitle({ text, lines }, fontSize);

  const renderFittedLines = () => {
    return fitted.lines.map((line, lineIdx) => {
      let content: React.ReactNode = renderKeep(line);

      if (highlightWord && line.includes(highlightWord)) {
        const parts = line.split(highlightWord);
        content = parts.map((part, pIdx) => (
          <React.Fragment key={pIdx}>
            {renderKeep(part)}
            {pIdx < parts.length - 1 && (
              <span
                style={{
                  position: "relative",
                  display: "inline-block",
                  color: PALETTE.ink,
                  WebkitTextStroke: "0",
                  padding: "2px 8px",
                  margin: "0 4px",
                  zIndex: 2,
                  whiteSpace: "nowrap",
                }}
              >
                {/* Solid opaque fluorescent marker underlay */}
                <span
                  style={{
                    position: "absolute",
                    inset: "12% -4% 6% -4%",
                    backgroundColor: highlightColor,
                    borderRadius: "4px",
                    zIndex: -1,
                    boxShadow: "0 2px 6px rgba(0,0,0,0.25)",
                  }}
                />
                {highlightWord}
              </span>
            )}
          </React.Fragment>
        ));
      }

      return (
        <div
          key={lineIdx}
          style={{
            whiteSpace: "nowrap",
            wordBreak: "keep-all",
            overflowWrap: "normal",
          }}
        >
          {content}
        </div>
      );
    });
  };

  return (
    <div
      style={{
        position: "relative",
        display: "inline-block",
        maxWidth: `${fitted.plateWidth}px`,
        transform: `translate(${boil.x}px, ${boil.y}px) ${motion.transform}`,
        opacity: motion.opacity,
        transformOrigin: "center center",
        zIndex: 22,
        ...style,
      }}
    >
      {/* ⬛ Optional Solid Contrast Backing (#1B1B1B @ 0.90) */}
      {withSolidBacking && (
        <div
          style={{
            position: "absolute",
            inset: "-8px -18px",
            backgroundColor: "rgba(27, 27, 27, 0.92)",
            borderRadius: "12px",
            boxShadow: "4px 8px 16px rgba(0, 0, 0, 0.4)",
            border: "2px solid rgba(255, 255, 255, 0.15)",
            zIndex: 1,
          }}
        />
      )}

      {/* 🔤 Clean Text Layer (NO DISPLACEMENT FILTER) */}
      <div
        style={{
          position: "relative",
          zIndex: 2,
          fontFamily,
          fontSize: fitted.fontSize,
          fontWeight: 800,
          lineHeight: 1.4,
          letterSpacing: "0.02em", // Rule A2: 0.01em - 0.03em
          color,
          textAlign,
          whiteSpace: "nowrap", // Strict Part E rule: nowrap, no word-break
          wordBreak: "keep-all",
          overflowWrap: "normal",
          WebkitTextStroke: `${strokeWidthEm}em ${strokeColor}`,
          paintOrder: "stroke fill",
          padding: "4px 10px",
          textShadow: "0 3px 6px rgba(0,0,0,0.5)",
        }}
      >
        {renderFittedLines()}
      </div>
    </div>
  );
};
