import { springTiming, TransitionSeries } from "@remotion/transitions";
import { fade } from "@remotion/transitions/fade";
import { slide } from "@remotion/transitions/slide";
import { wipe } from "@remotion/transitions/wipe";
import React from "react";
import { Audio, continueRender, delayRender, interpolate, Sequence, useCurrentFrame, useVideoConfig } from "remotion";
import { AbsoluteFill } from "./components/AbsoluteFill";
import { CTAScene } from "./components/CTAScene";
import { FeatureScene } from "./components/FeatureScene";
import { HookScene } from "./components/HookScene";
import { FONTS, PALETTE, waitForFonts } from "./lib/palette";
import { useBoil } from "./lib/stopMotion";
import { PaperFilters } from "./paper/PaperFilters";
import { ShopeeProductVideoProps } from "./types";
import { resolveMediaSrc } from "./utils";
import { THEME } from "./theme";
import { buildVideoTimeline } from "./lib/videoTimeline";
import { TikTokCaptions } from "./components/TikTokCaptions";
import { NotebookPresenterScene } from "./components/NotebookPresenterScene";
import { planMascotPoses } from "./lib/mascotAnimation";

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
    headlineLines: ["แก้วเก็บความเย็น", "ตัวดังในตำนาน!"],
    subheadline: "น้ำแข็งอยู่ข้ามวัน ไม่ละลายจริงมั้ย?!",
    captionLines: ["น้ำแข็งอยู่ข้ามวัน", "ไม่ละลายจริงมั้ย?!"],
    badgeText: "🔥 ป้ายยาไอเทมเด็ด",
    highlightWord: "ตัวดัง",
    paperTheme: "kraft",
    durationSec: 3,
    imageIndex: 0,
  },
  scenes: [
    {
      highlightTitle: "เก็บเย็นสะใจ 24 ชั่วโมง",
      headlineLines: ["เก็บเย็นสะใจ", "24 ชั่วโมง"],
      highlightDesc: "สแตนเลส 304 แท้ ไอน้ำไม่เกาะโต๊ะ",
      captionLines: ["สแตนเลส 304 แท้", "ไอน้ำไม่เกาะโต๊ะ"],
      stickerText: "❄️ เย็นเจี๊ยบ",
      highlightWord: "24 ชั่วโมง",
      imageIndex: 0,
      layout: "split-showcase",
      paperTheme: "cream-grid",
      durationSec: 3,
    },
    {
      highlightTitle: "ดีไซน์มินิมอล มีหูหิ้ว",
      headlineLines: ["ดีไซน์มินิมอล", "มีหูหิ้ว"],
      highlightDesc: "พกไปทำงาน ไปยิม คุมโทนสุดๆ",
      captionLines: ["พกไปทำงานไปยิม", "คุมโทนสุดๆ"],
      stickerText: "✨ สวยตรงปก",
      highlightWord: "มินิมอล",
      imageIndex: 1,
      layout: "bento-grid",
      paperTheme: "pastel-mint",
      durationSec: 3,
    },
    {
      highlightTitle: "โปรพิเศษลดเกิน 50%",
      headlineLines: ["โปรพิเศษ", "ลดเกิน 50%"],
      highlightDesc: "เหลือเพียง ฿259 ส่งฟรีทั่วไทย",
      captionLines: ["เหลือเพียง ฿259", "ส่งฟรีทั่วไทย"],
      stickerText: "🏷️ คุ้มค่าที่สุด",
      highlightWord: "50%",
      imageIndex: 2,
      layout: "polaroid-stack",
      paperTheme: "kraft",
      durationSec: 3,
    },
  ],
  cta: {
    ctaTitle: "จิ้มตะกร้าส้มซ้ายล่างเลย!",
    headlineLines: ["จิ้มตะกร้าส้ม", "ซ้ายล่างเลย!"],
    ctaSubtitle: "แจกโค้ดส่งฟรี + คูปองส่วนลดเพิ่ม",
    captionLines: ["แจกโค้ดส่งฟรี", "คูปองลดเพิ่ม"],
    buttonText: "ช้อปเลยที่ Shopee",
    basketNote: "พิกัดอยู่ที่ตะกร้าส้มมุมซ้ายล่าง 🛒",
    badgeText: "⚡ โค้ดส่งฟรีจำนวนจำกัด",
    paperTheme: "halftone-orange",
    durationSec: 3,
  },
  theme: {
    primaryColor: PALETTE.shopeeOrange,
    accentColor: PALETTE.sunnyYellow,
    bgColor: "#F8F5F0",
    textColor: PALETTE.ink,
    styleName: "Pro Minimal Studio",
  },
  bgmUrl: "/audio/bgm-upbeat.mp3",
  captionSettings: {
    enabled: true,
    style: "tiktok-pop",
    position: "bottom",
    language: "th",
    highlightColor: "#FACC15",
  },
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
  voiceoverDurationSec,
  voiceLines,
  bgmUrl = "/audio/bgm-upbeat.mp3",
  captionSettings,
  captionCues,
  mediaDurations,
  narrationScript,
  presentationStyle = "notebook-presenter",
  mascotUrl,
  mascotAnimation,
}) => {
  const { fps, durationInFrames } = useVideoConfig();
  const frame = useCurrentFrame();

  const [fontHandle] = React.useState(() =>
    delayRender("Wait for Google Fonts to load for layout measurement")
  );
  React.useEffect(() => {
    waitForFonts()
      .then(() => continueRender(fontHandle))
      .catch((err) => {
        console.warn("[ShopeeProductVideo] Font loading warning:", err);
        continueRender(fontHandle);
      });
  }, [fontHandle]);

  const rootBoil = useBoil("root-master", 3, { rot: 0.5, pos: 1, scale: 0.005 });

  const packId = styleDNA?.pack || "pro-minimal-luxury";
  const useProductColors = THEME.respectProductColors;
  const primaryColor = (useProductColors && (styleDNA?.primaryColor || theme?.primaryColor)) || THEME.colors.accent;
  const accentColor = (useProductColors && (styleDNA?.accentColor || theme?.accentColor)) || THEME.colors.accent;
  const bgColor = (useProductColors && (styleDNA?.bgColor || theme?.bgColor)) || THEME.colors.bg;

  let chosenFont = FONTS.heading;
  if (styleDNA?.fontPair?.includes("kanit")) {
    chosenFont = FONTS.body;
  } else if (styleDNA?.fontPair?.includes("mali")) {
    chosenFont = FONTS.handwriting;
  }

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
    const safeIdx = Math.max(0, idx);
    return safeCutouts[safeIdx % safeCutouts.length] || safeCutouts[0];
  };

  const getSecondaryImageForIndex = (idx: number) => {
    const nextIdx = (Math.max(0, idx) + 1) % safeCutouts.length;
    return safeCutouts[nextIdx] || safeCutouts[0];
  };

  const timeline = buildVideoTimeline({ productName, price, images, hook, scenes, cta, voiceLines, voiceoverUrl, voiceoverDurationSec, captionCues, mediaDurations, narrationScript });
  const TRANSITION_FRAMES = THEME.motion.transitionFrames;
  const transitionTiming = springTiming({ config: { damping: 200 }, durationInFrames: TRANSITION_FRAMES });
  const safeScenes = scenes || [];
  const hookVoiceLine = voiceLines?.find((l) => l.sceneId === "hook");
  const ctaVoiceLine = voiceLines?.find((l) => l.sceneId === "cta");
  const bodyVoiceLines = safeScenes.map((_, i) => voiceLines?.find((l) => l.sceneId === `scene_${i}`));
  const hookDurationFrames = timeline.scenes[0].durationInFrames;
  const ctaDurationFrames = timeline.scenes[timeline.scenes.length - 1].durationInFrames;
  const sceneDurationFramesList = timeline.scenes.slice(1, -1).map((s) => s.durationInFrames);
  const transitionCueFrames = timeline.scenes.slice(1).map((s) => s.from);
  const getTransitionForIndex = (idx: number) => {
    const type = styleDNA?.transitions?.[idx % styleDNA.transitions.length] || "torn-wipe";
    return type === "torn-wipe" ? wipe({ direction: "from-left" }) : type === "page-shuffle" ? slide({ direction: "from-bottom" }) : slide({ direction: "from-right" });
  };
  const progressPercent = Math.min(100, frame / timeline.durationInFrames * 100);
  const activeCaptionSettings = captionSettings || defaultShopeeVideoProps.captionSettings!;
  const captionsOn = activeCaptionSettings.enabled !== false;
  const language = activeCaptionSettings.language || "th";
  const hideSubtitle = timeline.scenes.map(() => false);
  const captionPages = (captionCues || []).map((cue) => {
    const start = Math.round(cue.startSec * fps);
    const end = Math.round(cue.endSec * fps);
    return { words: [{ text: language === "en" ? cue.en || cue.text : cue.text, start, end }], start, end, en: language === "both" ? cue.en : undefined, segmentStart: start, segmentEnd: end };
  });
  const sceneMedia = (idx: number) => {
    const item = timeline.scenes[idx];
    return { videoStartSec: item.videoStartSec, videoEndSec: item.videoEndSec, videoFillMode: item.fillMode };
  };

  const mascotClips = planMascotPoses(mascotAnimation, timeline.scenes.map((item) => ({ role: item.role, requested: item.data?.mascotPose })));

  const hasVoice = !!voiceoverUrl || !!voiceLines?.some((l) => l.audioUrl);
  const bgmLevel = hasVoice ? THEME.audio.bgmVolumeUnderVoice : THEME.audio.bgmVolume;

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

      {/* 🎵 2. AUDIO LAYER: Background Music (BGM) */}
      {bgmUrl && (
        <Audio
          src={resolveMediaSrc(bgmUrl)}
          volume={interpolate(
            frame,
            [0, 15, Math.max(16, durationInFrames - 24), durationInFrames],
            [0, bgmLevel, bgmLevel, 0],
            { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
          )}
          loop
        />
      )}

      {/* 🗣️ 3. AUDIO LAYER: AI Voiceover Narration */}
      {voiceLines && voiceLines.some((l) => l.audioUrl) ? (
        <>
          {hookVoiceLine?.audioUrl && (
            <Sequence from={0} durationInFrames={Math.round(((hookVoiceLine.durationSec || 3) + 0.3) * fps)}>
              <Audio src={resolveMediaSrc(hookVoiceLine.audioUrl)} volume={1.0} />
            </Sequence>
          )}
          {safeScenes.map((_s, idx) => {
            const bLine = bodyVoiceLines[idx];
            if (!bLine?.audioUrl) return null;
            const startFrame = idx === 0 ? hookDurationFrames : transitionCueFrames[idx] || 0;
            return (
              <Sequence
                key={`voice-scene-${idx}`}
                from={startFrame}
                durationInFrames={Math.round(((bLine.durationSec || 3) + 0.3) * fps)}
              >
                <Audio src={resolveMediaSrc(bLine.audioUrl)} volume={1.0} />
              </Sequence>
            );
          })}
          {ctaVoiceLine?.audioUrl && (
            <Sequence
              from={transitionCueFrames[transitionCueFrames.length - 1] || 0}
              durationInFrames={Math.round(((ctaVoiceLine.durationSec || 3) + 0.5) * fps)}
            >
              <Audio src={resolveMediaSrc(ctaVoiceLine.audioUrl)} volume={1.0} />
            </Sequence>
          )}
        </>
      ) : (
        voiceoverUrl && <Audio src={resolveMediaSrc(voiceoverUrl)} volume={1.0} />
      )}

      {/* 💥 4. SOUND EFFECTS (SFX) */}
      <Sequence from={0} durationInFrames={14}>
        <Audio src={resolveMediaSrc(THEME.audio.hookSfx)} volume={THEME.audio.sfxVolume} />
      </Sequence>

      {transitionCueFrames.map((cueFrame, idx) => (
        <Sequence
          key={`sfx-transition-${idx}`}
          from={Math.max(0, cueFrame - Math.round(TRANSITION_FRAMES / 2))}
          durationInFrames={20}
        >
          <Audio src={resolveMediaSrc(THEME.audio.transitionSfx)} volume={THEME.audio.sfxVolume * 0.8} />
        </Sequence>
      ))}

      <Sequence from={Math.max(0, transitionCueFrames[transitionCueFrames.length - 2] || 360)} durationInFrames={25}>
        <Audio src={resolveMediaSrc(THEME.audio.ctaSfx)} volume={THEME.audio.sfxVolume} />
      </Sequence>

      {/* 🎬 5. TRANSITION SERIES */}
      {presentationStyle === "notebook-presenter" ? timeline.scenes.map((item, index) => (
        <Sequence key={item.id} from={item.from} durationInFrames={item.durationInFrames}>
          <NotebookPresenterScene
            data={{ ...item.data, ...sceneMedia(index) } as any}
            role={item.role}
            index={index}
            imageSrc={getImageForIndex(item.mediaIndex)}
            mascotUrl={mascotUrl}
            mascotAnimation={mascotAnimation}
            mascotClip={mascotClips[index]}
            price={price}
            captionCues={captionCues}
            captionSettings={captionSettings}
            startFrame={item.from}
          />
        </Sequence>
      )) : <TransitionSeries>
        {/* Scene 1: Hook */}
        <TransitionSeries.Sequence durationInFrames={hookDurationFrames + TRANSITION_FRAMES}>
          <HookScene
            hook={{ ...hook, ...sceneMedia(0) }}
            imageSrc={getImageForIndex(hook.imageIndex ?? 0)}
            primaryColor={primaryColor}
            accentColor={accentColor}
            packId={packId}
            bgColor={bgColor}
            hideSubtitle={hideSubtitle[0]}
          />
        </TransitionSeries.Sequence>

        {/* Feature Scenes */}
        {safeScenes.map((scene, idx) => {
          const sFrames = sceneDurationFramesList[idx] || Math.round((scene.durationSec || 4) * fps);
          const sceneDuration = sFrames + TRANSITION_FRAMES;
          const sceneLayout =
            scene.layout ||
            (styleDNA?.layouts && styleDNA.layouts[idx % styleDNA.layouts.length]) ||
            undefined;

          return (
            <React.Fragment key={`series-scene-${idx}`}>
              <TransitionSeries.Transition
                presentation={getTransitionForIndex(idx) as any}
                timing={transitionTiming}
              />
              <TransitionSeries.Sequence durationInFrames={sceneDuration}>
                <FeatureScene
                  scene={{ ...scene, ...sceneMedia(idx + 1), layout: sceneLayout }}
                  imageSrc={getImageForIndex(scene.imageIndex ?? idx)}
                  secondaryImageSrc={getSecondaryImageForIndex(scene.imageIndex ?? idx)}
                  sceneIndex={idx}
                  totalScenes={safeScenes.length}
                  primaryColor={primaryColor}
                  accentColor={accentColor}
                  packId={packId}
                  bgColor={bgColor}
                  hideSubtitle={hideSubtitle[idx + 1]}
                />
              </TransitionSeries.Sequence>
            </React.Fragment>
          );
        })}

        {/* Transition into CTA */}
        <TransitionSeries.Transition presentation={fade() as any} timing={transitionTiming} />

        {/* Scene Final: CTA */}
        <TransitionSeries.Sequence durationInFrames={ctaDurationFrames}>
          <CTAScene
            cta={{ ...cta, ...sceneMedia(timeline.scenes.length - 1) }}
            imageSrc={getImageForIndex(cta.imageIndex ?? safeCutouts.length - 1)}
            price={price}
            productName={productName}
            primaryColor={primaryColor}
            accentColor={accentColor}
            packId={packId}
            bgColor={bgColor}
            hideSubtitle={hideSubtitle[hideSubtitle.length - 1]}
          />
        </TransitionSeries.Sequence>
      </TransitionSeries>}

      {/* 💬 7. SUBTITLES & POP CAPTIONS */}
      {captionsOn && (presentationStyle !== "notebook-presenter" || activeCaptionSettings.style !== "tiktok-pop") && (
        <TikTokCaptions
          pages={captionPages}
          showEnglish={language === "both"}
          styleVariant={activeCaptionSettings?.style || "tiktok-pop"}
          position={activeCaptionSettings?.position || "bottom"}
          highlightColor={activeCaptionSettings?.highlightColor || accentColor || "#FACC15"}
          fontSize={activeCaptionSettings?.fontSize}
        />
      )}

      {/* ⏱️ 6. TOP PROGRESS BAR */}
      {presentationStyle !== "notebook-presenter" && <div
        style={{
          position: "absolute",
          top: "18px",
          left: "24px",
          right: "24px",
          height: "6px",
          background: "rgba(15, 23, 42, 0.45)",
          borderRadius: "999px",
          overflow: "hidden",
          zIndex: 60,
        }}
      >
        <div
          style={{
            height: "100%",
            width: `${progressPercent}%`,
            background: primaryColor,
            borderRadius: "999px",
          }}
        />
      </div>}
    </AbsoluteFill>
  );
};
