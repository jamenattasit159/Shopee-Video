import React from "react";
import { AbsoluteFill, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { FONTS } from "../lib/palette";
import { CutoutImage } from "../paper/CutoutImage";
import { TornStrip } from "../paper/TornStrip";
import { PackId, SceneData, SceneLayout } from "../types";
import { splitSafeThaiLines } from "../lib/thaiKeep";
import { THEME } from "../theme";
import {
  HighlightFrame,
  LineReveal,
  PRODUCT_CARD_STYLE,
  SceneBackground,
  SceneShell,
  SlowZoom,
} from "./SceneMotion";

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
  /** Description is already shown by the word-by-word captions */
  hideSubtitle?: boolean;
}

const CONTENT_PADDING: React.CSSProperties = {
  paddingTop: "260px",
  paddingBottom: "400px",
  paddingLeft: "70px",
  paddingRight: "140px",
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
};

export const FeatureScene: React.FC<FeatureSceneProps> = ({
  scene,
  imageSrc,
  secondaryImageSrc,
  sceneIndex,
  totalScenes,
  primaryColor = THEME.colors.accent,
  accentColor = THEME.colors.accent,
  hideSubtitle,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const layoutList: SceneLayout[] = ["hero-center", "polaroid-stack", "callout-circle"];
  const currentLayout: SceneLayout =
    scene.layout && layoutList.includes(scene.layout as SceneLayout)
      ? (scene.layout as SceneLayout)
      : layoutList[sceneIndex % layoutList.length];

  // Sticker pops in at the 1.2s sub-beat
  const stickerPop = spring({ frame: frame - 36, fps, config: { damping: 10, stiffness: 200 } });

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
  const descLines =
    scene.captionLines && scene.captionLines.length > 0 ? scene.captionLines : splitSafeThaiLines(cleanDesc, 18, 4);

  const headline = (
    <div style={{ position: "relative", zIndex: 25 }}>
      <TornStrip
        id={`feat-${sceneIndex}-strip`}
        text={scene.highlightTitle}
        lines={scene.headlineLines}
        bg={accentColor}
        textColor={THEME.colors.text}
        fontSize={88}
        rotate={sceneIndex % 2 === 0 ? -1.5 : 1.5}
        delay={2}
        padding="16px 36px"
        style={{ maxWidth: "880px" }}
      />
    </div>
  );

  const sticker = scene.stickerText && frame >= 36 && (
    <div
      style={{
        position: "absolute",
        top: "10%",
        right: "8px",
        backgroundColor: primaryColor,
        color: THEME.colors.text,
        fontFamily: FONTS.heading,
        fontWeight: 700,
        fontSize: "44px",
        padding: "10px 24px",
        borderRadius: "16px",
        transform: `rotate(4deg) scale(${stickerPop})`,
        boxShadow: "0 10px 24px rgba(2,6,23,0.5)",
        whiteSpace: "nowrap",
        zIndex: 28,
      }}
    >
      {scene.stickerText}
    </div>
  );

  return (
    <AbsoluteFill style={{ overflow: "hidden" }}>
      <SceneBackground />

      <SceneShell>
        {/* Step tag */}
        <div
          style={{
            position: "absolute",
            top: "180px",
            left: "70px",
            display: "flex",
            alignItems: "center",
            gap: "12px",
            fontFamily: FONTS.heading,
            fontWeight: 700,
            fontSize: "40px",
            color: THEME.colors.textMuted,
            zIndex: 30,
          }}
        >
          <span
            style={{
              backgroundColor: THEME.colors.accent,
              color: THEME.colors.text,
              padding: "4px 18px",
              borderRadius: "12px",
            }}
          >
            POINT {sceneIndex + 1}/{totalScenes}
          </span>
        </div>

        {currentLayout === "hero-center" && (
          <>
            <SlowZoom>
              <CutoutImage
                id={`feat-${sceneIndex}-hero-img`}
                src={imageSrc}
                delay={4}
                baseRotate={-2}
                width={840}
                x={0}
                y={50}
                style={PRODUCT_CARD_STYLE}
              >
                {sticker}
              </CutoutImage>
            </SlowZoom>
            <HighlightFrame x={160} y={760} width={700} height={560} delay={12} />
            <AbsoluteFill style={CONTENT_PADDING}>
              {headline}
              {!hideSubtitle && (
                <div style={{ marginTop: "16px", zIndex: 25 }}>
                  <LineReveal lines={descLines} delay={8} />
                </div>
              )}
            </AbsoluteFill>
          </>
        )}

        {currentLayout === "polaroid-stack" && (
          <>
            <SlowZoom direction={-1}>
              <CutoutImage
                id={`feat-${sceneIndex}-pol-back`}
                src={secondaryImageSrc || imageSrc}
                isPolaroid={true}
                polaroidCaption="มุมมองการใช้งานจริง"
                baseRotate={-6}
                width={430}
                x={-120}
                y={-60}
                delay={4}
                style={{ background: THEME.colors.text, borderRadius: 24 }}
              />
              <CutoutImage
                id={`feat-${sceneIndex}-pol-front`}
                src={imageSrc}
                isPolaroid={true}
                polaroidCaption="ของจริงสวยมาก ✨"
                baseRotate={frame >= 36 ? 4 : 2}
                width={460}
                x={80}
                y={40}
                delay={7}
                style={{ background: THEME.colors.text, borderRadius: 24 }}
              />
            </SlowZoom>
            <AbsoluteFill style={CONTENT_PADDING}>
              {headline}
              {!hideSubtitle && (
                <div style={{ position: "absolute", bottom: "420px", left: "80px", right: "150px", textAlign: "center" }}>
                  <LineReveal lines={descLines} delay={10} />
                </div>
              )}
            </AbsoluteFill>
          </>
        )}

        {currentLayout === "callout-circle" && (
          <>
            <SlowZoom>
              <CutoutImage
                id={`feat-${sceneIndex}-callout-img`}
                src={imageSrc}
                delay={4}
                baseRotate={-2}
                width={820}
                x={30}
                y={50}
                style={PRODUCT_CARD_STYLE}
              />
            </SlowZoom>
            {/* Capture-style focus box replaces the hand-drawn circle */}
            <HighlightFrame
              x={300}
              y={640}
              width={460}
              height={420}
              delay={8}
              label={scene.highlightWord || undefined}
            />
            <AbsoluteFill style={CONTENT_PADDING}>
              {headline}
              {!hideSubtitle && (
                <div style={{ position: "absolute", top: "1100px", left: "80px", zIndex: 29 }}>
                  <LineReveal
                    lines={descLines.map((l, li) => (li === 0 ? `👉 ${l}` : l))}
                    delay={10}
                    fontSize={56}
                    style={{ alignItems: "flex-start", color: THEME.colors.text }}
                  />
                </div>
              )}
            </AbsoluteFill>
          </>
        )}
      </SceneShell>
    </AbsoluteFill>
  );
};

