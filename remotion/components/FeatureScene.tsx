import React from "react";
import { AbsoluteFill, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { FONTS } from "../lib/palette";
import { CutoutImage, MediaElement } from "../paper/CutoutImage";
import { TornStrip } from "../paper/TornStrip";
import { PackId, SceneData, SceneLayout } from "../types";
import { splitSafeThaiLines, renderKeep } from "../lib/thaiKeep";
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
  hideSubtitle?: boolean;
}

const CONTENT_PADDING: React.CSSProperties = {
  paddingTop: "240px",
  paddingBottom: "400px",
  paddingLeft: "70px",
  paddingRight: "180px",
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
};

const ALL_LAYOUT_ROTATION: SceneLayout[] = [
  "fullscreen-broll",
  "split-showcase",
  "bento-grid",
  "magazine-editorial",
  "hero-center",
  "polaroid-stack",
  "callout-circle",
];

export const FeatureScene: React.FC<FeatureSceneProps> = ({
  scene,
  imageSrc,
  secondaryImageSrc,
  sceneIndex,
  totalScenes,
  primaryColor = THEME.colors.accent,
  accentColor = THEME.colors.accent,
  packId = "pro-minimal-luxury",
  bgColor,
  hideSubtitle,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const isCollage = isCollagePackId(packId);
  const isVideo = isVideoMedia(imageSrc);

  // Choose layout: if user/AI specified a valid layout, honor it; if video clip & default layout, prefer fullscreen-broll or split-showcase
  let currentLayout: SceneLayout =
    scene.layout && ALL_LAYOUT_ROTATION.includes(scene.layout as SceneLayout)
      ? (scene.layout as SceneLayout)
      : ALL_LAYOUT_ROTATION[sceneIndex % ALL_LAYOUT_ROTATION.length];

  if (isVideo && !scene.layout) {
    currentLayout = sceneIndex % 2 === 0 ? "fullscreen-broll" : "split-showcase";
  }

  const stickerPop = spring({ frame: frame - 24, fps, config: { damping: 10, stiffness: 200 } });

  let cleanDesc = scene.highlightDesc || "";
  if (cleanDesc.trim() === scene.highlightTitle.trim() || cleanDesc.length === 0) {
    cleanDesc =
      sceneIndex === 0
        ? "วัสดุเกรดพรีเมียม ใช้งานจริงประทับใจ"
        : sceneIndex === 1
        ? "พกพาสะดวก คุมโทนเข้าได้ทุกไลฟ์สไตล์"
        : "จัดโปรพิเศษ คุ้มค่าที่สุดใน Shopee";
  }
  const descLines =
    scene.captionLines && scene.captionLines.length > 0
      ? scene.captionLines
      : splitSafeThaiLines(cleanDesc, 18, 4);

  const headline = (
    <div style={{ position: "relative", zIndex: 25 }}>
      <TornStrip
        id={`feat-${sceneIndex}-strip`}
        text={scene.highlightTitle}
        lines={scene.headlineLines}
        bg={primaryColor}
        textColor="#FFFFFF"
        fontSize={82}
        rotate={isCollage ? (sceneIndex % 2 === 0 ? -1.5 : 1.5) : 0}
        delay={2}
        padding="14px 34px"
        style={{ maxWidth: "880px" }}
      />
    </div>
  );

  const stickerBadge = scene.stickerText && (
    <div
      style={{
        backgroundColor: accentColor,
        color: "#FFFFFF",
        fontFamily: FONTS.heading,
        fontWeight: 800,
        fontSize: "40px",
        padding: "10px 26px",
        borderRadius: "18px",
        transform: `rotate(3deg) scale(${Math.max(0, stickerPop)})`,
        boxShadow: "0 12px 28px rgba(2,6,23,0.45)",
        border: "3px solid #FFFFFF",
        whiteSpace: "nowrap",
        zIndex: 32,
      }}
    >
      {scene.stickerText}
    </div>
  );

  return (
    <AbsoluteFill style={{ overflow: "hidden" }}>
      <SceneBackground
        packId={packId}
        bgColor={bgColor}
        paperTheme={scene.paperTheme}
        accentColor={primaryColor}
      />

      <SceneShell>
        {/* Top Step Indicator */}
        <div
          style={{
            position: "absolute",
            top: "220px",
            left: "70px",
            display: "flex",
            alignItems: "center",
            gap: "12px",
            fontFamily: FONTS.heading,
            fontWeight: 800,
            fontSize: "34px",
            zIndex: 35,
          }}
        >
          <span
            style={{
              backgroundColor: primaryColor,
              color: "#FFFFFF",
              padding: "6px 22px",
              borderRadius: "999px",
              boxShadow: "0 8px 20px rgba(0,0,0,0.3)",
              border: "2px solid rgba(255,255,255,0.6)",
            }}
          >
            ไฮไลต์ {sceneIndex + 1}/{totalScenes}
          </span>
          {isVideo && (
            <span
              style={{
                backgroundColor: "rgba(15, 23, 42, 0.85)",
                color: "#38BDF8",
                padding: "6px 18px",
                borderRadius: "999px",
                fontSize: "28px",
                border: "1.5px solid rgba(56, 189, 248, 0.5)",
              }}
            >
              🎬 คลิปของจริง
            </span>
          )}
        </div>

        {/* LAYOUT 1: FULLSCREEN B-ROLL (Ideal for real product video clips or immersive photos) */}
        {currentLayout === "fullscreen-broll" && (
          <>
            <SlowZoom>
              <div
                style={{
                  position: "absolute",
                  inset: "125px 48px 340px 48px",
                  borderRadius: "42px",
                  overflow: "hidden",
                  boxShadow: "0 28px 64px rgba(0,0,0,0.55)",
                  border: `4px solid ${primaryColor}`,
                  backgroundColor: "#0F172A",
                }}
              >
                <MediaElement
                  src={imageSrc}
                  videoStartSec={scene.videoStartSec}
                  videoEndSec={scene.videoEndSec}
                  videoFillMode={scene.videoFillMode}
                  videoAudioMode={scene.videoAudioMode}
                  style={{ width: "100%", height: "100%", objectFit: "cover" }}
                />
                <div
                  style={{
                    position: "absolute",
                    inset: 0,
                    background:
                      "linear-gradient(180deg, rgba(2,6,23,0.6) 0%, transparent 40%, rgba(2,6,23,0.82) 100%)",
                  }}
                />
              </div>
            </SlowZoom>
            {scene.stickerText && (
              <div style={{ position: "absolute", top: "220px", right: "180px", zIndex: 35 }}>
                {stickerBadge}
              </div>
            )}
            <AbsoluteFill style={{ ...CONTENT_PADDING, justifyContent: "space-between", paddingBottom: "430px" }}>
              <div style={{ marginTop: "10px" }}>{headline}</div>
              {!hideSubtitle && (
                <LineReveal
                  lines={descLines}
                  delay={8}
                  accentColor={primaryColor}
                  style={{
                    backgroundColor: "rgba(15, 23, 42, 0.88)",
                    backdropFilter: "blur(12px)",
                  }}
                />
              )}
            </AbsoluteFill>
          </>
        )}

        {/* LAYOUT 2: SPLIT SHOWCASE (Top large showcase + Picture-in-Picture secondary angle + Bottom feature card) */}
        {currentLayout === "split-showcase" && (
          <>
            <div
              style={{
                position: "absolute",
                top: "220px",
                left: "68px",
                right: "180px",
                height: "760px",
                borderRadius: "38px",
                overflow: "hidden",
                backgroundColor: "#0F172A",
                border: `4px solid ${primaryColor}`,
                boxShadow: "0 24px 50px rgba(0,0,0,0.45)",
                zIndex: 15,
              }}
            >
              <MediaElement
                src={imageSrc}
                videoStartSec={scene.videoStartSec}
                  videoEndSec={scene.videoEndSec}
                  videoFillMode={scene.videoFillMode}
                videoAudioMode={scene.videoAudioMode}
                style={{ width: "100%", height: "100%", objectFit: "cover" }}
              />
            </div>

            {/* Secondary angle PiP badge */}
            {secondaryImageSrc && secondaryImageSrc !== imageSrc && (
              <div
                style={{
                  position: "absolute",
                  top: "740px",
                  right: "110px",
                  width: "260px",
                  height: "260px",
                  borderRadius: "28px",
                  overflow: "hidden",
                  border: "5px solid #FFFFFF",
                  boxShadow: "0 18px 38px rgba(0,0,0,0.5)",
                  backgroundColor: "#FFFFFF",
                  transform: "rotate(4deg)",
                  zIndex: 26,
                }}
              >
                <MediaElement
                  src={secondaryImageSrc}
                  style={{ width: "100%", height: "100%", objectFit: "cover" }}
                />
              </div>
            )}

            {/* Bottom Showcase Info Card */}
            <div
              style={{
                position: "absolute",
                top: "1020px",
                left: "68px",
                right: "180px",
                padding: "32px 36px",
                borderRadius: "34px",
                backgroundColor: "rgba(15, 23, 42, 0.94)",
                border: `3px solid ${primaryColor}`,
                boxShadow: "0 20px 44px rgba(0,0,0,0.45)",
                zIndex: 25,
                display: "flex",
                flexDirection: "column",
                alignItems: "flex-start",
                gap: "16px",
              }}
            >
              {scene.stickerText && (
                <span
                  style={{
                    backgroundColor: accentColor,
                    color: "#FFFFFF",
                    fontSize: "30px",
                    fontWeight: 800,
                    padding: "6px 20px",
                    borderRadius: "999px",
                  }}
                >
                  {scene.stickerText}
                </span>
              )}
              <div
                style={{
                  fontFamily: FONTS.heading,
                  fontSize: "64px",
                  fontWeight: 800,
                  lineHeight: 1.2,
                  color: "#FFFFFF",
                }}
              >
                {renderKeep(scene.highlightTitle)}
              </div>
              {!hideSubtitle && (
                <div
                  style={{
                    fontFamily: FONTS.body,
                    fontSize: "42px",
                    fontWeight: 600,
                    lineHeight: 1.35,
                    color: "#CBD5E1",
                  }}
                >
                  {descLines.map((l, i) => (
                    <div key={i}>✓ {renderKeep(l)}</div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}

        {/* LAYOUT 3: BENTO GRID (Modern Multi-Angle Bento Showcase) */}
        {currentLayout === "bento-grid" && (
          <>
            <div style={{ position: "absolute", top: "220px", left: "70px", right: "180px", zIndex: 25 }}>
              {headline}
            </div>

            <div
              style={{
                position: "absolute",
                top: "430px",
                left: "70px",
                right: "180px",
                height: "960px",
                display: "grid",
                gridTemplateColumns: "1.15fr 0.85fr",
                gridTemplateRows: "1.2fr 0.8fr",
                gap: "22px",
                zIndex: 20,
              }}
            >
              {/* Main Left Cell (spans 2 rows) */}
              <div
                style={{
                  gridRow: "1 / span 2",
                  borderRadius: "34px",
                  overflow: "hidden",
                  border: `4px solid ${primaryColor}`,
                  backgroundColor: "#FFFFFF",
                  boxShadow: "0 18px 40px rgba(0,0,0,0.35)",
                  position: "relative",
                }}
              >
                <MediaElement
                  src={imageSrc}
                  videoStartSec={scene.videoStartSec}
                  videoEndSec={scene.videoEndSec}
                  videoFillMode={scene.videoFillMode}
                  videoAudioMode={scene.videoAudioMode}
                  style={{ width: "100%", height: "100%", objectFit: "cover" }}
                />
              </div>

              {/* Top Right Cell (Secondary image) */}
              <div
                style={{
                  borderRadius: "30px",
                  overflow: "hidden",
                  border: "3px solid rgba(255,255,255,0.7)",
                  backgroundColor: "#FFFFFF",
                  boxShadow: "0 14px 32px rgba(0,0,0,0.3)",
                }}
              >
                <MediaElement
                  src={secondaryImageSrc || imageSrc}
                  style={{ width: "100%", height: "100%", objectFit: "cover" }}
                />
              </div>

              {/* Bottom Right Cell (Feature Summary Bento Card) */}
              <div
                style={{
                  borderRadius: "30px",
                  backgroundColor: primaryColor,
                  color: "#FFFFFF",
                  padding: "24px",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "center",
                  boxShadow: "0 14px 32px rgba(0,0,0,0.35)",
                }}
              >
                <div style={{ fontSize: "34px", fontWeight: 800, marginBottom: "10px" }}>
                  {scene.stickerText || "✨ จุดเด่นห้ามพลาด"}
                </div>
                <div style={{ fontSize: "36px", fontWeight: 700, lineHeight: 1.3 }}>
                  {descLines.map((l, i) => (
                    <div key={i}>{renderKeep(l)}</div>
                  ))}
                </div>
              </div>
            </div>
          </>
        )}

        {/* LAYOUT 4: MAGAZINE EDITORIAL (Arched luxury showcase frame + editorial typography) */}
        {currentLayout === "magazine-editorial" && (
          <>
            <SlowZoom>
              <div
                style={{
                  position: "absolute",
                  top: "380px",
                  left: "110px",
                  width: "760px",
                  height: "920px",
                  borderRadius: "380px 380px 44px 44px",
                  overflow: "hidden",
                  border: `6px solid #FFFFFF`,
                  boxShadow: "0 28px 60px rgba(0,0,0,0.45)",
                  backgroundColor: "#FFFFFF",
                  zIndex: 15,
                }}
              >
                <MediaElement
                  src={imageSrc}
                  videoStartSec={scene.videoStartSec}
                  videoEndSec={scene.videoEndSec}
                  videoFillMode={scene.videoFillMode}
                  videoAudioMode={scene.videoAudioMode}
                  style={{ width: "100%", height: "100%", objectFit: "cover" }}
                />
              </div>
            </SlowZoom>
            {scene.stickerText && (
              <div style={{ position: "absolute", top: "420px", right: "110px", zIndex: 32 }}>
                {stickerBadge}
              </div>
            )}
            <AbsoluteFill style={CONTENT_PADDING}>
              {headline}
              {!hideSubtitle && (
                <div style={{ position: "absolute", bottom: "430px", left: "80px", right: "180px", zIndex: 28 }}>
                  <LineReveal lines={descLines} delay={8} accentColor={primaryColor} />
                </div>
              )}
            </AbsoluteFill>
          </>
        )}

        {/* LAYOUT 5: HERO CENTER */}
        {currentLayout === "hero-center" && (
          <>
            <SlowZoom>
              <CutoutImage
                id={`feat-${sceneIndex}-hero-img`}
                src={imageSrc}
                delay={4}
                baseRotate={isCollage ? -2 : 0}
                width={840}
                x={0}
                y={50}
                showTape={isCollage}
                videoStartSec={scene.videoStartSec}
                  videoEndSec={scene.videoEndSec}
                  videoFillMode={scene.videoFillMode}
                videoAudioMode={scene.videoAudioMode}
                style={isCollage ? undefined : PRODUCT_CARD_STYLE}
              >
                {scene.stickerText && (
                  <div style={{ position: "absolute", top: "8%", right: "8px", zIndex: 30 }}>
                    {stickerBadge}
                  </div>
                )}
              </CutoutImage>
            </SlowZoom>
            <HighlightFrame
              x={160}
              y={760}
              width={700}
              height={560}
              delay={12}
              accentColor={primaryColor}
            />
            <AbsoluteFill style={CONTENT_PADDING}>
              {headline}
              {!hideSubtitle && (
                <div style={{ marginTop: "16px", zIndex: 25 }}>
                  <LineReveal lines={descLines} delay={8} accentColor={primaryColor} />
                </div>
              )}
            </AbsoluteFill>
          </>
        )}

        {/* LAYOUT 6: POLAROID STACK */}
        {currentLayout === "polaroid-stack" && (
          <>
            <SlowZoom direction={-1}>
              <CutoutImage
                id={`feat-${sceneIndex}-pol-back`}
                src={secondaryImageSrc || imageSrc}
                isPolaroid={true}
                polaroidCaption="มุมมองการใช้งานจริง"
                baseRotate={-6}
                width={440}
                x={-120}
                y={-50}
                delay={4}
                showTape={isCollage}
                style={{ background: "#FFFFFF", borderRadius: 24 }}
              />
              <CutoutImage
                id={`feat-${sceneIndex}-pol-front`}
                src={imageSrc}
                isPolaroid={true}
                polaroidCaption={scene.stickerText || "ของจริงสวยตรงปก ✨"}
                baseRotate={frame >= 36 ? 4 : 2}
                width={470}
                x={85}
                y={45}
                delay={7}
                showTape={isCollage}
                videoStartSec={scene.videoStartSec}
                  videoEndSec={scene.videoEndSec}
                  videoFillMode={scene.videoFillMode}
                videoAudioMode={scene.videoAudioMode}
                style={{ background: "#FFFFFF", borderRadius: 24 }}
              />
            </SlowZoom>
            <AbsoluteFill style={CONTENT_PADDING}>
              {headline}
              {!hideSubtitle && (
                <div style={{ position: "absolute", bottom: "420px", left: "80px", right: "150px", textAlign: "center" }}>
                  <LineReveal lines={descLines} delay={10} accentColor={primaryColor} />
                </div>
              )}
            </AbsoluteFill>
          </>
        )}

        {/* LAYOUT 7: CALLOUT CIRCLE / DETAIL FOCUS */}
        {currentLayout === "callout-circle" && (
          <>
            <SlowZoom>
              <CutoutImage
                id={`feat-${sceneIndex}-callout-img`}
                src={imageSrc}
                delay={4}
                baseRotate={isCollage ? -2 : 0}
                width={820}
                x={30}
                y={50}
                showTape={isCollage}
                videoStartSec={scene.videoStartSec}
                  videoEndSec={scene.videoEndSec}
                  videoFillMode={scene.videoFillMode}
                videoAudioMode={scene.videoAudioMode}
                style={isCollage ? undefined : PRODUCT_CARD_STYLE}
              />
            </SlowZoom>
            <HighlightFrame
              x={280}
              y={640}
              width={480}
              height={420}
              delay={8}
              label={scene.highlightWord || scene.stickerText || undefined}
              accentColor={primaryColor}
            />
            <AbsoluteFill style={CONTENT_PADDING}>
              {headline}
              {!hideSubtitle && (
                <div style={{ position: "absolute", top: "1100px", left: "80px", zIndex: 29 }}>
                  <LineReveal
                    lines={descLines.map((l, li) => (li === 0 ? `👉 ${l}` : l))}
                    delay={10}
                    fontSize={52}
                    accentColor={primaryColor}
                    style={{ alignItems: "flex-start" }}
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
