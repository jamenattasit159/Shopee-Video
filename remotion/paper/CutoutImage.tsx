import React from "react";
import { Img } from "remotion";
import { FONTS } from "../lib/palette";
import { useBoil, usePop } from "../lib/stopMotion";
import { useObjectMotionStyle } from "../motion/presets";
import { ObjectMotionPreset } from "../motion/types";
import { resolveMediaSrc } from "../utils";
import { WashiTape } from "./WashiTape";

interface CutoutImageProps {
  id: string;
  src: string;
  delay?: number;
  baseRotate?: number;
  width?: number;
  x?: number;
  y?: number;
  isPolaroid?: boolean;
  polaroidCaption?: string;
  showTape?: boolean;
  motionPreset?: ObjectMotionPreset;
  durationInFrames?: number;
  enableAmbient?: boolean;
  children?: React.ReactNode;
  style?: React.CSSProperties;
}

export const CutoutImage: React.FC<CutoutImageProps> = ({
  id,
  src,
  delay = 0,
  baseRotate = -2,
  width = 820, // Rule D2: Scaled up 1.3-1.5x
  x = 0,
  y = 0,
  isPolaroid = false,
  polaroidCaption,
  showTape = false,
  motionPreset = "scale-pop",
  durationInFrames = 120,
  enableAmbient = true,
  children,
  style = {},
}) => {
  const boil = useBoil(id, 3, { rot: 0.8, pos: 2, scale: 0.01 });
  const motion = useObjectMotionStyle(motionPreset, {
    delay,
    baseRotate,
    durationInFrames,
    enableAmbient,
  });

  const resolvedSrc = resolveMediaSrc(src);

  if (isPolaroid) {
    // Polaroid caption rule: >= 44px, tilt <= 3°
    const polaroidTilt = Math.max(-3, Math.min(3, baseRotate));

    return (
      <div
        style={{
          position: "absolute",
          left: "50%",
          top: "50%",
          width,
          transform: `translate(-50%, -50%) translate(${x + boil.x}px, ${y + boil.y}px) ${motion.transform}`,
          opacity: motion.opacity,
          transformOrigin: "center center",
          background: "#FFFBF2",
          padding: "24px 24px 64px 24px",
          boxShadow: "10px 16px 32px rgba(0,0,0,0.35)",
          border: "2px solid rgba(0,0,0,0.06)",
          zIndex: 15,
          ...style,
        }}
      >
        {showTape && (
          <WashiTape
            id={`${id}-tape`}
            x={width * 0.35}
            y={-18}
            rotate={-2}
            width={140}
          />
        )}
        <div
          style={{
            width: "100%",
            aspectRatio: "1/1",
            overflow: "hidden",
            backgroundColor: "#F8FAFC",
            boxShadow: "inset 0 0 10px rgba(0,0,0,0.08)",
          }}
        >
          <Img
            src={resolvedSrc}
            style={{
              width: "100%",
              height: "100%",
              objectFit: "contain",
              padding: "16px",
              display: "block",
            }}
          />
        </div>
        {polaroidCaption && (
          <div
            style={{
              marginTop: "20px",
              textAlign: "center",
              fontFamily: FONTS.handwriting,
              fontSize: "44px", // Rule A2: Polaroid caption >= 44px
              fontWeight: 700,
              color: "#1B1B1B",
              lineHeight: 1.2,
            }}
          >
            {polaroidCaption}
          </div>
        )}
      </div>
    );
  }

  return (
    <div
      style={{
        position: "absolute",
        left: "50%",
        top: "55%", // Rule D2: Centered around ~55% height
        width,
        transform: `translate(-50%, -50%) translate(${x + boil.x}px, ${y + boil.y}px) ${motion.transform}`,
        opacity: motion.opacity,
        transformOrigin: "center center",
        // High-performance sticker border + hard offset shadow
        filter:
          "drop-shadow(0 0 10px #FFFFFF) drop-shadow(0 0 3px #FFFFFF) drop-shadow(10px 14px 0px rgba(0, 0, 0, 0.4))",
        zIndex: 15,
        ...style,
      }}
    >
      {showTape && (
        <WashiTape
          id={`${id}-tape`}
          x={width * 0.36}
          y={20}
          rotate={-8}
          width={130}
          height={36}
        />
      )}
      <Img
        src={resolvedSrc}
        style={{
          width: "100%",
          maxHeight: "880px",
          objectFit: "contain",
          display: "block",
        }}
      />
      {children}
    </div>
  );
};
