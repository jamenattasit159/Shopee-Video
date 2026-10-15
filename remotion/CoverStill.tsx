import React from "react";
import { AbsoluteFill } from "remotion";
import { CutoutImage } from "./paper/CutoutImage";
import { PaperBackground, PaperTheme } from "./paper/PaperBackground";
import { PaperFilters } from "./paper/PaperFilters";
import { PriceBurst } from "./paper/PriceBurst";
import { StickerText } from "./paper/StickerText";
import { TornStrip } from "./paper/TornStrip";
import { WashiTape } from "./paper/WashiTape";
import { ShopeeProductVideoProps } from "./types";

export const CoverStill: React.FC<ShopeeProductVideoProps> = ({
  productName,
  price,
  images,
  cutoutImages,
  hook,
  theme,
  styleDNA,
}) => {
  const heroImage =
    (cutoutImages && cutoutImages.length > 0 && cutoutImages[0]) ||
    (images && images.length > 0 && images[0]) ||
    "/samples/tumbler-1.svg";

  const headline = hook?.headline || productName || "สินค้าแนะนำ";
  const headlineLines =
    hook?.headlineLines && hook.headlineLines.length > 0
      ? hook.headlineLines
      : [headline.slice(0, 14), headline.slice(14, 28)].filter(Boolean);

  const subheadline = hook?.subheadline || "ช้อปปี้ป้ายยา คุ้มเกินราคา";
  const badgeText = hook?.badgeText || "🌟 ไอเทมเด็ด";
  const paperTheme = (hook?.paperTheme as PaperTheme) || "cream-grid";

  return (
    <AbsoluteFill className="overflow-hidden font-sans select-none bg-stone-100">
      <PaperFilters seed={styleDNA?.seed || 42} />

      {/* Layer 1: Texture & Background */}
      <PaperBackground
        packId={styleDNA?.pack}
        theme={paperTheme}
        bg={styleDNA?.bgColor || theme?.bgColor}
      />

      {/* Layer 2: Decorative Washi Tape at Top */}
      <div className="absolute top-16 left-1/2 -translate-x-1/2 z-10">
        <WashiTape id="cover-top-tape" width={280} rotate={-3} pattern="striped" />
      </div>

      {/* Layer 3: Top Badge */}
      <div className="absolute top-36 left-1/2 -translate-x-1/2 z-20">
        <StickerText id="cover-badge" text={badgeText} fontSize={56} rotate={-2} />
      </div>

      {/* Layer 4: Main Headline Torn Strip */}
      <div className="absolute top-64 left-1/2 -translate-x-1/2 z-30 flex flex-col items-center gap-3 w-[880px]">
        {headlineLines.map((line, idx) => (
          <TornStrip
            key={idx}
            id={`cover-headline-${idx}`}
            text={line}
            fontSize={88}
            rotate={idx % 2 === 0 ? -1.5 : 1.5}
            bg={idx === 0 ? styleDNA?.primaryColor || "#dc2626" : styleDNA?.secondaryColor || "#1e293b"}
            textColor="#ffffff"
          />
        ))}
        {subheadline && (
          <div className="mt-2">
            <StickerText id="cover-subheadline" text={subheadline} fontSize={52} rotate={1} />
          </div>
        )}
      </div>

      {/* Layer 5: Hero Product Image/Video Frame */}
      <div className="absolute top-[680px] left-1/2 -translate-x-1/2 z-20">
        <CutoutImage
          id="cover-hero"
          src={heroImage}
          isPolaroid
          polaroidCaption={productName.slice(0, 24)}
          baseRotate={-3}
          width={760}
        />
      </div>

      {/* Layer 6: Price Burst Sticker */}
      <div className="absolute top-[1380px] right-14 z-40">
        <PriceBurst price={price || "฿199"} rotate={8} size={540} />
      </div>

      {/* Layer 7: Bottom CTA Banner */}
      <div className="absolute bottom-24 left-1/2 -translate-x-1/2 z-30">
        <TornStrip
          id="cover-bottom-cta"
          text="🛒 พิกัดในตะกร้าส้มซ้ายล่าง รีบกดก่อนโค้ดหมด!"
          fontSize={60}
          rotate={-1}
          bg="#ea580c"
          textColor="#ffffff"
        />
      </div>
    </AbsoluteFill>
  );
};
