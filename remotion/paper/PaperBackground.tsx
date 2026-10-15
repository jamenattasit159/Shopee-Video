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

const TORN_HEADER_CLIP =
  "polygon(0% 0%, 100% 0%, 100% 72%, 94% 96%, 88% 76%, 81% 98%, 74% 78%, 67% 95%, 59% 75%, 51% 98%, 43% 76%, 35% 96%, 27% 78%, 19% 97%, 11% 75%, 4% 96%, 0% 78%)";

const TORN_FOOTER_CLIP =
  "polygon(0% 25%, 5% 4%, 12% 24%, 20% 2%, 28% 22%, 36% 5%, 44% 25%, 52% 3%, 60% 23%, 68% 4%, 76% 24%, 84% 3%, 92% 22%, 97% 5%, 100% 22%, 100% 100%, 0% 100%)";

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
        {showTornBorders && (
          <>
            <div
              style={{
                position: "absolute",
                top: -8,
                left: -20,
                right: -20,
                height: "52px",
                background: "#FFFBF2",
                clipPath: TORN_HEADER_CLIP,
                transform: `rotate(${boil.rotate * 0.3}deg)`,
                zIndex: 10,
              }}
            />
            <div
              style={{
                position: "absolute",
                bottom: -10,
                left: -20,
                right: -20,
                height: "60px",
                background: "#FFFBF2",
                clipPath: TORN_FOOTER_CLIP,
                transform: `rotate(${-boil.rotate * 0.3}deg)`,
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
            linear-gradient(to right, rgba(0, 0, 0, 0.06) 2px, transparent 2px),
            linear-gradient(to bottom, rgba(0, 0, 0, 0.06) 2px, transparent 2px)
          `,
          backgroundSize: "40px 40px",
        };
      case "halftone-orange":
        return {
          backgroundColor: bg || "#EE4D2D",
          backgroundImage: `radial-gradient(circle, rgba(255, 255, 255, 0.24) 22%, transparent 24%)`,
          backgroundSize: "28px 28px",
        };
      case "pastel-mint":
        return {
          backgroundColor: bg || "#8BE3C3",
          backgroundImage: `radial-gradient(circle, rgba(255, 255, 255, 0.3) 18%, transparent 20%)`,
          backgroundSize: "32px 32px",
        };
      case "kraft":
      default:
        return {
          backgroundColor: bg || "#DDB88C",
          backgroundImage: `
            radial-gradient(rgba(120, 80, 40, 0.1) 15%, transparent 16%),
            radial-gradient(rgba(255, 255, 255, 0.08) 15%, transparent 16%)
          `,
          backgroundPosition: "0 0, 14px 14px",
          backgroundSize: "28px 28px",
        };
    }
  };

  return (
    <AbsoluteFill style={{ ...getBackgroundStyle(), overflow: "hidden" }}>
      {showTornBorders && (
        <div
          style={{
            position: "absolute",
            top: -8,
            left: -20,
            right: -20,
            height: "52px",
            background: "#FFFBF2",
            clipPath: TORN_HEADER_CLIP,
            transform: `rotate(${boil.rotate * 0.3}deg)`,
            zIndex: 10,
          }}
        />
      )}

      {showTornBorders && (
        <div
          style={{
            position: "absolute",
            bottom: -10,
            left: -20,
            right: -20,
            height: "60px",
            background: "#FFFBF2",
            clipPath: TORN_FOOTER_CLIP,
            transform: `rotate(${-boil.rotate * 0.3}deg)`,
            zIndex: 10,
          }}
        />
      )}
    </AbsoluteFill>
  );
};
