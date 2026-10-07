import React from "react";
import { PALETTE } from "../lib/palette";
import { useBoil, usePop } from "../lib/stopMotion";

export type DoodleType = "arrow" | "circle" | "underline" | "sparkle" | "star";

interface DoodleProps {
  id: string;
  type: DoodleType;
  color?: string;
  strokeWidth?: number;
  width?: number;
  height?: number;
  delay?: number;
  rotate?: number;
  x?: number;
  y?: number;
  style?: React.CSSProperties;
}

export const Doodle: React.FC<DoodleProps> = ({
  id,
  type,
  color = PALETTE.sunnyYellow,
  strokeWidth = 6,
  width = 120,
  height = 120,
  delay = 0,
  rotate = 0,
  x = 0,
  y = 0,
  style = {},
}) => {
  const pop = usePop(delay);
  const boil = useBoil(id, 3, { rot: 1.5, pos: 2, scale: 0.02 });

  const renderPath = () => {
    switch (type) {
      case "arrow":
        return (
          // Playful curved arrow with arrowhead
          <g>
            <path
              d="M 15 80 Q 40 20 85 35"
              fill="none"
              stroke={color}
              strokeWidth={strokeWidth}
              strokeLinecap="round"
            />
            <path
              d="M 68 22 L 88 36 L 80 58"
              fill="none"
              stroke={color}
              strokeWidth={strokeWidth}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </g>
        );

      case "circle":
        return (
          // Imperfect hand-drawn looped circle
          <path
            d="M 50 15 C 80 12, 95 32, 92 65 C 88 92, 60 96, 32 90 C 14 84, 8 50, 24 25 C 34 10, 68 8, 86 20"
            fill="none"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
          />
        );

      case "underline":
        return (
          // Wavy highlighter marker underline
          <path
            d="M 8 18 Q 30 8 55 18 T 100 16 T 150 18"
            fill="none"
            stroke={color}
            strokeWidth={strokeWidth + 2}
            strokeLinecap="round"
          />
        );

      case "sparkle":
      case "star":
      default:
        return (
          // 4-point doodle sparkle star
          <g>
            <path
              d="M 50 8 Q 50 50 8 50 Q 50 50 50 92 Q 50 50 92 50 Q 50 50 50 8 Z"
              fill={color}
              stroke={PALETTE.ink}
              strokeWidth={2}
            />
          </g>
        );
    }
  };

  const viewBox =
    type === "underline" ? "0 0 160 36" : "0 0 100 100";

  return (
    <div
      style={{
        position: "absolute",
        left: x,
        top: y,
        width,
        height,
        transform: `translate(${boil.x}px, ${boil.y}px) rotate(${rotate + boil.rotate}deg) scale(${pop * boil.scale})`,
        transformOrigin: "center center",
        filter: "drop-shadow(3px 4px 0px rgba(0,0,0,0.3))",
        zIndex: 24,
        pointerEvents: "none",
        ...style,
      }}
    >
      <svg
        viewBox={viewBox}
        width="100%"
        height="100%"
        style={{ overflow: "visible" }}
      >
        {renderPath()}
      </svg>
    </div>
  );
};
