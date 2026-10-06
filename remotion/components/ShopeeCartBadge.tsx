import React from "react";
import { interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";

interface ShopeeCartBadgeProps {
  productName: string;
  price: string;
  primaryColor?: string;
}

export const ShopeeCartBadge: React.FC<ShopeeCartBadgeProps> = ({
  productName,
  price,
  primaryColor = "#EE4D2D",
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Entrance spring animation at frame 10
  const entrance = spring({
    frame: frame - 10,
    fps,
    config: {
      damping: 11,
      stiffness: 110,
      mass: 0.8,
    },
  });

  // Continuous gentle bounce pulse
  const bounceCycle = (frame % 28) / 28;
  const pulseScale = 1 + Math.sin(bounceCycle * Math.PI * 2) * 0.025;

  const translateY = interpolate(entrance, [0, 1], [60, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const opacity = interpolate(entrance, [0, 1], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <div
      style={{
        position: "absolute",
        bottom: "370px", // SAFE ZONE: Sits right above the Bottom Red Zone (360px)
        left: "50px",
        right: "170px", // SAFE ZONE: Clears the right action buttons (170px)
        transform: `translateY(${translateY}px) scale(${pulseScale})`,
        opacity,
        zIndex: 50,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "14px",
          background: "rgba(10, 15, 30, 0.94)",
          backdropFilter: "blur(14px)",
          border: `3px solid ${primaryColor}`,
          borderRadius: "24px",
          padding: "14px 20px",
          boxShadow: `0 14px 35px rgba(238, 77, 45, 0.4), 0 4px 10px rgba(0,0,0,0.6)`,
        }}
      >
        {/* Orange Shopee Bag Icon */}
        <div
          style={{
            width: "56px",
            height: "56px",
            borderRadius: "16px",
            background: `linear-gradient(135deg, ${primaryColor} 0%, #FF6533 100%)`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
            boxShadow: "0 6px 15px rgba(238, 77, 45, 0.5)",
          }}
        >
          {/* Shopping Bag SVG */}
          <svg
            width="30"
            height="30"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#FFFFFF"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z" />
            <path d="M3 6h18" />
            <path d="M16 10a4 4 0 0 1-8 0" />
          </svg>
        </div>

        {/* Text Details */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              marginBottom: "3px",
            }}
          >
            <span
              style={{
                background: primaryColor,
                color: "#FFFFFF",
                fontSize: "16px",
                fontWeight: 800,
                padding: "2px 8px",
                borderRadius: "6px",
                letterSpacing: "0.5px",
              }}
            >
              ตะกร้าส้ม
            </span>
            <span
              style={{
                color: "#FCD34D",
                fontSize: "18px",
                fontWeight: 900,
              }}
            >
              {price}
            </span>
          </div>

          <div
            style={{
              color: "#FFFFFF",
              fontSize: "19px",
              fontWeight: 700,
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
              textShadow: "0 2px 4px rgba(0,0,0,0.6)",
            }}
          >
            {productName}
          </div>
        </div>

        {/* Action arrow button */}
        <div
          style={{
            background: primaryColor,
            color: "#FFFFFF",
            padding: "8px 14px",
            borderRadius: "14px",
            fontWeight: 800,
            fontSize: "17px",
            display: "flex",
            alignItems: "center",
            gap: "4px",
            whiteSpace: "nowrap",
            boxShadow: "0 4px 12px rgba(238, 77, 45, 0.4)",
          }}
        >
          <span>ช้อปเลย</span>
          <span style={{ fontSize: "18px" }}>👉</span>
        </div>
      </div>
    </div>
  );
};
