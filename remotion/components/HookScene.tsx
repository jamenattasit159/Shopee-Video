import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { FONTS } from "../lib/palette";
import { splitSafeThaiLines } from "../lib/thaiKeep";
import { CutoutImage } from "../paper/CutoutImage";
import { Doodle } from "../paper/Doodle";
import { TornStrip } from "../paper/TornStrip";
import { HookData, PackId } from "../types";
import { PACK_MAP } from "../packs";
import { THEME } from "../theme";
import {
  HighlightFrame,
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
  /** Subheadline is already shown by the word-by-word captions */
  hideSubtitle?: boolean;
}

export const HookScene: React.FC<HookSceneProps> = ({
  hook,
  imageSrc,
  primaryColor = THEME.colors.accent,
  accentColor = THEME.colors.accent,
  packId,
  hideSubtitle,
}) => {
  const frame = useCurrentFrame();

  // Sub-beat at ~1.2s (frame 36) - playful shake/pulse
  const isSubBeat = frame >= 36;

  const pack = packId && PACK_MAP[packId] ? PACK_MAP[packId] : null;

  return (
    <AbsoluteFill style={{ overflow: "hidden" }}>
      <SceneBackground />

      <SceneShell punch>
        {/* Product with slow zoom + capture-style highlight frame */}
        <SlowZoom>
          <CutoutImage
            id="hook-product-cutout"
            src={imageSrc}
            delay={0}
            baseRotate={-2}
            width={840}
            x={0}
            y={40}
            style={PRODUCT_CARD_STYLE}
          >
            {isSubBeat && (
              <div
                style={{
                  position: "absolute",
                  top: "12%",
                  right: "8px",
                  backgroundColor: THEME.colors.accent,
                  color: THEME.colors.text,
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
        <HighlightFrame x={150} y={700} width={720} height={600} delay={14} />

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
          {hook.badgeText && (
            <div style={{ position: "relative", marginBottom: "16px", zIndex: 25 }}>
              {pack?.renderBadge ? (
                pack.renderBadge(hook.badgeText, primaryColor)
              ) : (
                <div
                  style={{
                    backgroundColor: THEME.colors.surfaceRaised,
                    color: THEME.colors.accentSoft,
                    border: `2px solid ${THEME.colors.accent}`,
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
              bg={accentColor}
              textColor={THEME.colors.text}
              fontSize={88}
              rotate={-1.5}
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
              />
            </div>
          )}

          <Doodle
            id="hook-sparkle-1"
            type="sparkle"
            color={THEME.colors.accentSoft}
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
