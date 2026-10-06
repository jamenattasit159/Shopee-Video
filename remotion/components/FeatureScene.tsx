import React from "react";
import { interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { SceneData } from "../types";
import { AbsoluteFill } from "./AbsoluteFill";
import { AnimatedTextBadge } from "./AnimatedTextBadge";
import { KenBurnsImage } from "./KenBurnsImage";

interface FeatureSceneProps {
  scene: SceneData;
  imageSrc: string;
  sceneIndex: number;
  totalScenes: number;
  primaryColor?: string;
  accentColor?: string;
}

export const FeatureScene: React.FC<FeatureSceneProps> = ({
  scene,
  imageSrc,
  sceneIndex,
  totalScenes,
  primaryColor = "#EE4D2D",
  accentColor = "#FFBA00",
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const durationInFrames = Math.max(1, Math.round(scene.durationSec * fps));

  // Quick energetic white flash on transition
  const flashOpacity = interpolate(frame, [0, 2, 4], [0.7, 0.3, 0], {
    extrapolateRight: "clamp",
  });

  const directions: Array<"zoom-in" | "zoom-out" | "pan-right" | "pan-left"> = [
    "zoom-out",
    "pan-right",
    "pan-left",
    "zoom-in",
  ];
  const direction = directions[sceneIndex % directions.length];

  return (
    <AbsoluteFill>
      {/* Ken Burns Image slideshow */}
      <KenBurnsImage
        src={imageSrc}
        durationInFrames={durationInFrames}
        direction={direction}
      />

      {/* Scene Index Counter Tag inside Safe Zone */}
      <div
        style={{
          position: "absolute",
          top: "205px",
          right: "170px", // SAFE ZONE: Clears right buttons
          background: "rgba(15, 23, 42, 0.9)",
          border: `2px solid ${accentColor}`,
          color: "#FFFFFF",
          fontSize: "18px",
          fontWeight: 800,
          padding: "5px 14px",
          borderRadius: "16px",
          zIndex: 45,
          letterSpacing: "0.5px",
          boxShadow: "0 4px 15px rgba(0,0,0,0.5)",
        }}
      >
        {`จุดเด่น ${sceneIndex + 1}/${totalScenes}`}
      </div>

      {/* Main Feature Highlight overlay inside Safe Zone */}
      <AnimatedTextBadge
        badge={scene.stickerText || `✨ จุดเด่นที่ ${sceneIndex + 1}`}
        title={scene.highlightTitle}
        subtitle={scene.highlightDesc}
        primaryColor={primaryColor}
        accentColor={accentColor}
        top="210px"
      />

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
