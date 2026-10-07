import React from "react";
import { useBoil } from "../lib/stopMotion";

export type TapePattern = "striped" | "dots" | "solid" | "shopee";

interface WashiTapeProps {
  id?: string;
  width?: number;
  height?: number;
  color?: string;
  pattern?: TapePattern;
  rotate?: number;
  x?: number;
  y?: number;
  style?: React.CSSProperties;
}

export const WashiTape: React.FC<WashiTapeProps> = ({
  id = "tape",
  width = 160,
  height = 42,
  color = "rgba(255, 238, 140, 0.88)",
  pattern = "striped",
  rotate = 3,
  x = 0,
  y = 0,
  style = {},
}) => {
  const boil = useBoil(id, 3, { rot: 0.8, pos: 1.5, scale: 0.01 });

  const getPatternBg = () => {
    switch (pattern) {
      case "striped":
        return `
          repeating-linear-gradient(
            -45deg,
            ${color},
            ${color} 10px,
            rgba(255, 255, 255, 0.4) 10px,
            rgba(255, 255, 255, 0.4) 20px
          )
        `;
      case "dots":
        return `
          radial-gradient(rgba(0, 0, 0, 0.12) 20%, transparent 22%) 0 0/12px 12px,
          ${color}
        `;
      case "shopee":
        return `
          repeating-linear-gradient(
            45deg,
            rgba(238, 77, 45, 0.85),
            rgba(238, 77, 45, 0.85) 12px,
            rgba(255, 210, 63, 0.9) 12px,
            rgba(255, 210, 63, 0.9) 24px
          )
        `;
      case "solid":
      default:
        return color;
    }
  };

  return (
    <div
      style={{
        position: "absolute",
        left: x,
        top: y,
        width,
        height,
        background: getPatternBg(),
        transform: `translate(${boil.x}px, ${boil.y}px) rotate(${rotate + boil.rotate}deg)`,
        boxShadow: "0 2px 6px rgba(0,0,0,0.18), inset 0 0 2px rgba(255,255,255,0.4)",
        opacity: 0.92,
        backdropFilter: "blur(1px)",
        // Ragged serrated ends for washi tape
        clipPath:
          "polygon(0% 12%, 4% 0%, 96% 0%, 100% 14%, 97% 50%, 100% 86%, 95% 100%, 5% 100%, 0% 88%, 3% 50%)",
        zIndex: 25,
        pointerEvents: "none",
        ...style,
      }}
    />
  );
};
