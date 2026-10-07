"use client";

import {
  Check,
  CheckCircle2,
  Copy,
  Download,
  Film,
  Music,
  Play,
  Sparkles,
  Video,
  Volume2,
} from "lucide-react";
import React, { useState } from "react";
import { ShopeeProductVideoProps } from "../../remotion/types";
import { generatePostCaptions } from "../lib/captions";

interface RenderExportModalProps {
  productId?: string;
  productName?: string;
  price?: string;
  highlights?: string;
  videoProps: ShopeeProductVideoProps;
  initialVideoUrl?: string;
  onVideoRendered?: (url: string) => void;
}

export const RenderExportModal: React.FC<RenderExportModalProps> = ({
  productId,
  productName = "สินค้า Shopee",
  price = "฿199",
  highlights = "",
  videoProps,
  initialVideoUrl,
  onVideoRendered,
}) => {
  const [isRendering, setIsRendering] = useState(false);
  const [renderedUrl, setRenderedUrl] = useState<string | null>(
    initialVideoUrl || null
  );
  const [renderMessage, setRenderMessage] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [copiedCaptionIndex, setCopiedCaptionIndex] = useState<number | null>(null);

  const [renderTimestamp, setRenderTimestamp] = useState<number>(Date.now());

  // Sync if initialVideoUrl changes or product changes
  React.useEffect(() => {
    setRenderedUrl(initialVideoUrl || null);
    setRenderTimestamp(Date.now());
  }, [initialVideoUrl, productId]);

  const handleRender = async () => {
    setIsRendering(true);
    setError(null);

    let activeVoiceUrl = videoProps.voiceoverUrl;
    if (!activeVoiceUrl && videoProps.hook) {
      setRenderMessage("กำลังบันทึกเสียงพากย์ AI อัตโนมัติ (Edge TTS)...");
      try {
        const voiceRes = await fetch("/api/synthesize-voice", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            productName: videoProps.productName || productName,
            price: videoProps.price || price,
            storyboard: {
              hook: videoProps.hook,
              scenes: videoProps.scenes,
              cta: videoProps.cta,
            },
            voiceType: "female",
          }),
        });
        const voiceData = await voiceRes.json();
        if (voiceData.success && voiceData.audioUrl) {
          activeVoiceUrl = voiceData.audioUrl;
        }
      } catch (voiceErr) {
        console.warn("Auto-synthesizing voice failed, continuing with BGM only:", voiceErr);
      }
    }

    setRenderMessage("กำลังส่งข้อมูลไปยัง Remotion Rendering Engine...");

    try {
      setRenderMessage("กำลังเรนเดอร์ภาพและแทร็กเสียง (Rendering 1080x1920 MP4 + Audio)...");
      const res = await fetch("/api/render-video", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId: productId || `prod_${Date.now()}`,
          props: {
            ...videoProps,
            voiceoverUrl: activeVoiceUrl,
          },
        }),
      });

      const data = await res.json();
      if (data.success && data.videoUrl) {
        setRenderedUrl(data.videoUrl);
        setRenderTimestamp(Date.now());
        setRenderMessage("เรนเดอร์วิดีโอสำเร็จ!");
        if (onVideoRendered) {
          onVideoRendered(data.videoUrl);
        }
      } else {
        throw new Error(data.error || "เกิดข้อผิดพลาดในการเรนเดอร์");
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to render video");
    } finally {
      setIsRendering(false);
    }
  };

  const captions = generatePostCaptions(
    videoProps.productName || productName,
    videoProps.price || price,
    highlights || videoProps.hook?.headline || "",
    videoProps.cta?.ctaTitle,
    (videoProps as any).originalUrl
  );

  const copyCaption = (text: string, index: number) => {
    navigator.clipboard.writeText(text);
    setCopiedCaptionIndex(index);
    setTimeout(() => setCopiedCaptionIndex(null), 3000);
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b border-slate-800">
        <div>
          <span className="text-xs font-bold text-emerald-400 bg-emerald-950/60 border border-emerald-800/60 px-2.5 py-1 rounded-full uppercase tracking-wider">
            Step 4: One-Click Render & Export
          </span>
          <h2 className="text-xl font-bold text-white mt-1.5 flex items-center gap-2">
            <span>🎬 เรนเดอร์และส่งออกไฟล์วิดีโอ (MP4 1080x1920 พร้อมเสียง)</span>
          </h2>
        </div>
      </div>

      {/* Render Trigger Section */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-4 bg-slate-950 p-5 rounded-xl border border-slate-800/80">
        <div>
          <h3 className="font-bold text-white text-base flex items-center gap-2">
            <Film className="w-5 h-5 text-orange-400" />
            <span>สร้างไฟล์วิดีโอระดับมืออาชีพสำหรับ Shopee / TikTok</span>
          </h3>
          <p className="text-xs text-slate-400 mt-1">
            รวมภาพเคลื่อนไหว Ken Burns, เสียงเพลง BGM, เสียงเอฟเฟกต์ SFX, เสียงพากย์ AI และจัดเลย์เอาต์หลบ Red Zone
          </p>
        </div>

        <button
          type="button"
          onClick={handleRender}
          disabled={isRendering}
          className="w-full md:w-auto shopee-gradient-btn text-white font-bold py-3.5 px-7 rounded-xl flex items-center justify-center gap-2.5 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap cursor-pointer"
        >
          {isRendering ? (
            <>
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              <span>กำลังเรนเดอร์ MP4 + เสียง...</span>
            </>
          ) : (
            <>
              <Video className="w-5 h-5" />
              <span>เริ่มเรนเดอร์วิดีโอ (Render MP4)</span>
            </>
          )}
        </button>
      </div>

      {/* Status / Error feedback */}
      {isRendering && (
        <div className="bg-orange-950/30 border border-orange-800/50 rounded-xl p-4 flex items-center gap-3">
          <div className="w-6 h-6 border-2 border-orange-400 border-t-transparent rounded-full animate-spin flex-shrink-0" />
          <div className="text-xs text-orange-200">
            <span className="font-semibold block">{renderMessage}</span>
            <span className="text-orange-300/70">
              การเรนเดอร์ใช้เวลาประมาณ 15 - 25 วินาที ผ่าน Remotion Headless Chromium + FFMPEG
            </span>
          </div>
        </div>
      )}

      {error && (
        <div className="bg-red-950/40 border border-red-800 rounded-xl p-4 text-xs text-red-300">
          <span className="font-bold">เกิดข้อผิดพลาดในการเรนเดอร์:</span> {error}
        </div>
      )}

      {/* Rendered Output Display */}
      {renderedUrl && !isRendering && (
        <div className="bg-slate-950 border border-emerald-800/40 rounded-xl p-5 space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-400" />
              <span className="font-bold text-emerald-400 text-sm">
                ไฟล์ MP4 พร้อมเสียงเสร็จสมบูรณ์แล้ว!
              </span>
            </div>
            <a
              href={renderedUrl}
              download
              className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs py-2 px-4 rounded-lg flex items-center gap-1.5 shadow transition"
            >
              <Download className="w-4 h-4" />
              <span>ดาวน์โหลดไฟล์ MP4</span>
            </a>
          </div>

          {/* Video Preview */}
          <div className="flex flex-col md:flex-row items-center gap-6">
            <div className="w-48 aspect-[9/16] bg-black rounded-xl overflow-hidden border border-slate-700 shadow-md">
              <video
                key={`${renderedUrl}_${renderTimestamp}`}
                src={`${renderedUrl}?t=${renderTimestamp}`}
                controls
                autoPlay
                loop
                className="w-full h-full object-cover"
              />
            </div>

            <div className="space-y-3 text-xs text-slate-300 flex-1">
              <div>
                <span className="text-slate-400 block">ตำแหน่งไฟล์ในเครื่อง:</span>
                <code className="text-emerald-300 bg-slate-900 px-2 py-1 rounded block mt-1 break-all">
                  {renderedUrl} (บันทึกไว้ที่ ./public{renderedUrl} และ ./renders/)
                </code>
              </div>
              <div>
                <span className="text-slate-400 block">สเปคไฟล์:</span>
                <span className="font-semibold text-white">
                  1080 x 1920 (Vertical 9:16), 30 FPS, H.264 Video + AAC Audio
                </span>
              </div>
              <div className="flex items-center gap-2 pt-1 text-emerald-400">
                <Volume2 className="w-4 h-4" />
                <span>
                  {videoProps.voiceoverUrl
                    ? "บรรจุเสียงพากย์ AI + เพลง BGM + ซาวด์เอฟเฟกต์เรียบร้อย"
                    : "บรรจุเพลง BGM + ซาวด์เอฟเฟกต์เรียบร้อย"}
                </span>
              </div>
              <div className="pt-2">
                <a
                  href={renderedUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-orange-400 hover:underline"
                >
                  <Play className="w-3.5 h-3.5" />
                  <span>เปิดดูในแท็บใหม่เต็มจอ</span>
                </a>
              </div>
            </div>
          </div>

          {/* 📋 Quick-Copy Post Captions & Hashtags */}
          <div className="pt-4 border-t border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-orange-400" />
                <span>แคปชั่นสำหรับก๊อปปี้ไปวางตอนลงคลิป (เลือกสไตล์ที่ชอบ):</span>
              </span>
            </div>

            <div className="space-y-2.5">
              {captions.map((cap, idx) => (
                <div
                  key={idx}
                  className="bg-slate-900 border border-slate-800 rounded-xl p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                >
                  <div className="flex-1 pr-2 truncate">
                    <span className="font-bold text-orange-400 block mb-0.5">
                      {cap.styleName}
                    </span>
                    <span className="text-slate-300 block truncate font-mono text-[11px]">
                      {cap.captionText.split("\n")[0]}...
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => copyCaption(cap.fullPost, idx)}
                    className={`text-xs px-3 py-1.5 rounded-lg font-bold flex items-center gap-1.5 transition flex-shrink-0 ${
                      copiedCaptionIndex === idx
                        ? "bg-emerald-600 text-white"
                        : "bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white"
                    }`}
                  >
                    {copiedCaptionIndex === idx ? (
                      <>
                        <Check className="w-3.5 h-3.5" />
                        <span>คัดลอกแล้ว!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>คัดลอกแคปชั่นนี้</span>
                      </>
                    )}
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
