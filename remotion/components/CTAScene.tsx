import React from "react";
import { interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { CTAData } from "../types";
import { AbsoluteFill } from "./AbsoluteFill";
import { KenBurnsImage } from "./KenBurnsImage";

interface CTASceneProps {
  cta: CTAData;
  imageSrc: string;
  price: string;
  primaryColor?: string;
  accentColor?: string;
}

export const CTAScene: React.FC<CTASceneProps> = ({
  cta,
  imageSrc,
  price,
  primaryColor = "#EE4D2D",
  accentColor = "#FFBA00",
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const durationInFrames = Math.max(1, Math.round(cta.durationSec * fps));

  // Transition Flash
  const flashOpacity = interpolate(frame, [0, 2, 5], [0.85, 0.4, 0], {
    extrapolateRight: "clamp",
  });

  const arrowBounce = Math.sin((frame % 14) / 14 * Math.PI * 2) * 12;

  const titleSpring = spring({
    frame,
    fps,
    config: { damping: 9, stiffness: 120 },
  });

  return (
    <AbsoluteFill>
      {/* Background with slight zoom */}
      <KenBurnsImage
        src={imageSrc}
        durationInFrames={durationInFrames}
        direction="zoom-in"
      />

      {/* Dark gradient focus backdrop */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: "radial-gradient(circle, rgba(0,0,0,0.45) 0%, rgba(0,0,0,0.88) 100%)",
        }}
      />

      {/* Main CTA Center Box inside SAFE ZONE */}
      <div
        style={{
          position: "absolute",
          top: "210px",
          left: "50px",
          right: "170px", // SAFE ZONE: Clears right buttons
          display: "flex",
          flexDirection: "column",
          alignItems: "flex-start",
          zIndex: 40,
          transform: `scale(${interpolate(titleSpring, [0, 1], [0.85, 1])})`,
          opacity: interpolate(titleSpring, [0, 1], [0, 1]),
        }}
      >
        {/* Flash Sale Tag */}
        <div
          style={{
            background: accentColor,
            color: "#0F172A",
            fontWeight: 900,
            fontSize: "24px",
            padding: "8px 22px",
            borderRadius: "50px",
            marginBottom: "14px",
            boxShadow: "0 8px 25px rgba(255, 186, 0, 0.45)",
            border: "2px solid #FFFFFF",
          }}
        >
          ⚡ ด่วน! โค้ดส่วนลดมีจำนวนจำกัด
        </div>

        {/* CTA Headline Card */}
        <div
          style={{
            background: "rgba(10, 15, 30, 0.95)",
            border: `4px solid ${primaryColor}`,
            borderRadius: "26px",
            padding: "20px 26px",
            width: "100%",
            boxShadow: `0 16px 40px rgba(0,0,0,0.7), 0 0 35px ${primaryColor}55`,
          }}
        >
          <div
            style={{
              color: "#FFFFFF",
              fontSize: "42px",
              fontWeight: 900,
              lineHeight: 1.25,
            }}
          >
            {cta.ctaTitle}
          </div>

          {cta.ctaSubtitle && (
            <div
              style={{
                marginTop: "10px",
                color: "#E2E8F0",
                fontSize: "24px",
                fontWeight: 600,
              }}
            >
              {cta.ctaSubtitle}
            </div>
          )}

          {/* Price Callout */}
          <div
            style={{
              marginTop: "16px",
              background: `linear-gradient(135deg, ${primaryColor} 0%, #FF6533 100%)`,
              padding: "12px 24px",
              borderRadius: "18px",
              display: "inline-block",
              color: "#FFFFFF",
              fontSize: "30px",
              fontWeight: 900,
              boxShadow: "0 8px 20px rgba(238, 77, 45, 0.4)",
            }}
          >
            🔥 พิเศษเพียง {price}
          </div>
        </div>

        {/* Pulsing Pointer Arrow pointing to bottom-left basket */}
        <div
          style={{
            marginTop: "30px",
            display: "flex",
            alignItems: "center",
            gap: "12px",
            transform: `translateY(${arrowBounce}px)`,
          }}
        >
          <div
            style={{
              background: "rgba(0, 0, 0, 0.88)",
              border: `2.5px solid ${accentColor}`,
              color: "#FFFFFF",
              fontSize: "22px",
              fontWeight: 800,
              padding: "10px 22px",
              borderRadius: "30px",
              boxShadow: "0 6px 18px rgba(0,0,0,0.5)",
            }}
          >
            {cta.basketNote || "👇 พิกัดในตะกร้าส้มซ้ายล่าง"}
          </div>

          <div
            style={{
              fontSize: "48px",
              filter: "drop-shadow(0 4px 10px rgba(0,0,0,0.6))",
            }}
          >
            👇
          </div>
        </div>
      </div>

      {/* Transition Flash */}
      {flashOpacity > 0 && (
        <AbsoluteFill
          style={{
            backgroundColor: "#FFFFFF",
            opacity: flashOpacity,
            pointerEvents: "none",
            zIndex: 100,
          }}
        />
      )}
    </AbsoluteFill>
  );
};
