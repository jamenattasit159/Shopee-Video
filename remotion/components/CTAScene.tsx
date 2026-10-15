import React from "react";
import { AbsoluteFill, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { FONTS } from "../lib/palette";
import { splitSafeThaiLines } from "../lib/thaiKeep";
import { CartCTA } from "../paper/CartCTA";
import { CutoutImage } from "../paper/CutoutImage";
import { TornStrip } from "../paper/TornStrip";
import { CTAData, PackId } from "../types";
import { THEME } from "../theme";
import {
  isCollagePackId,
  LineReveal,
  PRODUCT_CARD_STYLE,
  SceneBackground,
  SceneShell,
  SlowZoom,
} from "./SceneMotion";

interface CTASceneProps {
  cta: CTAData;
  imageSrc: string;
  price: string;
  productName?: string;
  primaryColor?: string;
  accentColor?: string;
  packId?: PackId;
  bgColor?: string;
  hideSubtitle?: boolean;
}

export const CTAScene: React.FC<CTASceneProps> = ({
  cta,
  imageSrc,
  price,
  productName,
  primaryColor = THEME.colors.accent,
  accentColor = THEME.colors.accent,
  packId = "pro-minimal-luxury",
  bgColor,
  hideSubtitle,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const isCollage = isCollagePackId(packId);

  const priceIn = spring({ frame: frame - 6, fps, config: { damping: 9, stiffness: 180, mass: 0.7 } });
  const pricePulse = 1 + Math.max(0, Math.sin((frame - 20) / 6)) * 0.03;

  return (
    <AbsoluteFill style={{ overflow: "hidden" }}>
      <SceneBackground
        glowY="60%"
        packId={packId}
        bgColor={bgColor}
        paperTheme={cta.paperTheme}
        accentColor={primaryColor}
      />

      <SceneShell>
        <SlowZoom>
          <CutoutImage
            id="cta-product-cutout"
            src={imageSrc}
            delay={4}
            baseRotate={isCollage ? -3 : -1}
            width={760}
            x={60}
            y={40}
            showTape={isCollage}
            videoStartSec={cta.videoStartSec}
                  videoEndSec={cta.videoEndSec}
                  videoFillMode={cta.videoFillMode}
            videoAudioMode={cta.videoAudioMode}
            style={isCollage ? undefined : PRODUCT_CARD_STYLE}
          />
        </SlowZoom>

        <AbsoluteFill
          style={{
            paddingTop: "190px",
            paddingBottom: "380px",
            paddingLeft: "70px",
            paddingRight: "180px",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
          }}
        >
          <div
            style={{
              marginBottom: "16px",
              backgroundColor: "rgba(15, 23, 42, 0.9)",
              color: "#FFFFFF",
              border: `2px solid ${primaryColor}`,
              fontFamily: FONTS.heading,
              fontWeight: 700,
              fontSize: "30px",
              padding: "8px 24px",
              borderRadius: "999px",
              zIndex: 25,
            }}
          >
            {cta.badgeText || "⚡ สิทธิ์มีจำนวนจำกัด"}
          </div>

          <div style={{ position: "relative", zIndex: 25 }}>
            <TornStrip
              id="cta-main-title"
              text={cta.ctaTitle || "จิ้มตะกร้าส้มซ้ายล่างเลย!"}
              lines={cta.headlineLines}
              bg={primaryColor}
              textColor="#FFFFFF"
              fontSize={86}
              rotate={isCollage ? -1 : 0}
              delay={2}
              padding="16px 36px"
              style={{ maxWidth: "880px" }}
            />
          </div>

          {cta.ctaSubtitle && !hideSubtitle && (
            <div style={{ marginTop: "18px", zIndex: 25 }}>
              <LineReveal
                lines={
                  cta.captionLines && cta.captionLines.length > 0
                    ? cta.captionLines
                    : splitSafeThaiLines(cta.ctaSubtitle, 18, 4)
                }
                delay={8}
                accentColor={accentColor}
              />
            </div>
          )}

          {/* Price card */}
          <div
            style={{
              position: "absolute",
              left: "86px",
              top: "800px",
              padding: "20px 36px 24px",
              borderRadius: "28px",
              backgroundColor: "rgba(15, 23, 42, 0.94)",
              border: `4px solid ${primaryColor}`,
              boxShadow: `0 0 48px ${primaryColor}55, 0 16px 32px rgba(2,6,23,0.6)`,
              transform: `rotate(-3deg) scale(${priceIn * pricePulse})`,
              transformOrigin: "left center",
              zIndex: 26,
            }}
          >
            <div
              style={{
                fontFamily: FONTS.heading,
                fontWeight: 700,
                fontSize: "32px",
                color: "#FDE047",
              }}
            >
              🏷️ ราคาพิเศษวันนี้
            </div>
            <div
              style={{
                fontFamily: FONTS.heading,
                fontWeight: 800,
                fontSize: "120px",
                lineHeight: 1.05,
                color: "#FFFFFF",
                textShadow: `0 0 28px ${primaryColor}`,
              }}
            >
              {price}
            </div>
          </div>

          {/* Points at the real Shopee basket */}
          <CartCTA
            productName={productName}
            price={price}
            buttonText={cta.buttonText || "ช้อปเลยที่ Shopee"}
            delay={8}
          />
        </AbsoluteFill>
      </SceneShell>
    </AbsoluteFill>
  );
};
