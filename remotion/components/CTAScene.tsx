import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { FONTS, PALETTE } from "../lib/palette";
import { CartCTA } from "../paper/CartCTA";
import { CutoutImage } from "../paper/CutoutImage";
import { Doodle } from "../paper/Doodle";
import { PaperBackground } from "../paper/PaperBackground";
import { PriceBurst } from "../paper/PriceBurst";
import { StickerText } from "../paper/StickerText";
import { TornStrip } from "../paper/TornStrip";
import { WashiTape } from "../paper/WashiTape";
import { CTAData } from "../types";

interface CTASceneProps {
  cta: CTAData;
  imageSrc: string;
  price: string;
  productName?: string;
  primaryColor?: string;
  accentColor?: string;
}

export const CTAScene: React.FC<CTASceneProps> = ({
  cta,
  imageSrc,
  price,
  productName,
  primaryColor = PALETTE.shopeeOrange,
  accentColor = PALETTE.sunnyYellow,
}) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();

  // Rule: Last 6 frames hold static for comfortable reading by the user
  const isLastHold = frame >= durationInFrames - 6;

  return (
    <AbsoluteFill style={{ overflow: "hidden" }}>
      {/* 🟠 1. Shopee Orange Halftone Paper Background */}
      <PaperBackground theme="halftone-orange" overlayOpacity={0.16} />

      {/* Main Safe Zone Layout */}
      <AbsoluteFill
        style={{
          paddingTop: "200px",
          paddingBottom: "380px",
          paddingLeft: "70px",
          paddingRight: "140px",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
        }}
      >
        {/* 🏷️ Top Urgent Badge: "⚡ จำนวนจำกัด" with Washi Tape */}
        <div style={{ position: "relative", marginBottom: "16px" }}>
          <WashiTape
            id="cta-urgent-tape"
            x={-15}
            y={-12}
            rotate={-4}
            width={110}
            height={32}
            color="rgba(255, 255, 255, 0.9)"
          />
          <div
            style={{
              backgroundColor: PALETTE.ink,
              color: PALETTE.sunnyYellow,
              fontFamily: FONTS.heading,
              fontWeight: 800,
              fontSize: "30px", // Badge >= 30-40px
              padding: "8px 24px",
              borderRadius: "10px",
              transform: "rotate(-2deg)",
              boxShadow: "4px 6px 0px rgba(0,0,0,0.4)",
              border: `2px solid ${PALETTE.white}`,
            }}
          >
            {cta.badgeText || "⚡ สิทธิ์มีจำนวนจำกัด"}
          </div>
        </div>

        {/* 💥 Main Headline: "กดตะกร้าส้มซ้ายล่างเลย!" on Slap Torn Strip (Rule A2: >= 88px) */}
        <TornStrip
          id="cta-main-title"
          text={cta.ctaTitle || "จิ้มตะกร้าส้มซ้ายล่างเลย!"}
          bg={accentColor}
          textColor={PALETTE.ink}
          fontSize={88} // Rule A2: >= 88px
          rotate={-1}
          delay={2}
          padding="16px 36px"
          style={{ maxWidth: "900px" }}
        />

        {/* 🎁 Subtitle incentive (Rule A2: >= 56px with solid backing) */}
        {cta.ctaSubtitle && (
          <div style={{ marginTop: "18px" }}>
            <StickerText
              id="cta-subtitle-sticker"
              text={cta.ctaSubtitle}
              fontSize={56} // Rule A2: >= 56px
              color={PALETTE.white}
              strokeColor={PALETTE.ink}
              withSolidBacking={true}
              delay={6}
              rotate={1}
            />
          </div>
        )}

        {/* 🖼️ Product Cutout (Scale 1.4x) positioned behind the price burst */}
        <CutoutImage
          id="cta-product-cutout"
          src={imageSrc}
          delay={4}
          baseRotate={-3}
          width={840} // Scaled up 1.4x
          x={60}
          y={40}
          showTape={true}
        />

        {/* 💥 Starburst Price Burst Badge (HERO PRICE >= 120px, size 500px) */}
        <PriceBurst
          id="cta-price-burst"
          price={price}
          badge="🏷️ ราคาพิเศษวันนี้"
          size={500}
          x={40}
          y={780}
          rotate={-5}
          delay={6}
        />

        {/* 🛒 Integrated CartCTA pointing directly to the orange basket (Safe Zone bottom-left) */}
        <CartCTA
          productName={productName}
          price={price}
          buttonText={cta.buttonText || "ช้อปเลยที่ Shopee"}
          delay={8}
        />

        {/* Hand-drawn Sparkles and Doodles around CTA */}
        <Doodle
          id="cta-sparkle-1"
          type="sparkle"
          color={PALETTE.sunnyYellow}
          width={120}
          height={120}
          x={720}
          y={660}
          delay={8}
        />
        <Doodle
          id="cta-star-1"
          type="star"
          color={PALETTE.white}
          width={90}
          height={90}
          x={90}
          y={620}
          delay={10}
        />
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
