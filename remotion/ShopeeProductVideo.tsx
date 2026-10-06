import React from "react";
import { Audio, Sequence, useCurrentFrame, useVideoConfig } from "remotion";
import { AbsoluteFill } from "./components/AbsoluteFill";
import { CTAScene } from "./components/CTAScene";
import { FeatureScene } from "./components/FeatureScene";
import { HookScene } from "./components/HookScene";
import { ShopeeCartBadge } from "./components/ShopeeCartBadge";
import { ShopeeProductVideoProps } from "./types";
import { resolveMediaSrc } from "./utils";

export const defaultShopeeVideoProps: ShopeeProductVideoProps = {
  productName: "แก้วเก็บความเย็น Tyeso สแตนเลส 304",
  price: "฿259 (ลด 56%)",
  images: [
    "/samples/tumbler-1.svg",
    "/samples/tumbler-2.svg",
    "/samples/tumbler-3.svg",
  ],
  hook: {
    headline: "แก้วเก็บความเย็นที่ทุกคนตามหา!",
    subheadline: "น้ำแข็งอยู่ข้ามวัน ไม่ละลายจริงมั้ย?!",
    badgeText: "🔥 ป้ายยาไอเทมเด็ด",
    durationSec: 3,
  },
  scenes: [
    {
      highlightTitle: "เก็บเย็นสะใจ 24 ชั่วโมง!",
      highlightDesc: "สแตนเลส 304 แท้ ไอน้ำไม่เกาะโต๊ะ",
      stickerText: "❄️ เย็นเจี๊ยบ",
      imageIndex: 0,
      durationSec: 4,
    },
    {
      highlightTitle: "ดีไซน์มินิมอล มีหูหิ้ว",
      highlightDesc: "พกไปทำงาน ไปยิม คุมโทนสุดๆ",
      stickerText: "✨ สวยตรงปก",
      imageIndex: 1,
      durationSec: 4,
    },
    {
      highlightTitle: "โปรพิเศษลดเกิน 50%",
      highlightDesc: "เหลือเพียง ฿259 เท่านั้น ส่งฟรีทั่วไทย",
      stickerText: "🏷️ ลดโหดมาก",
      imageIndex: 2,
      durationSec: 4,
    },
  ],
  cta: {
    ctaTitle: "จิ้มตะกร้าส้มซ้ายล่างเลย!",
    ctaSubtitle: "แจกโค้ดส่งฟรี + คูปองส่วนลดเพิ่ม",
    buttonText: "ช้อปเลยที่ Shopee",
    basketNote: "พิกัดอยู่ที่ตะกร้าส้มมุมซ้ายล่าง 🛒",
    durationSec: 3,
  },
  theme: {
    primaryColor: "#EE4D2D",
    accentColor: "#FFBA00",
    bgColor: "#0F172A",
    textColor: "#FFFFFF",
    styleName: "Shopee Orange Energy",
  },
  bgmUrl: "/audio/bgm-upbeat.mp3",
};

export const ShopeeProductVideo: React.FC<ShopeeProductVideoProps> = ({
  productName = defaultShopeeVideoProps.productName,
  price = defaultShopeeVideoProps.price,
  images = defaultShopeeVideoProps.images,
  hook = defaultShopeeVideoProps.hook,
  scenes = defaultShopeeVideoProps.scenes,
  cta = defaultShopeeVideoProps.cta,
  theme = defaultShopeeVideoProps.theme,
  voiceoverUrl,
  bgmUrl = "/audio/bgm-upbeat.mp3",
}) => {
  const { fps, durationInFrames } = useVideoConfig();
  const frame = useCurrentFrame();

  const primaryColor = theme?.primaryColor || "#EE4D2D";
  const accentColor = theme?.accentColor || "#FFBA00";

  // Calculate frame boundaries
  const hookDurationFrames = Math.max(1, Math.round((hook?.durationSec || 3) * fps));
  const ctaDurationFrames = Math.max(1, Math.round((cta?.durationSec || 3) * fps));

  const safeImages = images && images.length > 0 ? images : ["/samples/tumbler-1.svg"];

  const getImageForIndex = (idx: number) => {
    return safeImages[idx % safeImages.length] || safeImages[0];
  };

  // Build timeline for scenes
  let currentFrom = hookDurationFrames;
  const sceneTimeline = (scenes || []).map((scene, idx) => {
    const from = currentFrom;
    const duration = Math.max(1, Math.round((scene.durationSec || 4) * fps));
    currentFrom += duration;
    return {
      scene,
      from,
      duration,
      imageSrc: getImageForIndex(scene.imageIndex ?? idx),
      index: idx,
    };
  });

  const ctaFrom = currentFrom;

  // Video progress bar percent
  const progressPercent = Math.min(100, (frame / durationInFrames) * 100);

  return (
    <AbsoluteFill
      style={{
        backgroundColor: theme?.bgColor || "#0F172A",
        fontFamily:
          "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
      }}
    >
      {/* 🎵 1. AUDIO LAYER: Background Music (BGM) */}
      {bgmUrl && (
        <Audio
          src={resolveMediaSrc(bgmUrl)}
          volume={0.15}
          loop
        />
      )}

      {/* 🗣️ 2. AUDIO LAYER: AI Voiceover Narration */}
      {voiceoverUrl && (
        <Audio
          src={resolveMediaSrc(voiceoverUrl)}
          volume={1.0}
        />
      )}

      {/* 💥 3. SOUND EFFECTS: Transitions & Price Reveals */}
      <Sequence from={2} durationInFrames={15}>
        <Audio src={resolveMediaSrc("/audio/sfx-pop.mp3")} volume={0.6} />
      </Sequence>

      {sceneTimeline.map((item) => (
        <Sequence
          key={`sfx-whoosh-${item.index}`}
          from={item.from}
          durationInFrames={15}
        >
          <Audio src={resolveMediaSrc("/audio/sfx-whoosh.mp3")} volume={0.5} />
        </Sequence>
      ))}

      <Sequence from={ctaFrom} durationInFrames={20}>
        <Audio src={resolveMediaSrc("/audio/sfx-ding.mp3")} volume={0.7} />
      </Sequence>

      {/* 🎬 4. VISUAL SCENES */}
      <Sequence from={0} durationInFrames={hookDurationFrames}>
        <HookScene
          hook={hook}
          imageSrc={getImageForIndex(0)}
          primaryColor={primaryColor}
          accentColor={accentColor}
        />
      </Sequence>

      {sceneTimeline.map((item) => (
        <Sequence
          key={`scene-${item.index}`}
          from={item.from}
          durationInFrames={item.duration}
        >
          <FeatureScene
            scene={item.scene}
            imageSrc={item.imageSrc}
            sceneIndex={item.index}
            totalScenes={sceneTimeline.length}
            primaryColor={primaryColor}
            accentColor={accentColor}
          />
        </Sequence>
      ))}

      <Sequence from={ctaFrom} durationInFrames={ctaDurationFrames}>
        <CTAScene
          cta={cta}
          imageSrc={getImageForIndex(safeImages.length - 1)}
          price={price}
          primaryColor={primaryColor}
          accentColor={accentColor}
        />
      </Sequence>

      {/* 🛒 5. FLOATING SHOPEE CART BADGE (Safe-Zone calibrated) */}
      <ShopeeCartBadge
        productName={productName}
        price={price}
        primaryColor={primaryColor}
      />

      {/* ⏱️ 6. TOP VIDEO PROGRESS BAR */}
      <div
        style={{
          position: "absolute",
          top: "16px",
          left: "24px",
          right: "24px",
          height: "6px",
          background: "rgba(255, 255, 255, 0.25)",
          borderRadius: "3px",
          overflow: "hidden",
          zIndex: 60,
        }}
      >
        <div
          style={{
            height: "100%",
            width: `${progressPercent}%`,
            background: `linear-gradient(90deg, ${primaryColor} 0%, ${accentColor} 100%)`,
            transition: "width 0.05s linear",
          }}
        />
      </div>
    </AbsoluteFill>
  );
};
