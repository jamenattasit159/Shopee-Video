import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { FONTS, PALETTE } from "../lib/palette";
import { useStepFrame } from "../lib/stopMotion";
import { CutoutImage } from "../paper/CutoutImage";
import { Doodle } from "../paper/Doodle";
import { PaperBackground } from "../paper/PaperBackground";
import { StickerText } from "../paper/StickerText";
import { TornStrip } from "../paper/TornStrip";
import { WashiTape } from "../paper/WashiTape";
import { HookData, PackId } from "../types";
import { PACK_MAP } from "../packs";
import { SceneMotionPlan } from "../motion/types";
import { orchestrateSceneMotion } from "../motion/orchestrator";

interface HookSceneProps {
  hook: HookData;
  imageSrc: string;
  primaryColor?: string;
  accentColor?: string;
  packId?: PackId;
  bgColor?: string;
  motionPlan?: SceneMotionPlan;
}

export const HookScene: React.FC<HookSceneProps> = ({
  hook,
  imageSrc,
  primaryColor = PALETTE.shopeeOrange,
  accentColor = PALETTE.sunnyYellow,
  packId,
  bgColor,
  motionPlan,
}) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const stepFrame = useStepFrame(3);
  const paperTheme = hook.paperTheme || "kraft";

  const effectiveMotion =
    motionPlan?.motionConfig ||
    orchestrateSceneMotion({
      packId,
      sceneIndex: 0,
      totalScenes: 5,
      sceneType: "hook",
      durationInFrames,
    }).motionConfig;

  // Sub-beat timing is dynamic based on motion config
  const isSubBeat = frame >= effectiveMotion.subBeatTimingFrame;

  const pack = packId && PACK_MAP[packId] ? PACK_MAP[packId] : null;

  return (
    <AbsoluteFill style={{ overflow: "hidden" }}>
      {/* 📜 1. Paper Background (Kraft Brown Texture or Pack background) */}
      <PaperBackground theme={paperTheme} packId={packId} bg={bgColor} overlayOpacity={0.12} />

      {/* Main Content Area */}
      <AbsoluteFill
        style={{
          paddingTop: "200px",
          paddingBottom: "400px",
          paddingLeft: "70px",
          paddingRight: "140px",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
        }}
      >
        {/* 🏷️ Top Badge Tag (Delay 2f) */}
        {hook.badgeText && (
          <div style={{ position: "relative", marginBottom: "16px" }}>
            {pack?.renderBadge ? (
              pack.renderBadge(hook.badgeText, primaryColor)
            ) : (
              <>
                <WashiTape
                  id="hook-badge-tape"
                  x={-20}
                  y={-14}
                  rotate={-6}
                  width={120}
                  height={34}
                  pattern="striped"
                />
                <div
                  style={{
                    backgroundColor: primaryColor,
                    color: PALETTE.white,
                    fontFamily: FONTS.heading,
                    fontWeight: 800,
                    fontSize: "30px",
                    padding: "8px 24px",
                    borderRadius: "10px",
                    boxShadow: "4px 6px 0px rgba(0,0,0,0.35)",
                    transform: "rotate(-2deg)",
                    filter: "url(#torn)",
                  }}
                >
                  {hook.badgeText}
                </div>
              </>
            )}
          </div>
        )}

        {/* 💥 Main Hook Headline (TornStrip with Thai line balancing, fontSize >= 88px) */}
        <TornStrip
          id="hook-headline-strip"
          text={hook.headline}
          lines={hook.headlineLines}
          bg={accentColor}
          textColor={PALETTE.ink}
          fontSize={88} // V2 rule: Headline >= 88px
          rotate={-1.5}
          delay={2}
          motionPreset={effectiveMotion.textPreset}
          padding="16px 36px"
          style={{ maxWidth: "880px" }}
        />

        {/* 📝 Subheadline (Delay 8f, with solid backing for 7:1 contrast) */}
        {hook.subheadline && (
          <div style={{ marginTop: "18px" }}>
            <StickerText
              id="hook-subheadline"
              text={hook.subheadline}
              lines={hook.captionLines}
              highlightWord={hook.highlightWord}
              fontSize={56} // V2 rule: Subtitle >= 56px
              color={PALETTE.white}
              strokeColor={PALETTE.ink}
              withSolidBacking={true}
              delay={8}
              rotate={1}
              motionPreset={effectiveMotion.textPreset}
            />
          </div>
        )}

        {/* 🖼️ Product Cutout (Enlarged 1.3-1.5x, centered around ~55% height) */}
        <CutoutImage
          id="hook-product-cutout"
          src={imageSrc}
          delay={6}
          baseRotate={-2}
          width={840} // Scaled up 1.4x
          x={0}
          y={40}
          showTape={true}
          motionPreset={effectiveMotion.entryPreset}
          durationInFrames={durationInFrames}
          enableAmbient={effectiveMotion.ambientDrift}
        >
          {/* ⚡ Sub-beat Accent: Clamped sticker relative to product image (Rule E3: max 12px beyond edge, safe non-guarantee wording per E4) */}
          {isSubBeat && (
            <div
              style={{
                position: "absolute",
                top: "12%",
                right: "8px", // Clamped within product image boundary
                backgroundColor: PALETTE.shopeeOrange,
                color: PALETTE.white,
                fontFamily: FONTS.heading,
                fontWeight: 800,
                fontSize: "32px",
                padding: "8px 22px",
                borderRadius: "14px",
                transform: "rotate(6deg)",
                boxShadow: "6px 8px 0px rgba(0,0,0,0.4)",
                border: `3px solid ${PALETTE.white}`,
                whiteSpace: "nowrap",
                zIndex: 30,
              }}
            >
              ✨ ไอเทมเด็ดช้อปปี้
            </div>
          )}
        </CutoutImage>

        {/* 🏹 Hand-drawn Doodles */}
        <Doodle
          id="hook-arrow-doodle"
          type="arrow"
          color={PALETTE.shopeeOrange}
          strokeWidth={8}
          width={160}
          height={160}
          x={-20}
          y={860}
          rotate={15}
          delay={12}
        />

        <Doodle
          id="hook-sparkle-1"
          type="sparkle"
          color={PALETTE.sunnyYellow}
          width={100}
          height={100}
          x={720}
          y={660}
          rotate={15}
          delay={10}
        />

        <Doodle
          id="hook-star-2"
          type="star"
          color={PALETTE.pink}
          width={80}
          height={80}
          x={110}
          y={1180}
          rotate={-20}
          delay={16}
        />
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
