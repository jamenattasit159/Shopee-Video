import React from "react";
import { interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { HookData } from "../types";
import { AbsoluteFill } from "./AbsoluteFill";
import { AnimatedTextBadge } from "./AnimatedTextBadge";
import { KenBurnsImage } from "./KenBurnsImage";

interface HookSceneProps {
  hook: HookData;
  imageSrc: string;
  primaryColor?: string;
  accentColor?: string;
}

export const HookScene: React.FC<HookSceneProps> = ({
  hook,
  imageSrc,
  primaryColor = "#EE4D2D",
  accentColor = "#FFBA00",
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const durationInFrames = Math.max(1, Math.round(hook.durationSec * fps));

  // Quick energetic white flash on scene entrance (frames 0 to 4)
  const flashOpacity = interpolate(frame, [0, 2, 5], [0.8, 0.4, 0], {
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill>
      {/* Background Image with Ken Burns zoom */}
      <KenBurnsImage
        src={imageSrc}
        durationInFrames={durationInFrames}
        direction="zoom-in"
      />

      {/* High-impact Hook Text Overlay in Safe Zone */}
      <AnimatedTextBadge
        badge={hook.badgeText || "🔥 ไอเทมเด็ดช้อปปี้"}
        title={hook.headline}
        subtitle={hook.subheadline}
        primaryColor={primaryColor}
        accentColor={accentColor}
        top="210px"
      />

      {/* White Flash Transition Impact */}
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
