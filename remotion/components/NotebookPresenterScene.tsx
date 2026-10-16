import React from "react";
import { AbsoluteFill, Img, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { fitText } from "@remotion/layout-utils";
import { FONTS, PALETTE } from "../lib/palette";
import { splitSafeThaiLines } from "../lib/thaiKeep";
import { MediaElement } from "../paper/CutoutImage";
import type { CaptionCue, CaptionSettings, CTAData, HookData, SceneData } from "../types";
import { resolveMediaSrc } from "../utils";
import { mascotFrameUrl, MascotAnimation } from "../lib/mascotAnimation";

export const DEFAULT_PRESENTER = "/mascot/presenter.png";
const INK = PALETTE.ink;
const PAPERS = ["#F8F2D9", "#E6EEE1", "#E3EDF3", "#F3E4E3"];
const LABELS = ["#E83E35", "#30965C", "#3379C5", "#E83E35"];
const clean = (text = "") => text.replace(/[\p{Extended_Pictographic}\uFE0F\u200D]/gu, "").trim();

const Sticker: React.FC<{ children: React.ReactNode; color?: string; style?: React.CSSProperties }> = ({ children, color = PALETTE.markerYellow, style }) => (
  <div style={{ background: color, color: INK, border: `4px solid ${INK}`, borderRadius: "8px 12px 7px 10px", boxShadow: `4px 5px 0 ${INK}`, padding: "12px 24px", lineHeight: 1.3, ...style }}>{children}</div>
);

function Star({ x, y, color, rotate = 0 }: { x: number; y: number; color: string; rotate?: number }) {
  return <svg viewBox="0 0 100 100" style={{ position: "absolute", left: x, top: y, width: 72, height: 72, transform: `rotate(${rotate}deg)` }} aria-hidden>
    <polygon points="50,0 58,31 82,10 72,39 100,45 74,56 91,83 62,70 51,100 43,72 14,91 29,61 0,51 30,42 12,15 40,30" fill={color} />
  </svg>;
}

/** Shared by preview and MP4: the presenter and product always have separate space. */
export const NotebookPresenterScene: React.FC<{
  data: HookData | SceneData | CTAData;
  role: string;
  index: number;
  imageSrc: string;
  mascotUrl?: string;
  mascotAnimation?: MascotAnimation;
  price: string;
  captionCues?: CaptionCue[];
  captionSettings?: CaptionSettings;
  startFrame?: number;
  still?: boolean;
}> = ({ data, role, index, imageSrc, mascotUrl = DEFAULT_PRESENTER, mascotAnimation, price, captionCues = [], captionSettings, startFrame = 0, still = false }) => {
  const currentFrame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const frame = still ? 45 : currentFrame;
  const enter = 0.7 + 0.3 * spring({ frame, fps, config: { damping: 18, stiffness: 180 } });
  const headline = clean("headline" in data ? data.headline : "highlightTitle" in data ? data.highlightTitle : data.ctaTitle);
  const description = clean("subheadline" in data ? data.subheadline : "highlightDesc" in data ? data.highlightDesc : "ctaSubtitle" in data ? data.ctaSubtitle : "");
  const badge = clean("stickerText" in data ? data.stickerText : "badgeText" in data ? data.badgeText : "") || (role === "hook" ? "ไอเทมน่าใช้" : role === "cta" ? "พิกัดสินค้า" : "รู้จักให้มากขึ้น");
  const lines = splitSafeThaiLines(headline, 17, 4);
  const headlineFontSize = Math.min(76, ...lines.map((text) => fitText({ text, fontFamily: FONTS.heading, fontWeight: 800, withinWidth: 780 }).fontSize));
  const color = LABELS[index % LABELS.length];
  const grid = index % 2 === 1;
  const seconds = (currentFrame + startFrame) / fps;
  const cue = captionCues.find((c) => seconds >= c.startSec && seconds < c.endSec);
  const language = captionSettings?.language || "th";
  const caption = cue ? (language === "en" ? cue.en || cue.text : cue.text) : "";
  // Phrase stickers retain the real alignment interval; no invented word timestamps.
  const captionParts = caption ? splitSafeThaiLines(caption, 12, 6) : [];
  const captionTop = captionSettings?.position === "top" ? 600 : captionSettings?.position === "center" ? 1020 : 1390;
  const drift = Math.sin(Math.floor(frame / 4) / 7);
  return <AbsoluteFill style={{ backgroundColor: PAPERS[index % PAPERS.length], color: INK, fontFamily: FONTS.heading, overflow: "hidden" }}>
    <AbsoluteFill style={{ opacity: 0.3, backgroundImage: grid
      ? "linear-gradient(#92A59C 1px, transparent 1px), linear-gradient(90deg, #92A59C 1px, transparent 1px)"
      : "repeating-linear-gradient(0deg, transparent, transparent 45px, #8294B3 46px, transparent 48px)", backgroundSize: grid ? "40px 40px" : undefined }} />
    <div style={{ position: "absolute", top: 0, left: 96, bottom: 0, borderLeft: "2px solid rgba(197,96,86,0.2)" }} />
    <Star x={838} y={236} color={color} rotate={15} />
    <Star x={824} y={1270} color={PALETTE.markerYellow} rotate={-12} />
    <Star x={95} y={669} color={LABELS[2]} rotate={25} />

    <div style={{ position: "absolute", top: 245, left: 150, width: 660, textAlign: "center", transform: `rotate(-1deg) scale(${0.96 + enter * 0.04})`, fontSize: badge.length > 24 ? 30 : 38, fontWeight: 700 }}>
      <Sticker color={color} style={{ color: "white", borderRadius: 2, borderStyle: "dashed", padding: "15px 24px" }}>{badge}</Sticker>
    </div>
    <div style={{ position: "absolute", left: 85, top: 380, width: 800, textAlign: "center", fontSize: headlineFontSize, fontWeight: 800, lineHeight: 1.25, WebkitTextStroke: "12px white", paintOrder: "stroke fill", filter: `drop-shadow(3px 5px 0 ${INK})`, transform: `translateY(${(1 - enter) * 24}px)`, opacity: Math.min(1, enter * 2) }}>
      {lines.map((line, i) => <div key={i}>{line}</div>)}
    </div>
    {role === "cta" && description && <div style={{ position: "absolute", top: 590, left: 100, width: 770, textAlign: "center", fontSize: 30, lineHeight: 1.4 }}>{description}</div>}

    <div style={{ position: "absolute", left: 430, top: 700, width: 445, height: 550, padding: "16px 16px 64px", background: "white", border: `4px solid ${INK}`, borderRadius: "10px 6px 14px 8px", boxShadow: `7px 9px 0 ${INK}25`, transform: `translateY(${(1 - enter) * 90}px) rotate(${index % 2 ? 2 : -2}deg) scale(${0.92 + enter * 0.08})`, opacity: Math.min(1, enter * 2) }}>
      <MediaElement src={imageSrc} videoStartSec={data.videoStartSec} videoEndSec={data.videoEndSec} videoFillMode={data.videoFillMode} videoAudioMode={data.videoAudioMode} style={{ width: "100%", height: "100%", objectFit: "contain" }} />
      <div style={{ position: "absolute", height: 35, width: 150, left: 145, top: -18, background: "rgba(231,198,130,0.75)", transform: "rotate(-6deg)" }} />
      <div style={{ position: "absolute", bottom: 14, left: 16, right: 16, textAlign: "center", fontFamily: FONTS.handwriting, fontSize: 25 }}>{role === "cta" ? clean((data as CTAData).buttonText) || "พิกัดในตะกร้า" : "ดูใกล้ ๆ น่าใช้แค่ไหน"}</div>
    </div>
    {mascotUrl && <Img src={resolveMediaSrc(mascotFrameUrl(mascotUrl, mascotAnimation, seconds))} style={{ position: "absolute", left: 32, top: 810, width: 455, height: 569, objectFit: "contain", mixBlendMode: mascotUrl === DEFAULT_PRESENTER ? "multiply" : "normal", transformOrigin: "50% 95%", transform: mascotUrl === DEFAULT_PRESENTER && !mascotAnimation ? `translateY(${drift * 4 + (1 - enter) * 30}px) rotate(${drift * 0.7}deg)` : undefined, opacity: Math.min(1, enter * 2) }} />}
    <div style={{ position: "absolute", top: 1280, left: 430, width: 440, display: "flex", justifyContent: "center", transform: "rotate(2deg)", fontSize: role === "cta" ? 42 : 28, fontWeight: 700, textAlign: "center" }}>
      <Sticker color={role === "cta" ? PALETTE.markerYellow : "white"} style={{ maxWidth: "100%", overflowWrap: "anywhere", ...(role === "cta" && price ? { fontSize: Math.min(42, fitText({ text: price, fontFamily: FONTS.heading, fontWeight: 700, withinWidth: 370 }).fontSize) } : {}) }}>
        {role === "cta" ? price || clean((data as CTAData).buttonText) : description || badge}
      </Sticker>
    </div>
    {captionSettings?.enabled !== false && (!captionSettings?.style || captionSettings.style === "tiktok-pop") && captionParts.length > 0 && <div style={{ position: "absolute", left: 78, top: captionTop, width: 810, display: "flex", flexWrap: "wrap", justifyContent: "center", alignItems: "center", gap: 12, fontFamily: FONTS.caption, fontSize: captionSettings?.fontSize || 42, fontWeight: 800 }}>
      {captionParts.map((part, i) => <Sticker key={i} color={i % 2 ? "white" : captionSettings?.highlightColor || PALETTE.markerYellow} style={{ padding: "8px 16px", transform: `rotate(${i % 2 ? 1 : -2}deg)`, maxWidth: "100%", overflowWrap: "anywhere" }}>{part}</Sticker>)}
      {language === "both" && cue?.en && <div style={{ width: "100%", fontSize: 28, textAlign: "center", background: PAPERS[index % PAPERS.length] }}>{cue.en}</div>}
    </div>}
    <div style={{ position: "absolute", bottom: 180, left: 78, width: 810, borderTop: `2px solid ${INK}25`, paddingTop: 16, fontFamily: FONTS.handwriting, fontSize: 22, display: "flex", justifyContent: "space-between", opacity: 0.6 }}>
      <span>{role === "cta" ? clean((data as CTAData).basketNote) || "บันทึกไอเทมน่าใช้" : "บันทึกไอเทมน่าใช้"}</span><span>{String(index + 1).padStart(2, "0")}</span>
    </div>
  </AbsoluteFill>;
};
