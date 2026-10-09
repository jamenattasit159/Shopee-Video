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

  const [probedAudioSec, setProbedAudioSec] = useState<number | null>(null);

  // Proactively measure voiceover duration in the browser to ensure the preview player never cuts off early
  React.useEffect(() => {
    if (!props.voiceoverUrl) {
      setProbedAudioSec(null);
      return;
    }
    const audio = new window.Audio();
    audio.src = props.voiceoverUrl;
    audio.onloadedmetadata = () => {
      if (audio.duration && !isNaN(audio.duration) && audio.duration > 0) {
        setProbedAudioSec(Math.round(audio.duration * 100) / 100);
      }
    };
  }, [props.voiceoverUrl]);

  const effectiveAudioDuration =
    props.audioDurationSec || (probedAudioSec ?? undefined);

  const effectiveProps: ShopeeProductVideoProps = {
    ...props,
    audioDurationSec: effectiveAudioDuration,
    tailBufferSec: props.tailBufferSec || 0.8,
  };

  const durationInFrames = calculateTotalFrames(effectiveProps, 30);
  const durationSec = (durationInFrames / 30).toFixed(1);

  return (
    <div className="bg-white border border-stone-200/90 rounded-2xl p-6 shadow-sm flex flex-col items-center relative">
      {/* Header */}
      <div className="w-full flex items-center justify-between pb-4 border-b border-stone-200/80 mb-4">
        <div>
          <span className="text-xs font-bold text-sky-800 bg-sky-50 border border-sky-200 px-2.5 py-1 rounded-full uppercase tracking-wider">
            Step 3: Real-Time Remotion Video Engine
          </span>
          <h2 className="text-xl font-extrabold text-stone-900 mt-1.5 flex items-center gap-2">
            <span>📱 พรีวิววิดีโอสด 9:16</span>
          </h2>
        </div>
        <div className="text-xs bg-stone-100 text-stone-700 px-3 py-1.5 rounded-lg border border-stone-300 flex items-center gap-1.5 font-mono shadow-2xs">
          <Smartphone className="w-3.5 h-3.5 text-sky-600" />
          <span>1080x1920 • 30fps • {durationSec}s</span>
        </div>
      </div>

      {props.imageWarning && (
        <div className="w-full mb-4 bg-amber-50 border border-amber-300 rounded-xl p-2.5 text-xs text-amber-900 flex items-center gap-2 shadow-2xs">
          <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0" />
          <span>ข้อควรระวัง: {props.imageWarning}</span>
        </div>
      )}

      {/* Red Zone Toggle Control Bar */}
      <div className="w-full mb-4 bg-stone-50 border border-stone-200 rounded-xl p-3 flex items-center justify-between gap-3 text-xs shadow-2xs">
        <div className="flex items-center gap-2">
          <ShieldAlert className={`w-4 h-4 ${showSafeZone ? "text-red-500" : "text-stone-400"}`} />
          <span className="font-bold text-stone-800">
            {showSafeZone ? "เปิดไกด์ Red Zone (Safe Zone)" : "ปิดไกด์ Red Zone"}
          </span>
        </div>

        <button
          type="button"
          onClick={toggleSafeZone}
          className={`px-3 py-1.5 rounded-lg font-bold text-xs flex items-center gap-1.5 transition ${
            showSafeZone
              ? "bg-red-600 text-white shadow-sm"
              : "bg-white hover:bg-stone-100 text-stone-700 border border-stone-300 shadow-2xs"
          }`}
        >
          {showSafeZone ? (
            <>
              <EyeOff className="w-3.5 h-3.5" />
              <span>ซ่อนกรอบ Red Zone</span>
            </>
          ) : (
            <>
              <Eye className="w-3.5 h-3.5 text-orange-600" />
              <span>แสดงกรอบ Red Zone</span>
            </>
          )}
        </button>
      </div>

      {/* Mobile Device Frame */}
      <div className="relative w-full max-w-[340px] md:max-w-[360px] bg-stone-900 rounded-[42px] p-3 shadow-xl border-4 border-stone-800 ring-1 ring-stone-700">
        {/* Dynamic Island / Speaker Notch */}
        <div className="absolute top-5 left-1/2 -translate-x-1/2 w-28 h-5 bg-black rounded-full z-30 flex items-center justify-center">
          <div className="w-3 h-3 rounded-full bg-stone-800 border border-stone-700 mr-2" />
          <div className="w-2 h-2 rounded-full bg-stone-700" />
        </div>

        {/* Video Player Display Container */}
        <div className="relative w-full rounded-[32px] overflow-hidden bg-black aspect-[9/16] shadow-inner">
          <Player<any, ShopeeProductVideoProps>
            component={ShopeeProductVideo}
            inputProps={effectiveProps}
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
        <div className="w-28 h-1 bg-stone-500 rounded-full mx-auto mt-2.5 opacity-60" />
      </div>

      {/* Audio Status & Tips */}
      <div className="w-full mt-4 flex items-center justify-between text-[11px] text-stone-500 border-t border-stone-200 pt-3">
        <div className="flex items-center gap-1.5 text-emerald-700 font-medium">
          <Volume2 className="w-3.5 h-3.5 text-emerald-600" />
          <span>
            {props.voiceoverUrl ? "มีเสียงพากย์ AI + เพลง BGM + SFX" : "มีเพลง BGM + เสียง SFX (เพิ่มเสียงพากย์ได้)"}
          </span>
        </div>
        <div className="text-stone-400">
          กรอบไกด์แสดงเฉพาะตอนพรีวิว ไม่ติดไปในไฟล์ MP4
        </div>
      </div>
    </div>
  );
};
