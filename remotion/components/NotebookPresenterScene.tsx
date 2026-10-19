import React from "react";
import { AbsoluteFill, Img, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { fitText } from "@remotion/layout-utils";
import { FONTS, PALETTE } from "../lib/palette";
import { splitSafeThaiLines } from "../lib/thaiKeep";
import { MediaElement } from "../paper/CutoutImage";
import type { CaptionCue, CaptionSettings, CTAData, HookData, SceneData } from "../types";
import { isVideoMedia, resolveMediaSrc } from "../utils";
import { mascotFrameUrl, MascotAnimation, MascotPoseClip } from "../lib/mascotAnimation";
import { MascotPaperCut } from "./MascotPaperCut";
import { CheckChips } from "./CheckChips";
import { PopHeadline } from "./PopHeadline";

/** Product frame box on the 1080×1920 canvas: kept inside the safe zone (x ≤ 910, y ≤ 1520). */
const FRAME = { left: 290, top: 640, width: 610, height: 760 };
const short = (items: string[], max: number) => items.length >= 2 && items.length <= 3 && items.every((t) => t.length > 0 && t.length <= max);

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
  /** Pose chosen for this scene; when set the mascot holds it instead of cycling every GIF frame. */
  mascotClip?: MascotPoseClip;
  price: string;
  captionCues?: CaptionCue[];
  captionSettings?: CaptionSettings;
  startFrame?: number;
  still?: boolean;
}> = ({ data, role, index, imageSrc, mascotUrl = DEFAULT_PRESENTER, mascotAnimation, mascotClip, price, captionCues = [], captionSettings, startFrame = 0, still = false }) => {
  const currentFrame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const frame = still ? 45 : currentFrame;
  const enter = 0.7 + 0.3 * spring({ frame, fps, config: { damping: 18, stiffness: 180 } });
  const headline = clean("headline" in data ? data.headline : "highlightTitle" in data ? data.highlightTitle : data.ctaTitle);
  const description = clean("subheadline" in data ? data.subheadline : "highlightDesc" in data ? data.highlightDesc : "ctaSubtitle" in data ? data.ctaSubtitle : "");
  const badge = clean("stickerText" in data ? data.stickerText : "badgeText" in data ? data.badgeText : "") || (role === "hook" ? "ไอเทมน่าใช้" : role === "cta" ? "พิกัดสินค้า" : "รู้จักให้มากขึ้น");
  const givenLines = (data.headlineLines || []).map(clean).filter(Boolean);
  const lines = givenLines.length > 0 && givenLines.length <= 3 ? givenLines : splitSafeThaiLines(headline, 14, 3);
  const grow = spring({ frame, fps, config: { damping: 12, stiffness: 160, mass: 0.8 } });
  const givenPoints = (data.popPoints || []).map(clean).filter(Boolean);
  const captionPoints = (data.captionLines || []).map(clean).filter(Boolean);
  const chips = role === "cta"
    ? (description ? [description] : [])
    : short(givenPoints, 16) ? givenPoints
    : short(captionPoints, 16) ? captionPoints
    : description ? splitSafeThaiLines(description, 14, 3) : [];
  const color = LABELS[index % LABELS.length];
  const grid = index % 2 === 1;
  const seconds = (currentFrame + startFrame) / fps;
  const cue = captionCues.find((c) => seconds >= c.startSec && seconds < c.endSec);
  const language = captionSettings?.language || "th";
  const caption = cue ? (language === "en" ? cue.en || cue.text : cue.text) : "";
  // Phrase stickers retain the real alignment interval; no invented word timestamps.
  const captionParts = caption ? splitSafeThaiLines(caption, 12, 6) : [];
  const captionTop = captionSettings?.position === "top" ? 600 : captionSettings?.position === "center" ? 1020 : 1430;
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
    <div style={{ position: "absolute", left: 80, top: 345, width: 820, height: 280, display: "flex", justifyContent: "center", alignItems: "center" }}>
      <PopHeadline lines={lines} highlightWord={"highlightWord" in data ? clean(data.highlightWord) : undefined} accent={color} frame={frame} fps={fps} width={820} maxHeight={270} />
    </div>

    <div style={{ position: "absolute", ...FRAME, padding: 14, background: "white", border: `4px solid ${INK}`, borderRadius: "10px 6px 14px 8px", boxShadow: `9px 11px 0 ${INK}25`, transform: `translateY(${(1 - enter) * 60}px) rotate(${index % 2 ? 1.5 : -1.5}deg) scale(${0.6 + grow * 0.4})`, opacity: Math.min(1, grow * 3) }}>
      <MediaElement src={imageSrc} videoStartSec={data.videoStartSec} videoEndSec={data.videoEndSec} videoFillMode={data.videoFillMode} videoAudioMode={data.videoAudioMode} style={{ width: "100%", height: "100%", objectFit: isVideoMedia(imageSrc) ? "cover" : "contain", borderRadius: 4 }} />
      <div style={{ position: "absolute", height: 38, width: 170, left: FRAME.width / 2 - 85, top: -20, background: "rgba(231,198,130,0.75)", transform: "rotate(-6deg)" }} />
    </div>
    {chips.length > 0 && <div style={{ position: "absolute", right: 1080 - FRAME.left - FRAME.width + 10, top: 770 }}>
      <CheckChips items={chips} accent={color} frame={frame} fps={fps} showCheck={role !== "cta"} sfx={!still} />
    </div>}
    {mascotUrl === DEFAULT_PRESENTER
      ? <Img src={resolveMediaSrc(mascotFrameUrl(mascotUrl, mascotAnimation, seconds))} style={{ position: "absolute", left: 16, top: 990, width: 340, height: 425, objectFit: "contain", mixBlendMode: "multiply", transformOrigin: "50% 95%", transform: !mascotAnimation ? `translateY(${drift * 4 + (1 - enter) * 30}px) rotate(${drift * 0.7}deg)` : undefined, opacity: Math.min(1, enter * 2) }} />
      : mascotUrl && <MascotPaperCut
        id={`s${index}`}
        frame={frame}
        src={resolveMediaSrc(mascotClip ? mascotFrameUrl(mascotUrl, mascotClip, frame / fps) : mascotFrameUrl(mascotUrl, mascotAnimation, seconds))}
        style={{ position: "absolute", left: 16, top: 990, width: 340, height: 425, objectFit: "contain", transformOrigin: "50% 95%", transform: `translateY(${(1 - enter) * 30}px)`, opacity: Math.min(1, enter * 2) }}
      />}
    {role === "cta" && <div style={{ position: "absolute", top: 1300, left: 380, width: 500, display: "flex", justifyContent: "center", transform: "rotate(2deg)", fontSize: 42, fontWeight: 700, textAlign: "center" }}>
      <Sticker color={PALETTE.markerYellow} style={{ maxWidth: "100%", overflowWrap: "anywhere", ...(price ? { fontSize: Math.min(42, fitText({ text: price, fontFamily: FONTS.heading, fontWeight: 700, withinWidth: 430 }).fontSize) } : {}) }}>
        {price || clean((data as CTAData).buttonText)}
      </Sticker>
    </div>}
    {captionSettings?.enabled !== false && (!captionSettings?.style || captionSettings.style === "tiktok-pop") && captionParts.length > 0 && <div style={{ position: "absolute", left: 78, top: captionTop, width: 810, display: "flex", flexWrap: "wrap", justifyContent: "center", alignItems: "center", gap: 12, fontFamily: FONTS.caption, fontSize: captionSettings?.fontSize || 42, fontWeight: 800 }}>
      {captionParts.map((part, i) => <Sticker key={i} color={i % 2 ? "white" : captionSettings?.highlightColor || PALETTE.markerYellow} style={{ padding: "8px 16px", transform: `rotate(${i % 2 ? 1 : -2}deg)`, maxWidth: "100%", overflowWrap: "anywhere" }}>{part}</Sticker>)}
      {language === "both" && cue?.en && <div style={{ width: "100%", fontSize: 28, textAlign: "center", background: PAPERS[index % PAPERS.length] }}>{cue.en}</div>}
    </div>}
    <div style={{ position: "absolute", bottom: 180, left: 78, width: 810, borderTop: `2px solid ${INK}25`, paddingTop: 16, fontFamily: FONTS.handwriting, fontSize: 22, display: "flex", justifyContent: "space-between", opacity: 0.6 }}>
      <span>{role === "cta" ? clean((data as CTAData).basketNote) || "บันทึกไอเทมน่าใช้" : "บันทึกไอเทมน่าใช้"}</span><span>{String(index + 1).padStart(2, "0")}</span>
    </div>
  </AbsoluteFill>;
};
