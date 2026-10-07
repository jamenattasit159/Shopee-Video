import { linearTiming, TransitionSeries } from "@remotion/transitions";
import React from "react";
import { Audio, Sequence, useCurrentFrame, useVideoConfig } from "remotion";
import { AbsoluteFill } from "./components/AbsoluteFill";
import { CTAScene } from "./components/CTAScene";
import { FeatureScene } from "./components/FeatureScene";
import { HookScene } from "./components/HookScene";
import { FONTS, PALETTE } from "./lib/palette";
import { useBoil, useStepFrame } from "./lib/stopMotion";
import { PaperFilters } from "./paper/PaperFilters";
import { pageShuffle, slapStrip, tornWipe } from "./paper/PaperTransitions";
import { ShopeeProductVideoProps } from "./types";
import { resolveMediaSrc } from "./utils";

export const defaultShopeeVideoProps: ShopeeProductVideoProps = {
  productName: "แก้วเก็บความเย็น Tyeso สแตนเลส 304",
  price: "฿259",
  images: [
    "/samples/tumbler-1.svg",
    "/samples/tumbler-2.svg",
    "/samples/tumbler-3.svg",
  ],
  hook: {
    headline: "แก้วเก็บความเย็นตัวดังในตำนาน!",
    subheadline: "น้ำแข็งอยู่ข้ามวัน ไม่ละลายจริงมั้ย?!",
    badgeText: "🔥 ป้ายยาไอเทมเด็ด",
    highlightWord: "ตัวดัง",
    paperTheme: "kraft",
    durationSec: 3,
  },
  scenes: [
    {
      highlightTitle: "เก็บเย็นสะใจ 24 ชั่วโมง",
      highlightDesc: "สแตนเลส 304 แท้ ไอน้ำไม่เกาะโต๊ะ",
      stickerText: "❄️ เย็นเจี๊ยบ",
      highlightWord: "24 ชั่วโมง",
      imageIndex: 0,
      layout: "hero-center",
      paperTheme: "cream-grid",
      durationSec: 3,
    },
    {
      highlightTitle: "ดีไซน์มินิมอล มีหูหิ้ว",
      highlightDesc: "พกไปทำงาน ไปยิม คุมโทนสุดๆ",
      stickerText: "✨ สวยตรงปก",
      highlightWord: "มินิมอล",
      imageIndex: 1,
      layout: "polaroid-stack",
      paperTheme: "pastel-mint",
      durationSec: 3,
    },
    {
      highlightTitle: "โปรพิเศษลดเกิน 50%",
      highlightDesc: "เหลือเพียง ฿259 ส่งฟรีทั่วไทย",
      stickerText: "🏷️ คุ้มค่าที่สุด",
      highlightWord: "50%",
      imageIndex: 2,
      layout: "callout-circle",
      paperTheme: "kraft",
      durationSec: 3,
    },
  ],
  cta: {
    ctaTitle: "จิ้มตะกร้าส้มซ้ายล่างเลย!",
    ctaSubtitle: "แจกโค้ดส่งฟรี + คูปองส่วนลดเพิ่ม",
    buttonText: "ช้อปเลยที่ Shopee",
    basketNote: "พิกัดอยู่ที่ตะกร้าส้มมุมซ้ายล่าง 🛒",
    badgeText: "⚡ โค้ดส่งฟรีจำนวนจำกัด",
    paperTheme: "halftone-orange",
    durationSec: 3,
  },
  theme: {
    primaryColor: PALETTE.shopeeOrange,
    accentColor: PALETTE.sunnyYellow,
    bgColor: "#FFF4E0",
    textColor: PALETTE.ink,
    styleName: "Paper Collage Stop-Motion",
  },
  bgmUrl: "/audio/bgm-upbeat.mp3",
};

export const ShopeeProductVideo: React.FC<ShopeeProductVideoProps> = ({
  productName = defaultShopeeVideoProps.productName,
  price = defaultShopeeVideoProps.price,
  images = defaultShopeeVideoProps.images,
  cutoutImages,
  hook = defaultShopeeVideoProps.hook,
  scenes = defaultShopeeVideoProps.scenes,
  cta = defaultShopeeVideoProps.cta,
  theme = defaultShopeeVideoProps.theme,
  styleDNA,
  voiceoverUrl,
  bgmUrl = "/audio/bgm-upbeat.mp3",
}) => {
  const { fps, durationInFrames } = useVideoConfig();
  const frame = useCurrentFrame();

  // Root boil clock for consistent paper flutter across whole video
  const rootBoil = useBoil("root-master", 3, { rot: 0.5, pos: 1, scale: 0.005 });

  const packId = styleDNA?.pack || "kraft-scrapbook";
  const primaryColor = styleDNA?.primaryColor || theme?.primaryColor || PALETTE.shopeeOrange;
  const accentColor = styleDNA?.accentColor || theme?.accentColor || PALETTE.sunnyYellow;
  const bgColor = styleDNA?.bgColor || theme?.bgColor || "#FFF4E0";

  let chosenFont = FONTS.heading;
  if (styleDNA?.fontPair?.includes("kanit")) {
    chosenFont = FONTS.body;
  } else if (styleDNA?.fontPair?.includes("mali")) {
    chosenFont = FONTS.handwriting;
  }

  // Prioritize user uploaded images over default sample cutouts
  const isCustomUserImages =
    images &&
    images.length > 0 &&
    !images[0].includes("/samples/tumbler");

  const safeCutouts = isCustomUserImages
    ? images
    : cutoutImages && cutoutImages.length > 0
    ? cutoutImages
    : images && images.length > 0
    ? images
    : ["/samples/tumbler-1.svg"];

  const getImageForIndex = (idx: number) => {
    return safeCutouts[idx % safeCutouts.length] || safeCutouts[0];
  };

  const getSecondaryImageForIndex = (idx: number) => {
    const nextIdx = (idx + 1) % safeCutouts.length;
    return safeCutouts[nextIdx] || safeCutouts[0];
  };

  // Transition parameters (fast 8 frames = ~0.26s stop-motion slap/tear)
  const TRANSITION_FRAMES = 8;

  // Calculate durations with transition overlap compensation
  // Hook sequence
  const hookDurationFrames = Math.max(1, Math.round((hook?.durationSec || 3) * fps));

  // Feature scenes
  const safeScenes = scenes && scenes.length > 0 ? scenes : defaultShopeeVideoProps.scenes;

  // CTA duration
  const ctaDurationFrames = Math.max(1, Math.round((cta?.durationSec || 3) * fps));

  // Transition presentation selector from styleDNA
  const getTransitionForIndex = (idx: number) => {
    const tList =
      styleDNA?.transitions && styleDNA.transitions.length > 0
        ? styleDNA.transitions
        : ["slap-strip", "torn-wipe", "page-shuffle"];
    const tType = tList[idx % tList.length];
    switch (tType) {
      case "torn-wipe":
        return tornWipe();
      case "page-shuffle":
        return pageShuffle();
      case "slap-strip":
      default:
        return slapStrip();
    }
  };

  // Build audio timeline cue points
  let currentCueFrame = hookDurationFrames;
  const transitionCueFrames: number[] = [hookDurationFrames];

  safeScenes.forEach((s) => {
    const d = Math.max(1, Math.round((s.durationSec || 4) * fps));
    currentCueFrame += d;
    transitionCueFrames.push(currentCueFrame);
  });

  const ctaCueFrame = currentCueFrame - Math.max(1, Math.round((safeScenes[safeScenes.length - 1]?.durationSec || 4) * fps));

  // Stepped progress bar for stop-motion aesthetic
  const stepFrame = useStepFrame(3);
  const progressPercent = Math.min(100, (stepFrame / durationInFrames) * 100);

  return (
    <AbsoluteFill
      style={{
        backgroundColor: bgColor,
        fontFamily: chosenFont,
        overflow: "hidden",
      }}
    >
      {/* ✂️ 1. GLOBAL SVG PAPER FILTERS */}
      <PaperFilters seed={rootBoil.seed} />

      {/* 🏷️ CHANNEL SIGNATURE (Consistent brand signature in top-right safe area) */}
      <div
        style={{
          position: "absolute",
          top: "42px",
          right: "36px",
          backgroundColor: "rgba(27, 27, 27, 0.88)",
          color: "#FFFFFF",
          padding: "6px 16px",
          borderRadius: "6px",
          fontSize: "22px",
          fontWeight: 800,
          letterSpacing: "1px",
          boxShadow: "0 2px 8px rgba(0,0,0,0.25)",
          zIndex: 70,
          pointerEvents: "none",
        }}
      >
        ✦ DAILY FINDS
      </div>

      {/* 🎵 2. AUDIO LAYER: Background Music (BGM) */}
      {bgmUrl && (
        <Audio
          src={resolveMediaSrc(bgmUrl)}
          volume={0.22}
          loop
        />
      )}

      {/* 🗣️ 3. AUDIO LAYER: AI Voiceover Narration */}
      {voiceoverUrl && (
        <Audio
          src={resolveMediaSrc(voiceoverUrl)}
          volume={1.0}
        />
      )}

      {/* 💥 4. SOUND EFFECTS (SFX) SYNCHRONIZED WITH PAPER SLAPS & POPS */}
      {/* Hook entrance pop */}
      <Sequence from={2} durationInFrames={14}>
        <Audio src={resolveMediaSrc("/sfx/sfx-pop.mp3")} volume={0.65} />
      </Sequence>

      {/* Scene transition sound effects */}
      {transitionCueFrames.map((cueFrame, idx) => {
        const sfxFile =
          idx % 2 === 0 ? "/sfx/sfx-slap.mp3" : "/sfx/sfx-tear.mp3";
        return (
          <Sequence
            key={`sfx-transition-${idx}`}
            from={Math.max(0, cueFrame - 4)}
            durationInFrames={16}
          >
            <Audio src={resolveMediaSrc(sfxFile)} volume={0.6} />
          </Sequence>
        );
      })}

      {/* CTA Starburst Price Reveal Cash Ding */}
      <Sequence from={Math.max(0, transitionCueFrames[transitionCueFrames.length - 2] || 360)} durationInFrames={25}>
        <Audio src={resolveMediaSrc("/sfx/sfx-cash.mp3")} volume={0.75} />
      </Sequence>

      {/* 🎬 5. TRANSITION SERIES FOR SEAMLESS PAPER TRANSITIONS */}
      <TransitionSeries>
        {/* Scene 1: Hook */}
        <TransitionSeries.Sequence
          durationInFrames={hookDurationFrames + TRANSITION_FRAMES}
        >
          <HookScene
            hook={hook}
            imageSrc={getImageForIndex(0)}
            primaryColor={primaryColor}
            accentColor={accentColor}
            packId={packId}
            bgColor={bgColor}
          />
        </TransitionSeries.Sequence>

        {/* Feature Scenes with alternating transitions */}
        {safeScenes.map((scene, idx) => {
          const isLastScene = idx === safeScenes.length - 1;
          const sceneDuration =
            Math.max(1, Math.round((scene.durationSec || 4) * fps)) +
            (isLastScene ? TRANSITION_FRAMES : TRANSITION_FRAMES);

          return (
            <React.Fragment key={`series-scene-${idx}`}>
              <TransitionSeries.Transition
                presentation={getTransitionForIndex(idx)}
                timing={linearTiming({ durationInFrames: TRANSITION_FRAMES })}
              />
              <TransitionSeries.Sequence durationInFrames={sceneDuration}>
                <FeatureScene
                  scene={scene}
                  imageSrc={getImageForIndex(scene.imageIndex ?? idx)}
                  secondaryImageSrc={getSecondaryImageForIndex(scene.imageIndex ?? idx)}
                  sceneIndex={idx}
                  totalScenes={safeScenes.length}
                  primaryColor={primaryColor}
                  accentColor={accentColor}
                  packId={packId}
                  bgColor={bgColor}
                />
              </TransitionSeries.Sequence>
            </React.Fragment>
          );
        })}

        {/* Transition into CTA */}
        <TransitionSeries.Transition
          presentation={slapStrip()}
          timing={linearTiming({ durationInFrames: TRANSITION_FRAMES })}
        />

        {/* Scene Final: CTA */}
        <TransitionSeries.Sequence durationInFrames={ctaDurationFrames}>
          <CTAScene
            cta={cta}
            imageSrc={getImageForIndex(safeCutouts.length - 1)}
            price={price}
            productName={productName}
            primaryColor={primaryColor}
            accentColor={accentColor}
          />
        </TransitionSeries.Sequence>
      </TransitionSeries>

      {/* ⏱️ 6. TOP PROGRESS BAR (Paper Tape Style) */}
      <div
        style={{
          position: "absolute",
          top: "18px",
          left: "24px",
          right: "24px",
          height: "8px",
          background: "rgba(0, 0, 0, 0.18)",
          borderRadius: "4px",
          overflow: "hidden",
          boxShadow: "inset 0 1px 3px rgba(0,0,0,0.2)",
          zIndex: 60,
        }}
      >
        <div
          style={{
            height: "100%",
            width: `${progressPercent}%`,
            background: `repeating-linear-gradient(45deg, ${primaryColor}, ${primaryColor} 10px, ${accentColor} 10px, ${accentColor} 20px)`,
            borderRadius: "4px",
          }}
        />
      </div>
    </AbsoluteFill>
  );
};
