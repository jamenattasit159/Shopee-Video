import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { FONTS } from "../lib/palette";
import { splitSafeThaiLines } from "../lib/thaiKeep";
import { CutoutImage, MediaElement } from "../paper/CutoutImage";
import { Doodle } from "../paper/Doodle";
import { TornStrip } from "../paper/TornStrip";
import { HookData, PackId } from "../types";
import { PACK_MAP } from "../packs";
import { THEME } from "../theme";
import { isVideoMedia } from "../utils";
import {
  HighlightFrame,
  isCollagePackId,
  LineReveal,
  PRODUCT_CARD_STYLE,
  SceneBackground,
  SceneShell,
  SlowZoom,
} from "./SceneMotion";

interface HookSceneProps {
  hook: HookData;
  imageSrc: string;
  primaryColor?: string;
  accentColor?: string;
  packId?: PackId;
  bgColor?: string;
  hideSubtitle?: boolean;
}

export const HookScene: React.FC<HookSceneProps> = ({
  hook,
  imageSrc,
  primaryColor = THEME.colors.accent,
  accentColor = THEME.colors.accent,
  packId = "pro-minimal-luxury",
  bgColor,
  hideSubtitle,
}) => {
  const frame = useCurrentFrame();
  const isSubBeat = frame >= 36;
  const pack = packId && PACK_MAP[packId] ? PACK_MAP[packId] : null;
  const isVideo = isVideoMedia(imageSrc);
  const isUgcOrVideoHook = packId === "pro-ugc-creator" || isVideo;
  const isCollage = isCollagePackId(packId);

  return (
    <AbsoluteFill style={{ overflow: "hidden" }}>
      <SceneBackground
        packId={packId}
        bgColor={bgColor}
        paperTheme={hook.paperTheme}
        accentColor={primaryColor}
      />

      <SceneShell punch>
        {isUgcOrVideoHook ? (
          /* Full-bleed or large cinema framing for video clips & UGC creator pack */
          <AbsoluteFill>
            <SlowZoom>
              <div
                style={{
                  position: "absolute",
                  inset: packId === "pro-ugc-creator" ? "0px" : "150px 56px 360px 56px",
                  borderRadius: packId === "pro-ugc-creator" ? "0px" : "40px",
                  overflow: "hidden",
                  boxShadow: "0 28px 60px rgba(0,0,0,0.55)",
                  border: packId === "pro-ugc-creator" ? "none" : `4px solid ${primaryColor}`,
                  backgroundColor: "#0F172A",
                }}
              >
                <MediaElement
                  src={imageSrc}
                  videoStartSec={hook.videoStartSec}
                  videoEndSec={hook.videoEndSec}
                  videoFillMode={hook.videoFillMode}
                  videoAudioMode={hook.videoAudioMode}
                  style={{ width: "100%", height: "100%", objectFit: "cover" }}
                />
                <div
                  style={{
                    position: "absolute",
                    inset: 0,
                    background:
                      "linear-gradient(180deg, rgba(2,6,23,0.68) 0%, rgba(2,6,23,0.12) 45%, rgba(2,6,23,0.75) 100%)",
                  }}
                />
              </div>
            </SlowZoom>
          </AbsoluteFill>
        ) : (
          <>
            <SlowZoom>
              <CutoutImage
                id="hook-product-cutout"
                src={imageSrc}
                delay={0}
                baseRotate={isCollage ? -2.5 : -1}
                width={840}
                x={0}
                y={40}
                showTape={isCollage}
                videoStartSec={hook.videoStartSec}
                  videoEndSec={hook.videoEndSec}
                  videoFillMode={hook.videoFillMode}
                videoAudioMode={hook.videoAudioMode}
                style={isCollage ? undefined : PRODUCT_CARD_STYLE}
              >
                {isSubBeat && (
                  <div
                    style={{
                      position: "absolute",
                      top: "12%",
                      right: "8px",
                      backgroundColor: primaryColor,
                      color: "#FFFFFF",
                      fontFamily: FONTS.heading,
                      fontWeight: 700,
                      fontSize: "32px",
                      padding: "8px 22px",
                      borderRadius: "16px",
                      transform: "rotate(4deg)",
                      boxShadow: "0 10px 24px rgba(2,6,23,0.5)",
                      whiteSpace: "nowrap",
                      zIndex: 30,
                    }}
                  >
                    ✨ ไอเทมเด็ดช้อปปี้
                  </div>
                )}
              </CutoutImage>
            </SlowZoom>
            <HighlightFrame
              x={150}
              y={700}
              width={720}
              height={600}
              delay={14}
              accentColor={primaryColor}
            />
          </>
        )}

        <AbsoluteFill
          style={{
            paddingTop: "220px",
            paddingBottom: "400px",
            paddingLeft: "70px",
            paddingRight: "180px",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
          }}
        >
          {hook.badgeText && (
            <div style={{ position: "relative", marginBottom: "16px", zIndex: 25 }}>
              {pack?.renderBadge ? (
                pack.renderBadge(hook.badgeText, primaryColor)
              ) : (
                <div
                  style={{
                    backgroundColor: THEME.colors.surfaceRaised,
                    color: "#FFFFFF",
                    border: `2px solid ${primaryColor}`,
                    fontFamily: FONTS.heading,
                    fontWeight: 700,
                    fontSize: "30px",
                    padding: "8px 24px",
                    borderRadius: "999px",
                  }}
                >
                  {hook.badgeText}
                </div>
              )}
            </div>
          )}

          {/* Headline slams in on frame 0 — the 3-second hook */}
          <div style={{ position: "relative", zIndex: 25 }}>
            <TornStrip
              id="hook-headline-strip"
              text={hook.headline}
              lines={hook.headlineLines}
              bg={primaryColor}
              textColor="#FFFFFF"
              fontSize={86}
              rotate={isCollage ? -1.5 : 0}
              delay={0}
              padding="16px 36px"
              style={{ maxWidth: "880px" }}
            />
          </div>

          {hook.subheadline && !hideSubtitle && (
            <div style={{ marginTop: "18px", zIndex: 25 }}>
              <LineReveal
                lines={
                  hook.captionLines && hook.captionLines.length > 0
                    ? hook.captionLines
                    : splitSafeThaiLines(hook.subheadline, 18, 4)
                }
                delay={8}
                accentColor={accentColor}
              />
            </div>
          )}

          <Doodle
            id="hook-sparkle-1"
            type="sparkle"
            color={accentColor}
            width={100}
            height={100}
            x={720}
            y={660}
            rotate={15}
            delay={10}
          />
        </AbsoluteFill>
      </SceneShell>
    </AbsoluteFill>
  );
};
