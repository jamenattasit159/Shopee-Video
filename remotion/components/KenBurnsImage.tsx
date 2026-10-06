import React from "react";
import { Img, interpolate, useCurrentFrame } from "remotion";
import { resolveMediaSrc } from "../utils";

interface KenBurnsImageProps {
  src: string;
  durationInFrames: number;
  direction?: "zoom-in" | "zoom-out" | "pan-right" | "pan-left";
  alt?: string;
}

export const KenBurnsImage: React.FC<KenBurnsImageProps> = ({
  src,
  durationInFrames,
  direction = "zoom-in",
  alt = "Product",
}) => {
  const frame = useCurrentFrame();

  // Compute smooth scale and translate
  let scale = 1;
  let translateX = 0;
  let translateY = 0;

  switch (direction) {
    case "zoom-in":
      scale = interpolate(frame, [0, durationInFrames], [1.0, 1.15], {
        extrapolateRight: "clamp",
      });
      break;
    case "zoom-out":
      scale = interpolate(frame, [0, durationInFrames], [1.15, 1.0], {
        extrapolateRight: "clamp",
      });
      break;
    case "pan-right":
      scale = 1.1;
      translateX = interpolate(frame, [0, durationInFrames], [-20, 20], {
        extrapolateRight: "clamp",
      });
      break;
    case "pan-left":
      scale = 1.1;
      translateX = interpolate(frame, [0, durationInFrames], [20, -20], {
        extrapolateRight: "clamp",
      });
      break;
  }

  // Fade-in at start (first 10 frames) and fade-out at end (last 8 frames)
  const fadeIn = interpolate(frame, [0, 10], [0, 1], {
    extrapolateRight: "clamp",
  });
  const fadeOut = interpolate(
    frame,
    [durationInFrames - 8, durationInFrames],
    [1, 0.8],
    {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    }
  );
  const opacity = Math.min(fadeIn, fadeOut);

  return (
    <div
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        width: "100%",
        height: "100%",
        overflow: "hidden",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        opacity,
      }}
    >
      <Img
        src={resolveMediaSrc(src)}
        alt={alt}
        style={{
          width: "100%",
          height: "100%",
          objectFit: "cover",
          transform: `scale(${scale}) translate(${translateX}px, ${translateY}px)`,
          transition: "transform 0.1s ease-out",
        }}
      />
      {/* Subtle vignette gradient for readable text overlays */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background:
            "linear-gradient(180deg, rgba(0,0,0,0.65) 0%, rgba(0,0,0,0.1) 30%, rgba(0,0,0,0.2) 65%, rgba(0,0,0,0.88) 100%)",
          pointerEvents: "none",
        }}
      />
    </div>
  );
};
