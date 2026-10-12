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
import captionConfig from "./captions.json";
import { buildCaptionPages, CaptionSegmentInput } from "./lib/captionTiming";
import { TikTokCaptions } from "./components/TikTokCaptions";

type CaptionText = { th: string; en?: string };
type ManualCaptions = { productName: string; hook?: CaptionText; scenes?: CaptionText[]; cta?: CaptionText };

const normalize = (t?: string) => (t || "").replace(/\s+/g, "").trim();

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
      layout: "hero-center",
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
      layout: "polaroid-stack",
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
      layout: "callout-circle",
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
  voiceoverDurationSec,
  voiceLines,
  bgmUrl = "/audio/bgm-upbeat.mp3",
}) => {
  const { fps, durationInFrames } = useVideoConfig();
  const frame = useCurrentFrame();

  // Preload and wait for Google Fonts before layout measurement and frame render
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

  // Root boil clock for consistent paper flutter across whole video
  const rootBoil = useBoil("root-master", 3, { rot: 0.5, pos: 1, scale: 0.005 });

  const packId = styleDNA?.pack || "kraft-scrapbook";
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

  // Transition length (edit in theme.ts)
  const TRANSITION_FRAMES = THEME.motion.transitionFrames;
  const transitionTiming = springTiming({ config: { damping: 200 }, durationInFrames: TRANSITION_FRAMES });

  // Feature scenes
  const safeScenes = scenes && scenes.length > 0 ? scenes : defaultShopeeVideoProps.scenes;

  // Resolve voice lines if present
  const hookVoiceLine = voiceLines?.find((l) => l.role === "hook");
  const ctaVoiceLine = voiceLines?.find((l) => l.role === "cta");
  const bodyVoiceLines = voiceLines?.filter((l) => l.role === "body") || [];

  // Dynamically scale hook, scenes, and CTA so their total duration in TransitionSeries equals durationInFrames exactly!
  // In TransitionSeries, total duration = hookDurationFrames + sum(sceneDurationFrames) + ctaDurationFrames
  const rawHookSec = (hookVoiceLine?.durationSec && hookVoiceLine.durationSec > 0)
    ? hookVoiceLine.durationSec + 0.3
    : (hook?.durationSec || 3);

  const rawCtaSec = (ctaVoiceLine?.durationSec && ctaVoiceLine.durationSec > 0)
    ? ctaVoiceLine.durationSec + 0.5
    : (cta?.durationSec || 3);

  const rawScenesSumSec = safeScenes.reduce((sum, s, idx) => {
    const bLine = bodyVoiceLines[idx];
    const sSec = (bLine?.durationSec && bLine.durationSec > 0) ? bLine.durationSec + 0.3 : (s.durationSec || 4);
    return sum + sSec;
  }, 0);
  const rawTotalSec = Math.max(1, rawHookSec + rawCtaSec + rawScenesSumSec);

  // Proportional allocation of durationInFrames
  const hookDurationFrames = Math.max(
    Math.round(2 * fps),
    Math.round((rawHookSec / rawTotalSec) * durationInFrames)
  );
  const ctaDurationFrames = Math.max(
    Math.round(2.5 * fps),
    Math.round((rawCtaSec / rawTotalSec) * durationInFrames)
  );

  const availableSceneFrames = Math.max(
    safeScenes.length * 30,
    durationInFrames - hookDurationFrames - ctaDurationFrames
  );

  // Distribute availableSceneFrames across safeScenes proportionally
  const sceneDurationFramesList: number[] = [];
  let allocatedSceneFrames = 0;
  safeScenes.forEach((s, idx) => {
    if (idx === safeScenes.length - 1) {
      sceneDurationFramesList.push(availableSceneFrames - allocatedSceneFrames);
    } else {
      const bLine = bodyVoiceLines[idx];
      const sSec = (bLine?.durationSec && bLine.durationSec > 0) ? bLine.durationSec + 0.3 : (s.durationSec || 4);
      const sFrames = Math.round((sSec / rawScenesSumSec) * availableSceneFrames);
      sceneDurationFramesList.push(sFrames);
      allocatedSceneFrames += sFrames;
    }
  });

  // Transition presentation selector from styleDNA
  const getTransitionForIndex = (idx: number) => {
    const tList =
      styleDNA?.transitions && styleDNA.transitions.length > 0
        ? styleDNA.transitions
        : ["slap-strip", "torn-wipe", "page-shuffle"];
    const tType = tList[idx % tList.length];
    switch (tType) {
      case "torn-wipe":
        return wipe({ direction: "from-left" }) as any;
      case "page-shuffle":
        return slide({ direction: "from-bottom" }) as any;
      case "slap-strip":
      default:
        return slide({ direction: "from-right" }) as any;
    }
  };

  // Build audio timeline cue points
  let currentCueFrame = hookDurationFrames;
  const transitionCueFrames: number[] = [hookDurationFrames];

  sceneDurationFramesList.forEach((d) => {
    currentCueFrame += d;
    transitionCueFrames.push(currentCueFrame);
  });

  const ctaCueFrame = currentCueFrame - Math.max(1, Math.round((safeScenes[safeScenes.length - 1]?.durationSec || 4) * fps));

  const progressPercent = Math.min(100, (frame / durationInFrames) * 100);

  // ── Captions: manual (captions.json) → voice script → on-screen subtitle ──
  const manual = (captionConfig.manual as ManualCaptions[]).find((m) => m.productName === productName);
  const language = captionConfig.language as "th" | "en" | "both";
  const ctaStartFrame = transitionCueFrames[transitionCueFrames.length - 1] || 0;

  const sceneSubtitle = (idx: number) => {
    const s = safeScenes[idx];
    return s.highlightDesc && s.highlightDesc.trim() !== s.highlightTitle.trim() ? s.highlightDesc : "";
  };
  const pick = (manualText?: CaptionText, voiceText?: string, subtitle?: string): CaptionText | undefined =>
    manualText || (voiceText ? { th: voiceText } : subtitle ? { th: subtitle } : undefined);
  const speechFrames = (voiceSec: number | undefined, segmentFrames: number) =>
    voiceSec && voiceSec > 0 ? Math.min(segmentFrames, Math.round(voiceSec * fps) + 6) : segmentFrames;

  const captionPlan: Array<{ text?: CaptionText; subtitle?: string; from: number; frames: number }> = [
    {
      text: pick(manual?.hook, hookVoiceLine?.text, hook?.subheadline),
      subtitle: hook?.subheadline,
      from: 0,
      frames: speechFrames(hookVoiceLine?.durationSec, hookDurationFrames),
    },
    ...safeScenes.map((_s, idx) => ({
      text: pick(manual?.scenes?.[idx], bodyVoiceLines[idx]?.text, sceneSubtitle(idx)),
      subtitle: sceneSubtitle(idx),
      from: transitionCueFrames[idx] || 0,
      frames: speechFrames(bodyVoiceLines[idx]?.durationSec, sceneDurationFramesList[idx] || 0),
    })),
    {
      text: pick(manual?.cta, ctaVoiceLine?.text, cta?.ctaSubtitle),
      subtitle: cta?.ctaSubtitle,
      from: ctaStartFrame,
      frames: speechFrames(ctaVoiceLine?.durationSec, ctaDurationFrames),
    },
  ];

  const captionsOn = captionConfig.enabled;
  // Hide the in-scene subtitle when the caption track already says the same thing
  const hideSubtitle = captionPlan.map(
    (c) => captionsOn && !!c.text && normalize(c.text.th) === normalize(c.subtitle)
  );
  const captionKey = JSON.stringify(captionPlan);
  const captionPages = React.useMemo(() => {
    if (!captionsOn) return [];
    const segments: CaptionSegmentInput[] = captionPlan
      .filter((c) => c.text)
      .map((c) => ({
        th: language === "en" ? c.text!.en || c.text!.th : c.text!.th,
        en: language === "both" ? c.text!.en : undefined,
        from: c.from,
        durationFrames: c.frames,
      }));
    return buildCaptionPages(segments, captionConfig.maxCharsPerPage);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [captionKey, captionsOn, language]);

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

      {/* 🏷️ CHANNEL SIGNATURE (Consistent brand signature in top-right safe area) */}
      <div
        style={{
          position: "absolute",
          top: "42px",
          right: "36px",
          backgroundColor: THEME.colors.surface,
          border: `1px solid ${THEME.colors.border}`,
          color: THEME.colors.textMuted,
          padding: "6px 16px",
          borderRadius: "12px",
          fontSize: "22px",
          fontWeight: 700,
          letterSpacing: "1px",
          zIndex: 70,
          pointerEvents: "none",
        }}
      >
        ✦ DAILY FINDS
      </div>

      {/* 🎵 2. AUDIO LAYER: Background Music (BGM) with smooth fade-in and fade-out */}
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
            const startFrame = idx === 0 ? hookDurationFrames : (transitionCueFrames[idx] || 0);
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
        voiceoverUrl && (
          <Audio
            src={resolveMediaSrc(voiceoverUrl)}
            volume={1.0}
          />
        )
      )}

      {/* 💥 4. SOUND EFFECTS (SFX) SYNCHRONIZED WITH PAPER SLAPS & POPS */}
      {/* Hook entrance pop */}
      <Sequence from={0} durationInFrames={14}>
        <Audio src={resolveMediaSrc(THEME.audio.hookSfx)} volume={THEME.audio.sfxVolume} />
      </Sequence>

      {/* Scene transition whooshes */}
      {transitionCueFrames.map((cueFrame, idx) => (
        <Sequence
          key={`sfx-transition-${idx}`}
          from={Math.max(0, cueFrame - Math.round(TRANSITION_FRAMES / 2))}
          durationInFrames={20}
        >
          <Audio src={resolveMediaSrc(THEME.audio.transitionSfx)} volume={THEME.audio.sfxVolume * 0.8} />
        </Sequence>
      ))}

      {/* CTA Starburst Price Reveal Cash Ding */}
      <Sequence from={Math.max(0, transitionCueFrames[transitionCueFrames.length - 2] || 360)} durationInFrames={25}>
        <Audio src={resolveMediaSrc(THEME.audio.ctaSfx)} volume={THEME.audio.sfxVolume} />
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
            hideSubtitle={hideSubtitle[0]}
          />
        </TransitionSeries.Sequence>

        {/* Feature Scenes with alternating transitions */}
        {safeScenes.map((scene, idx) => {
          const sFrames = sceneDurationFramesList[idx] || Math.round((scene.durationSec || 4) * fps);
          const sceneDuration = sFrames + TRANSITION_FRAMES;

          return (
            <React.Fragment key={`series-scene-${idx}`}>
              <TransitionSeries.Transition
                presentation={getTransitionForIndex(idx)}
                timing={transitionTiming}
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
                  hideSubtitle={hideSubtitle[idx + 1]}
                />
              </TransitionSeries.Sequence>
            </React.Fragment>
          );
        })}

        {/* Transition into CTA */}
        <TransitionSeries.Transition
          presentation={fade() as any}
          timing={transitionTiming}
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
            hideSubtitle={hideSubtitle[hideSubtitle.length - 1]}
          />
        </TransitionSeries.Sequence>
      </TransitionSeries>

      {/* 💬 7. WORD-BY-WORD CAPTIONS (text: captions.json, style: theme.ts) */}
      <TikTokCaptions pages={captionPages} showEnglish={language === "both"} />

      {/* ⏱️ 6. TOP PROGRESS BAR (Paper Tape Style) */}
      <div
        style={{
          position: "absolute",
          top: "18px",
          left: "24px",
          right: "24px",
          height: "6px",
          background: THEME.colors.surfaceRaised,
          borderRadius: "999px",
          overflow: "hidden",
          zIndex: 60,
        }}
      >
        <div
          style={{
            height: "100%",
            width: `${progressPercent}%`,
            background: THEME.colors.accent,
            borderRadius: "999px",
          }}
        />
      </div>
    </AbsoluteFill>
  );
};
