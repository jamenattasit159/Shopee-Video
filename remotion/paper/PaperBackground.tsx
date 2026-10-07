import React from "react";
import { AbsoluteFill } from "remotion";
import { useBoil } from "../lib/stopMotion";
import { PackId } from "../types";
import { PACK_MAP } from "../packs";

export type PaperTheme = "kraft" | "cream-grid" | "halftone-orange" | "pastel-mint";

interface PaperBackgroundProps {
  theme?: PaperTheme;
  packId?: PackId;
  bg?: string;
  overlayOpacity?: number;
  showTornBorders?: boolean;
}

export const PaperBackground: React.FC<PaperBackgroundProps> = ({
  theme = "kraft",
  packId,
  bg,
  overlayOpacity = 0.1,
  showTornBorders = true,
}) => {
  const boil = useBoil(`paper-bg-${packId || theme}`, 3, { rot: 0.2, pos: 1, scale: 0.005 });

  if (packId && PACK_MAP[packId]) {
    return (
      <AbsoluteFill style={{ overflow: "hidden" }}>
        {PACK_MAP[packId].renderBackground({ bg, overlayOpacity })}
        {/* Paper Grain Overlay */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            opacity: overlayOpacity,
            pointerEvents: "none",
            backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.5'/%3E%3C/svg%3E")`,
            backgroundSize: "200px 200px",
            mixBlendMode: "overlay",
          }}
        />
        {showTornBorders && (
          <>
            <div
              style={{
                position: "absolute",
                top: -10,
                left: -20,
                right: -20,
                height: "50px",
                background: "#FFFBF2",
                filter: "url(#torn)",
                transform: `rotate(${boil.rotate * 0.4}deg)`,
                boxShadow: "0 8px 16px rgba(0,0,0,0.15)",
                zIndex: 10,
              }}
            />
            <div
              style={{
                position: "absolute",
                bottom: -15,
                left: -20,
                right: -20,
                height: "60px",
                background: "#FFFBF2",
                filter: "url(#torn)",
                transform: `rotate(${-boil.rotate * 0.4}deg)`,
                boxShadow: "0 -8px 16px rgba(0,0,0,0.15)",
                zIndex: 10,
              }}
            />
          </>
        )}
      </AbsoluteFill>
    );
  }

  const getBackgroundStyle = (): React.CSSProperties => {
    switch (theme) {
      case "cream-grid":
        return {
          backgroundColor: bg || "#FFF8EA",
          backgroundImage: `
            linear-gradient(to right, rgba(0, 0, 0, 0.07) 2px, transparent 2px),
            linear-gradient(to bottom, rgba(0, 0, 0, 0.07) 2px, transparent 2px)
          `,
          backgroundSize: "40px 40px",
        };
      case "halftone-orange":
        return {
          backgroundColor: bg || "#EE4D2D",
          backgroundImage: `radial-gradient(circle, rgba(255, 255, 255, 0.28) 22%, transparent 24%)`,
          backgroundSize: "28px 28px",
        };
      case "pastel-mint":
        return {
          backgroundColor: bg || "#8BE3C3",
          backgroundImage: `radial-gradient(circle, rgba(255, 255, 255, 0.35) 18%, transparent 20%)`,
          backgroundSize: "32px 32px",
        };
      case "kraft":
      default:
        return {
          backgroundColor: bg || "#DDB88C",
          backgroundImage: `
            radial-gradient(rgba(120, 80, 40, 0.12) 15%, transparent 16%),
            radial-gradient(rgba(255, 255, 255, 0.1) 15%, transparent 16%)
          `,
          backgroundPosition: "0 0, 14px 14px",
          backgroundSize: "28px 28px",
        };
    }
  };

  return (
    <AbsoluteFill style={{ ...getBackgroundStyle(), overflow: "hidden" }}>
      {/* Paper Grain Overlay (Hardware-accelerated cached pattern) */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          opacity: overlayOpacity,
          pointerEvents: "none",
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.5'/%3E%3C/svg%3E")`,
          backgroundSize: "200px 200px",
          mixBlendMode: "overlay",
        }}
      />

      {/* Decorative Torn Paper Header Border */}
      {showTornBorders && (
        <div
          style={{
            position: "absolute",
            top: -10,
            left: -20,
            right: -20,
            height: "50px",
            background: "#FFFBF2",
            filter: "url(#torn)",
            transform: `rotate(${boil.rotate * 0.4}deg)`,
            boxShadow: "0 8px 16px rgba(0,0,0,0.15)",
            zIndex: 10,
          }}
        />
      )}

      {/* Decorative Torn Paper Footer Border */}
      {showTornBorders && (
        <div
          style={{
            position: "absolute",
            bottom: -15,
            left: -20,
            right: -20,
            height: "60px",
            background: "#FFFBF2",
            filter: "url(#torn)",
            transform: `rotate(${-boil.rotate * 0.4}deg)`,
            boxShadow: "0 -8px 16px rgba(0,0,0,0.15)",
            zIndex: 10,
          }}
        />
      )}
    </AbsoluteFill>
  );
};
