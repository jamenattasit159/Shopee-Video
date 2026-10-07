import React from "react";
import { FONTS, PALETTE } from "../lib/palette";
import { useBoil, usePop } from "../lib/stopMotion";

interface PriceBurstProps {
  id?: string;
  price: string;
  badge?: string;
  delay?: number;
  rotate?: number;
  size?: number;
  x?: number;
  y?: number;
  style?: React.CSSProperties;
}

export const PriceBurst: React.FC<PriceBurstProps> = ({
  id = "price-burst",
  price,
  badge = "⚡ ลดแรงพิเศษ",
  delay = 0,
  rotate = -4,
  size = 500, // V2 rule: Expanded burst so 120px price fits comfortably
  x = 0,
  y = 0,
  style = {},
}) => {
  const pop = usePop(delay, 8);
  const boil = useBoil(id, 3, { rot: 0.8, pos: 2, scale: 0.012 });

  // Generate 16-point starburst polygon points
  const points = [];
  const numPoints = 16;
  const outerR = 49;
  const innerR = 42;
  for (let i = 0; i < numPoints * 2; i++) {
    const r = i % 2 === 0 ? outerR : innerR;
    const angle = (i * Math.PI) / numPoints;
    const px = 50 + r * Math.sin(angle);
    const py = 50 - r * Math.cos(angle);
    points.push(`${px.toFixed(2)},${py.toFixed(2)}`);
  }
  const polygonPoints = points.join(" ");

  // Clamp rotation
  const clampedRotate = Math.max(-6, Math.min(6, rotate + boil.rotate * 0.4));

  return (
    <div
      style={{
        position: "absolute",
        left: x,
        top: y,
        width: size,
        height: size,
        transform: `translate(${boil.x}px, ${boil.y}px) rotate(${clampedRotate}deg) scale(${pop * boil.scale})`,
        transformOrigin: "center center",
        filter: "drop-shadow(10px 16px 0px rgba(0, 0, 0, 0.45))",
        zIndex: 35,
        ...style,
      }}
    >
      <svg
        viewBox="0 0 100 100"
        width="100%"
        height="100%"
        style={{ overflow: "visible" }}
      >
        {/* Starburst Badge */}
        <polygon
          points={polygonPoints}
          fill={PALETTE.sunnyYellow}
          stroke={PALETTE.white}
          strokeWidth="3.5"
          strokeLinejoin="round"
        />
        <polygon
          points={polygonPoints}
          fill="none"
          stroke={PALETTE.ink}
          strokeWidth="1.8"
          strokeLinejoin="round"
        />
      </svg>

      {/* Internal Content (Layered Crisp Typography, NO DISTORTION) */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: "24px",
          textAlign: "center",
        }}
      >
        {badge && (
          <div
            style={{
              backgroundColor: PALETTE.shopeeOrange,
              color: PALETTE.white,
              fontFamily: FONTS.heading,
              fontWeight: 800,
              fontSize: "28px",
              padding: "6px 18px",
              borderRadius: "8px",
              boxShadow: "0 3px 6px rgba(0,0,0,0.3)",
              transform: "rotate(-2deg)",
              marginBottom: "8px",
              border: `2px solid ${PALETTE.white}`,
            }}
          >
            {badge}
          </div>
        )}

        {/* HERO PRICE: Minimum 120px per Rule A2 & D2 */}
        <div
          style={{
            fontFamily: FONTS.heading,
            fontWeight: 800,
            fontSize: "128px",
            color: PALETTE.ink,
            lineHeight: 1.0,
            letterSpacing: "-1px",
            WebkitTextStroke: "0.04em #FFFFFF",
            paintOrder: "stroke fill",
            textShadow: "0 4px 10px rgba(0,0,0,0.25)",
          }}
        >
          {price}
        </div>

        <div
          style={{
            fontFamily: FONTS.handwriting,
            fontWeight: 700,
            fontSize: "28px",
            color: "#664D00",
            marginTop: "6px",
          }}
        >
          พิกัดตะกร้าส้มซ้ายล่าง!
        </div>
      </div>
    </div>
  );
};
