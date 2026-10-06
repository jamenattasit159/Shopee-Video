import React from "react";
import { interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";

interface AnimatedTextBadgeProps {
  badge?: string;
  title: string;
  subtitle?: string;
  primaryColor?: string;
  accentColor?: string;
  top?: string;
}

export const AnimatedTextBadge: React.FC<AnimatedTextBadgeProps> = ({
  badge,
  title,
  subtitle,
  primaryColor = "#EE4D2D",
  accentColor = "#FFBA00",
  top = "210px", // Lowered to be well inside the Top Safe Zone
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Entrance spring animation
  const titleSpring = spring({
    frame,
    fps,
    config: {
      damping: 10,
      stiffness: 140,
      mass: 0.6,
    },
  });

  const subtitleSpring = spring({
    frame: frame - 5,
    fps,
    config: {
      damping: 11,
      stiffness: 120,
      mass: 0.7,
    },
  });

  const scale = interpolate(titleSpring, [0, 1], [0.65, 1]);
  const translateY = interpolate(titleSpring, [0, 1], [-50, 0]);
  const opacity = interpolate(titleSpring, [0, 1], [0, 1]);

  // Subtle floating motion after entering
  const floatY = Math.sin((frame % 40) / 40 * Math.PI * 2) * 5;

  return (
    <div
      style={{
        position: "absolute",
        top,
        left: "50px",
        right: "170px", // STRICT SAFE ZONE: Clears the right 170px buttons (Like, Share, Profile)
        display: "flex",
        flexDirection: "column",
        alignItems: "flex-start",
        zIndex: 40,
        transform: `translateY(${translateY + floatY}px) scale(${scale})`,
        opacity,
      }}
    >
      {/* Top sticker / badge */}
      {badge && (
        <div
          style={{
            background: `linear-gradient(90deg, ${accentColor} 0%, #F59E0B 100%)`,
            color: "#0F172A",
            fontWeight: 900,
            fontSize: "26px",
            padding: "8px 22px",
            borderRadius: "50px",
            marginBottom: "12px",
            boxShadow: "0 8px 24px rgba(0,0,0,0.5), 0 0 15px rgba(255, 186, 0, 0.4)",
            border: "2px solid #FFFFFF",
            letterSpacing: "0.5px",
            display: "inline-flex",
            alignItems: "center",
            gap: "6px",
          }}
        >
          {badge}
        </div>
      )}

      {/* Main Headline Card */}
      <div
        style={{
          background: "rgba(10, 15, 30, 0.94)",
          border: `4px solid ${primaryColor}`,
          borderRadius: "26px",
          padding: "20px 28px",
          maxWidth: "100%",
          boxShadow: `0 16px 35px rgba(0,0,0,0.7), 0 0 30px ${primaryColor}55`,
        }}
      >
        <div
          style={{
            color: "#FFFFFF",
            fontSize: "40px",
            fontWeight: 900,
            lineHeight: 1.25,
            textShadow: "0 3px 6px rgba(0,0,0,0.9)",
            letterSpacing: "-0.5px",
            wordBreak: "break-word",
          }}
        >
          {title}
        </div>
      </div>

      {/* Subtitle / Description Pill */}
      {subtitle && (
        <div
          style={{
            marginTop: "12px",
            background: `linear-gradient(135deg, ${primaryColor} 0%, #FF6533 100%)`,
            color: "#FFFFFF",
            padding: "10px 22px",
            borderRadius: "18px",
            fontSize: "24px",
            fontWeight: 700,
            boxShadow: "0 8px 20px rgba(0,0,0,0.4)",
            border: "1.5px solid rgba(255,255,255,0.3)",
            opacity: interpolate(subtitleSpring, [0, 1], [0, 1]),
            transform: `translateY(${interpolate(subtitleSpring, [0, 1], [15, 0])}px)`,
            wordBreak: "break-word",
          }}
        >
          {subtitle}
        </div>
      )}
    </div>
  );
};
