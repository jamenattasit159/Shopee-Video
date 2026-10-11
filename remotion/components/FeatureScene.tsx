import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { FONTS, PALETTE } from "../lib/palette";
import { CutoutImage } from "../paper/CutoutImage";
import { Doodle } from "../paper/Doodle";
import { PaperBackground, PaperTheme } from "../paper/PaperBackground";
import { StickerText } from "../paper/StickerText";
import { TornStrip } from "../paper/TornStrip";
import { WashiTape } from "../paper/WashiTape";
import { PackId, SceneData, SceneLayout } from "../types";
import { renderKeep, splitSafeThaiLines } from "../lib/thaiKeep";

interface FeatureSceneProps {
  scene: SceneData;
  imageSrc: string;
  secondaryImageSrc?: string;
  sceneIndex: number;
  totalScenes: number;
  primaryColor?: string;
  accentColor?: string;
  packId?: PackId;
  bgColor?: string;
}

export const FeatureScene: React.FC<FeatureSceneProps> = ({
  scene,
  imageSrc,
  secondaryImageSrc,
  sceneIndex,
  totalScenes,
  primaryColor = PALETTE.shopeeOrange,
  accentColor = PALETTE.sunnyYellow,
  packId,
  bgColor,
}) => {
  const frame = useCurrentFrame();

  // Layouts: strictly alternate and validate against supported layouts
  const layoutList: SceneLayout[] = ["hero-center", "polaroid-stack", "callout-circle"];
  const currentLayout: SceneLayout =
    scene.layout && layoutList.includes(scene.layout as SceneLayout)
      ? (scene.layout as SceneLayout)
      : layoutList[sceneIndex % layoutList.length];

  // Alternating themes: ensure adjacent scenes have different backgrounds
  const themeList: PaperTheme[] = ["cream-grid", "pastel-mint", "kraft"];
  const paperTheme: PaperTheme = scene.paperTheme || themeList[sceneIndex % themeList.length];

  // Sub-beat every 1.2s (at frame 36 of 30fps)
  const isSubBeat = frame >= 36;

  // RULE A2: Headline ≠ Caption (Never duplicate identical text in same scene)
  let cleanDesc = scene.highlightDesc || "";
  if (cleanDesc.trim() === scene.highlightTitle.trim() || cleanDesc.length === 0) {
    cleanDesc =
      sceneIndex === 0
        ? "วัสดุเกรดพรีเมียม ไอน้ำไม่เกาะโต๊ะ"
        : sceneIndex === 1
        ? "พกพาสะดวก คุมโทนเข้าได้ทุกไลฟ์สไตล์"
        : "จัดโปรพิเศษ คุ้มค่าที่สุดใน Shopee";
  }

  return (
    <AbsoluteFill style={{ overflow: "hidden" }}>
      {/* 📜 1. Paper Background */}
      <PaperBackground theme={paperTheme} packId={packId} bg={bgColor} overlayOpacity={0.11} />

      {/* 🏷️ Step Tag Badge (Rule A2: >= 40px) */}
      <div
        style={{
          position: "absolute",
          top: "190px",
          left: "70px",
          display: "flex",
          alignItems: "center",
          gap: "8px",
          background: PALETTE.ink,
          color: PALETTE.white,
          fontFamily: FONTS.heading,
          fontWeight: 800,
          fontSize: "40px", // Rule A2: Tag >= 40px
          padding: "8px 18px",
          borderRadius: "8px",
          transform: "rotate(-3deg)",
          boxShadow: "3px 5px 0px rgba(0,0,0,0.35)",
          zIndex: 30,
        }}
      >
        <span>POINT {sceneIndex + 1}/{totalScenes}</span>
      </div>

      {/* 🌟 LAYOUT A: Hero Center */}
      {currentLayout === "hero-center" && (
        <AbsoluteFill
          style={{
            paddingTop: "240px",
            paddingBottom: "400px",
            paddingLeft: "70px",
            paddingRight: "140px",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
          }}
        >
          {/* Top Headline on Torn Strip (Rule A2: >= 88px) */}
          <TornStrip
            id={`feat-${sceneIndex}-strip`}
            text={scene.highlightTitle}
            lines={scene.headlineLines}
            bg={accentColor}
            textColor={PALETTE.ink}
            fontSize={88} // Rule A2: >= 88px
            rotate={-2}
            delay={2}
            padding="16px 36px"
            style={{ maxWidth: "880px" }}
          />

          {/* Subtitle / Description (Rule A2: >= 56px with solid backing) */}
          {cleanDesc && (
            <div style={{ marginTop: "16px" }}>
              <StickerText
                id={`feat-${sceneIndex}-desc`}
                text={cleanDesc}
                lines={scene.captionLines}
                highlightWord={scene.highlightWord}
                fontSize={56} // Rule A2: >= 56px
                color={PALETTE.white}
                strokeColor={PALETTE.ink}
                withSolidBacking={true}
                delay={6}
                rotate={1}
              />
            </div>
          )}

          {/* Center Product Cutout (Scale 1.4x, centered at ~55% height) */}
          <CutoutImage
            id={`feat-${sceneIndex}-hero-img`}
            src={imageSrc}
            delay={4}
            baseRotate={-2}
            width={840} // Scaled up 1.4x
            x={0}
            y={50}
            showTape={true}
          >
            {/* Sub-beat 1.2s: Fun Sticker Tag Badge (contained within image boundaries) */}
            {scene.stickerText && (
              <div
                style={{
                  position: "absolute",
                  top: "10%",
                  right: "8px", // Clamped within product image boundary
                  backgroundColor: primaryColor,
                  color: PALETTE.white,
                  fontFamily: FONTS.heading,
                  fontWeight: 800,
                  fontSize: "44px",
                  padding: "10px 24px",
                  borderRadius: "14px",
                  transform: `rotate(${isSubBeat ? 8 : 4}deg)`,
                  boxShadow: "6px 8px 0px rgba(0,0,0,0.4)",
                  border: `3px solid ${PALETTE.white}`,
                  whiteSpace: "nowrap",
                  zIndex: 28,
                  transition: "transform 0.1s ease",
                }}
              >
                {scene.stickerText}
              </div>
            )}
          </CutoutImage>

          {/* Doodles */}
          <Doodle
            id={`feat-${sceneIndex}-arrow`}
            type="arrow"
            color={PALETTE.shopeeOrange}
            strokeWidth={8}
            width={150}
            height={150}
            x={-10}
            y={880}
            rotate={20}
            delay={10}
          />

          <Doodle
            id={`feat-${sceneIndex}-sparkle`}
            type="sparkle"
            color={PALETTE.sunnyYellow}
            width={90}
            height={90}
            x={750}
            y={700}
            delay={12}
          />
        </AbsoluteFill>
      )}

      {/* 📸 LAYOUT B: Polaroid Stack */}
      {currentLayout === "polaroid-stack" && (
        <AbsoluteFill
          style={{
            paddingTop: "240px",
            paddingBottom: "400px",
            paddingLeft: "70px",
            paddingRight: "140px",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
          }}
        >
          {/* Top Headline Strip (Rule A2: >= 88px) */}
          <TornStrip
            id={`feat-${sceneIndex}-polaroid-title`}
            text={scene.highlightTitle}
            lines={scene.headlineLines}
            bg={PALETTE.sunnyYellow}
            textColor={PALETTE.ink}
            fontSize={88} // Rule A2: >= 88px
            rotate={1.5}
            delay={2}
          />

          {/* Back Polaroid Card (Delay 4f) */}
          <CutoutImage
            id={`feat-${sceneIndex}-pol-back`}
            src={secondaryImageSrc || imageSrc}
            isPolaroid={true}
            polaroidCaption="มุมมองการใช้งานจริง"
            baseRotate={-6}
            width={430}
            x={-120}
            y={10}
            delay={4}
            showTape={true}
          />

          {/* Front Main Polaroid Card (Delay 7f, higher z-index to avoid collision) */}
          <CutoutImage
            id={`feat-${sceneIndex}-pol-front`}
            src={imageSrc}
            isPolaroid={true}
            polaroidCaption="ของจริงสวยมาก ✨"
            baseRotate={isSubBeat ? 4 : 2}
            width={460}
            x={80}
            y={110}
            delay={7}
            showTape={true}
          />

          {/* Bottom Subtitle / Description (Rule A2: >= 56px with solid backing) */}
          <div
            style={{
              position: "absolute",
              bottom: "400px",
              left: "80px",
              right: "150px",
              textAlign: "center",
            }}
          >
            <StickerText
              id={`feat-${sceneIndex}-pol-desc`}
              text={cleanDesc}
              lines={scene.captionLines}
              highlightWord={scene.highlightWord}
              fontSize={56} // Rule A2: >= 56px
              color={PALETTE.white}
              strokeColor={PALETTE.ink}
              withSolidBacking={true}
              delay={10}
            />
          </div>

          <WashiTape
            id={`feat-${sceneIndex}-tape-corner`}
            x={640}
            y={620}
            rotate={-15}
            width={120}
            pattern="dots"
          />
        </AbsoluteFill>
      )}

      {/* 🎯 LAYOUT C: Callout Circle */}
      {currentLayout === "callout-circle" && (
        <AbsoluteFill
          style={{
            paddingTop: "240px",
            paddingBottom: "400px",
            paddingLeft: "70px",
            paddingRight: "140px",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
          }}
        >
          {/* Top Title Strip (Rule A2: >= 88px) */}
          <TornStrip
            id={`feat-${sceneIndex}-callout-title`}
            text={scene.highlightTitle}
            lines={scene.headlineLines}
            bg={accentColor}
            textColor={PALETTE.ink}
            fontSize={88} // Rule A2: >= 88px
            rotate={-1.5}
            delay={2}
          />

          {/* Cutout Product Image centered-right (Scale 1.4x) */}
          <CutoutImage
            id={`feat-${sceneIndex}-callout-img`}
            src={imageSrc}
            delay={4}
            baseRotate={-2}
            width={820}
            x={30}
            y={50}
            showTape={true}
          />

          {/* Hand-Drawn Highlight Circle (Delay 8f, expands slightly at sub-beat) */}
          <Doodle
            id={`feat-${sceneIndex}-circle-doodle`}
            type="circle"
            color={PALETTE.shopeeOrange}
            strokeWidth={10}
            width={isSubBeat ? 360 : 340}
            height={isSubBeat ? 360 : 340}
            x={260}
            y={660}
            rotate={-8}
            delay={8}
          />

          {/* Callout Speech Bubble / Torn Note (Rule A2: >= 56px) with pre-split lines */}
          <div
            style={{
              position: "absolute",
              top: "980px",
              left: "80px",
              maxWidth: "680px",
              backgroundColor: PALETTE.cream,
              border: `4px solid ${PALETTE.ink}`,
              padding: "20px 28px",
              borderRadius: "20px",
              boxShadow: "8px 10px 0px rgba(0,0,0,0.38)",
              transform: `rotate(${isSubBeat ? -4 : -2}deg)`,
              filter: "url(#torn)",
              zIndex: 29,
            }}
          >
            <div
              style={{
                fontFamily: FONTS.heading,
                fontWeight: 800,
                fontSize: "56px", // Rule A2: >= 56px
                color: PALETTE.ink,
                lineHeight: 1.3,
                letterSpacing: "0.01em",
                whiteSpace: "nowrap",
                wordBreak: "keep-all",
                overflowWrap: "normal",
              }}
            >
              {(scene.captionLines && scene.captionLines.length > 0
                ? scene.captionLines
                : splitSafeThaiLines(cleanDesc, 18, 4)
              ).map((l, li) => (
                <div key={li} style={{ whiteSpace: "nowrap" }}>
                  {li === 0 ? `👉 ` : ""}
                  {renderKeep(l)}
                </div>
              ))}
            </div>
          </div>

          {/* Sparkles */}
          <Doodle
            id={`feat-${sceneIndex}-sparkle-c`}
            type="sparkle"
            color={PALETTE.sunnyYellow}
            width={90}
            height={90}
            x={100}
            y={520}
            delay={8}
          />
          <Doodle
            id={`feat-${sceneIndex}-star-c`}
            type="star"
            color={PALETTE.pink}
            width={80}
            height={80}
            x={760}
            y={1060}
            delay={12}
          />
        </AbsoluteFill>
      )}
    </AbsoluteFill>
  );
};
