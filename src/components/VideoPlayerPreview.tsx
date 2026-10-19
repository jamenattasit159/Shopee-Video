"use client";

import { Player } from "@remotion/player";
import { Eye, EyeOff, ShieldAlert, Smartphone, Sparkles, Volume2 } from "lucide-react";
import React, { useState, useEffect } from "react";
import { SafeZoneOverlay } from "../../remotion/components/SafeZoneOverlay";
import { calculateTotalFrames } from "../../remotion/Root";
import { ShopeeProductVideo } from "../../remotion/ShopeeProductVideo";
import { ShopeeProductVideoProps } from "../../remotion/types";
import { dispatchError } from "@/lib/errorStore";
import { toAppError } from "@/lib/errors";

interface VideoPlayerPreviewProps {
  props: ShopeeProductVideoProps;
  enabled?: boolean;
  showSafeZone?: boolean;
  onToggleSafeZone?: (show: boolean) => void;
}

export const VideoPlayerPreview: React.FC<VideoPlayerPreviewProps> = ({
  props,
  enabled = true,
  showSafeZone: controlledShowSafeZone,
  onToggleSafeZone,
}) => {
  const [internalSafeZone, setInternalSafeZone] = useState(false);
  const showSafeZone =
    typeof controlledShowSafeZone === "boolean"
      ? controlledShowSafeZone
      : internalSafeZone;

  const toggleSafeZone = () => {
    const nextVal = !showSafeZone;
    if (onToggleSafeZone) {
      onToggleSafeZone(nextVal);
    } else {
      setInternalSafeZone(nextVal);
    }
  };

  const [prepared, setPrepared] = useState<ShopeeProductVideoProps | null>(null);
  const [preparationError, setPreparationError] = useState<string | null>(null);
  const sourceKey = JSON.stringify(props);
  useEffect(() => {
    const controller = new AbortController();
    setPrepared(null);
    setPreparationError(null);
    if (!enabled) return () => controller.abort();
    const timer = setTimeout(async () => {
      try {
        const response = await fetch("/api/prepare-video", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ props: JSON.parse(sourceKey) }), signal: controller.signal });
        const data = await response.json();
        if (!response.ok) throw new Error(typeof data.error === "string" ? data.error : "เตรียมวิดีโอไม่สำเร็จ");
        if (!controller.signal.aborted) setPrepared(data.props);
      } catch (err) {
        if (!controller.signal.aborted) setPreparationError(err instanceof Error ? err.message : "เตรียมวิดีโอไม่สำเร็จ");
      }
    }, 500);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [sourceKey, enabled]);
  const durationInFrames = prepared ? calculateTotalFrames(prepared, 30) : 30;
  const durationSec = (durationInFrames / 30).toFixed(1);

  return (
    <div className="bg-base-100 border border-base-300 rounded-2xl p-6 shadow-xs flex flex-col items-center relative">
      {/* Header */}
      <div className="w-full flex items-center justify-between pb-4 border-b border-base-300 mb-4">
        <div>
          <span className="badge badge-primary badge-outline text-xs font-semibold tracking-wider">
            ขั้นตอนที่ 3: พรีวิววิดีโอแบบเรียลไทม์
          </span>
          <h2 className="text-xl font-bold text-base-content mt-1.5 flex items-center gap-2">
            <Smartphone className="w-5 h-5 text-primary" />
            <span>พรีวิววิดีโอสด 9:16</span>
          </h2>
        </div>
        <div className="text-xs bg-base-200 text-base-content/80 px-3 py-1.5 rounded-lg border border-base-300 flex items-center gap-1.5 font-mono shadow-xs">
          <Smartphone className="w-3.5 h-3.5 text-primary" />
          <span>1080x1920 • 30fps{enabled ? ` • ${durationSec}s` : ""}</span>
        </div>
      </div>

      {props.imageWarning && (
        <div className="w-full mb-4 alert alert-warning text-xs p-3 rounded-xl flex items-center gap-2 shadow-xs">
          <ShieldAlert className="w-4 h-4 shrink-0" />
          <span>ข้อควรระวัง: {props.imageWarning}</span>
        </div>
      )}

      {/* Red Zone Toggle Control Bar */}
      <div className="w-full mb-4 bg-base-200/50 border border-base-300 rounded-xl p-3 flex items-center justify-between gap-3 text-xs shadow-xs">
        <div className="flex items-center gap-2">
          <ShieldAlert className={`w-4 h-4 ${showSafeZone ? "text-error" : "opacity-40"}`} />
          <span className="font-semibold text-base-content">
            {showSafeZone ? "เปิดไกด์ Red Zone (Safe Zone)" : "ปิดไกด์ Red Zone"}
          </span>
        </div>

        <button
          type="button"
          onClick={toggleSafeZone}
          className={`btn btn-xs rounded-lg font-medium flex items-center gap-1.5 transition ${
            showSafeZone
              ? "btn-error text-white shadow-xs"
              : "btn-outline"
          }`}
        >
          {showSafeZone ? (
            <>
              <EyeOff className="w-3.5 h-3.5" />
              <span>ซ่อนกรอบ Red Zone</span>
            </>
          ) : (
            <>
              <Eye className="w-3.5 h-3.5" />
              <span>แสดงกรอบ Red Zone</span>
            </>
          )}
        </button>
      </div>

      {/* Mobile Device Frame */}
      <div className="relative w-full max-w-[340px] md:max-w-[360px] bg-neutral-900 rounded-[42px] p-3 shadow-2xl border-4 border-neutral-800 ring-1 ring-neutral-700">
        {/* Dynamic Island / Speaker Notch */}
        <div className="absolute top-5 left-1/2 -translate-x-1/2 w-28 h-5 bg-black rounded-full z-30 flex items-center justify-center">
          <div className="w-3 h-3 rounded-full bg-neutral-800 border border-neutral-700 mr-2" />
          <div className="w-2 h-2 rounded-full bg-neutral-700" />
        </div>

        {/* Video Player Display Container */}
        <div className="relative w-full rounded-[32px] overflow-hidden bg-black aspect-[9/16] shadow-inner">
          {!enabled ? <div className="h-full flex flex-col items-center justify-center gap-3 p-6 text-center text-sm text-base-content bg-base-200" role="status">
            <Smartphone className="w-8 h-8 text-base-content/60" aria-hidden="true" />
            <p>พรีวิวพร้อมเมื่อสร้างสินค้าใหม่</p>
            <p className="text-xs text-base-content/70">กรอกข้อมูลในขั้นตอนที่ 1 แล้วสร้างสตอรีบอร์ดเพื่อดูคลิป</p>
          </div> : prepared && !preparationError ? <Player<any, ShopeeProductVideoProps>
            component={ShopeeProductVideo}
            inputProps={prepared}
            durationInFrames={durationInFrames}
            compositionWidth={1080}
            compositionHeight={1920}
            fps={30}
            acknowledgeRemotionLicense
            errorFallback={({ error }) => {
              dispatchError(
                toAppError(error, "RENDER_REMOTION_CRASH", {
                  productName: props.productName,
                  imageCount: props.images?.length,
                })
              );
              return (
                <div className="w-full h-full flex flex-col items-center justify-center p-6 bg-neutral-950 text-neutral-content text-center">
                  <ShieldAlert className="w-10 h-10 text-error mb-3" />
                  <h3 className="text-sm font-bold text-error mb-1">เกิดข้อผิดพลาดในการแสดงผล</h3>
                  <p className="text-xs text-neutral-content/70 mb-4 max-w-[240px]">
                    {error.message || "ไม่สามารถเล่นพรีวิววิดีโอได้"}
                  </p>
                  <button
                    type="button"
                    onClick={() => window.location.reload()}
                    className="btn btn-xs btn-outline btn-error"
                  >
                    โหลดหน้าเว็บใหม่
                  </button>
                </div>
              );
            }}
            style={{
              width: "100%",
              height: "100%",
            }}
            controls
            autoPlay={false}
            loop
          /> : <div className="h-full flex flex-col items-center justify-center gap-3 p-6 text-center text-sm text-base-content bg-base-200">
            {preparationError ? <><ShieldAlert className="w-8 h-8 text-error" /><p role="alert">{preparationError}</p></> : <><span className="loading loading-spinner text-primary" /><p>กำลังตรวจช่วงคลิปและจัดเวลาซับจากเสียง...</p></>}
          </div>}

          {/* Red Zone Guide Overlay ONLY for browser preview - physically isolated from the video render! */}
          {showSafeZone && (
            <div
              className="absolute inset-0 pointer-events-none z-30 overflow-hidden"
              style={{
                width: "100%",
                height: "100%",
              }}
            >
              <SafeZoneOverlay />
            </div>
          )}
        </div>

        {/* Home Bar */}
        <div className="w-28 h-1 bg-neutral-600 rounded-full mx-auto mt-2.5 opacity-60" />
      </div>

      {/* Audio Status & Tips */}
      <div className="w-full mt-4 flex items-center justify-between text-xs text-base-content/60 border-t border-base-300 pt-3">
        <div className="flex items-center gap-1.5 text-success font-medium">
          <Volume2 className="w-3.5 h-3.5 text-success" />
          <span>
            {!enabled ? "รอสร้างคลิปใหม่" : (props.voiceoverUrl || props.voiceLines?.some((line) => line.audioUrl)) ? "มีเสียงพากย์ AI + เพลง BGM + SFX" : "มีเพลง BGM + เสียง SFX (เพิ่มเสียงพากย์ได้)"}
          </span>
        </div>
        <div className="text-base-content/40">
          กรอบไกด์แสดงเฉพาะตอนพรีวิว ไม่ติดไปในไฟล์ MP4
        </div>
      </div>
    </div>
  );
};
