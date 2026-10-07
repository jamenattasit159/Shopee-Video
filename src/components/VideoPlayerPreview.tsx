"use client";

import { Player } from "@remotion/player";
import { Eye, EyeOff, ShieldAlert, Smartphone, Sparkles, Volume2 } from "lucide-react";
import React, { useState } from "react";
import { SafeZoneOverlay } from "../../remotion/components/SafeZoneOverlay";
import { calculateTotalFrames } from "../../remotion/Root";
import { ShopeeProductVideo } from "../../remotion/ShopeeProductVideo";
import { ShopeeProductVideoProps } from "../../remotion/types";

interface VideoPlayerPreviewProps {
  props: ShopeeProductVideoProps;
  showSafeZone?: boolean;
  onToggleSafeZone?: (show: boolean) => void;
}

export const VideoPlayerPreview: React.FC<VideoPlayerPreviewProps> = ({
  props,
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

  const durationInFrames = calculateTotalFrames(props, 30);
  const durationSec = (durationInFrames / 30).toFixed(1);

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl flex flex-col items-center">
      {/* Header */}
      <div className="w-full flex items-center justify-between pb-4 border-b border-slate-800 mb-4">
        <div>
          <span className="text-xs font-bold text-sky-400 bg-sky-950/60 border border-sky-800/60 px-2.5 py-1 rounded-full uppercase tracking-wider">
            Step 3: Real-Time Remotion Video Engine
          </span>
          <h2 className="text-xl font-bold text-white mt-1.5 flex items-center gap-2">
            <span>📱 พรีวิววิดีโอสด 9:16</span>
          </h2>
        </div>
        <div className="text-xs bg-slate-800 text-slate-300 px-3 py-1.5 rounded-lg border border-slate-700 flex items-center gap-1.5 font-mono">
          <Smartphone className="w-3.5 h-3.5 text-sky-400" />
          <span>1080x1920 • 30fps • {durationSec}s</span>
        </div>
      </div>

      {props.imageWarning && (
        <div className="w-full mb-4 bg-amber-950/60 border border-amber-600/50 rounded-xl p-2.5 text-xs text-amber-300 flex items-center gap-2">
          <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0" />
          <span>ข้อควรระวัง: {props.imageWarning}</span>
        </div>
      )}

      {/* Red Zone Toggle Control Bar */}
      <div className="w-full mb-4 bg-slate-950/80 border border-slate-800 rounded-xl p-3 flex items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2">
          <ShieldAlert className={`w-4 h-4 ${showSafeZone ? "text-red-400" : "text-slate-400"}`} />
          <span className="font-semibold text-slate-200">
            {showSafeZone ? "เปิดไกด์ Red Zone (Safe Zone)" : "ปิดไกด์ Red Zone"}
          </span>
        </div>

        <button
          type="button"
          onClick={toggleSafeZone}
          className={`px-3 py-1.5 rounded-lg font-bold text-xs flex items-center gap-1.5 transition ${
            showSafeZone
              ? "bg-red-600 text-white shadow-lg shadow-red-600/30"
              : "bg-slate-800 hover:bg-slate-700 text-slate-300"
          }`}
        >
          {showSafeZone ? (
            <>
              <EyeOff className="w-3.5 h-3.5" />
              <span>ซ่อนกรอบ Red Zone</span>
            </>
          ) : (
            <>
              <Eye className="w-3.5 h-3.5 text-orange-400" />
              <span>แสดงกรอบ Red Zone</span>
            </>
          )}
        </button>
      </div>

      {/* Mobile Device Frame */}
      <div className="relative w-full max-w-[340px] md:max-w-[360px] bg-black rounded-[42px] p-3 shadow-2xl border-4 border-slate-800 ring-1 ring-slate-700">
        {/* Dynamic Island / Speaker Notch */}
        <div className="absolute top-5 left-1/2 -translate-x-1/2 w-28 h-5 bg-black rounded-full z-30 flex items-center justify-center">
          <div className="w-3 h-3 rounded-full bg-slate-900 border border-slate-700 mr-2" />
          <div className="w-2 h-2 rounded-full bg-slate-800" />
        </div>

        {/* Video Player Display Container */}
        <div className="relative w-full rounded-[32px] overflow-hidden bg-slate-950 aspect-[9/16] shadow-inner">
          <Player<any, ShopeeProductVideoProps>
            component={ShopeeProductVideo}
            inputProps={props}
            durationInFrames={durationInFrames}
            compositionWidth={1080}
            compositionHeight={1920}
            fps={30}
            acknowledgeRemotionLicense
            style={{
              width: "100%",
              height: "100%",
            }}
            controls
            autoPlay={false}
            loop
          />

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
        <div className="w-28 h-1 bg-slate-600 rounded-full mx-auto mt-2.5 opacity-60" />
      </div>

      {/* Audio Status & Tips */}
      <div className="w-full mt-4 flex items-center justify-between text-[11px] text-slate-400 border-t border-slate-800/80 pt-3">
        <div className="flex items-center gap-1.5 text-emerald-400">
          <Volume2 className="w-3.5 h-3.5" />
          <span>
            {props.voiceoverUrl ? "มีเสียงพากย์ AI + เพลง BGM + SFX" : "มีเพลง BGM + เสียง SFX (เพิ่มเสียงพากย์ได้)"}
          </span>
        </div>
        <div className="text-slate-500">
          กรอบไกด์แสดงเฉพาะตอนพรีวิว ไม่ติดไปในไฟล์ MP4
        </div>
      </div>
    </div>
  );
};
