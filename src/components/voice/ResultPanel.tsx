"use client";

import { useMemo } from "react";
import { AlertCircle, AudioLines, Download, Pause, Play, RotateCcw, Zap } from "lucide-react";
import type { AudioPlayer } from "./useAudioPlayer";
import { SynthResponse, formatTime } from "./types";

interface ResultPanelProps {
  status: "idle" | "processing" | "success" | "error";
  result: SynthResponse | null;
  error: string | null;
  player: AudioPlayer;
  elapsedSec: number;
  onRetry: () => void;
}

const BAR_COUNT = 72;

/** Deterministic decorative waveform so the same file always looks the same. */
function useWaveform(seed: string) {
  return useMemo(() => {
    let h = 2166136261;
    for (let i = 0; i < seed.length; i++) h = Math.imul(h ^ seed.charCodeAt(i), 16777619);
    return Array.from({ length: BAR_COUNT }, (_, i) => {
      h = Math.imul(h ^ (h >>> 13), 1274126177);
      const noise = ((h >>> 0) % 1000) / 1000;
      const envelope = Math.sin((Math.PI * (i + 1)) / (BAR_COUNT + 1));
      return 18 + Math.round((0.35 + noise * 0.65) * envelope * 82);
    });
  }, [seed]);
}

export function ResultPanel({ status, result, error, player, elapsedSec, onRetry }: ResultPanelProps) {
  const url = result?.audioUrl ?? "";
  const bars = useWaveform(url || "empty");

  if (status === "processing") {
    return (
      <div className="rounded-2xl border border-base-300/60 bg-base-100 p-6" aria-live="polite" aria-busy>
        <div className="flex items-center gap-3">
          <span className="loading loading-bars loading-sm text-primary" aria-hidden />
          <p className="text-sm font-medium">กำลังสร้างเสียงพากย์...</p>
          <span className="ml-auto text-xs tabular-nums opacity-60">{elapsedSec.toFixed(0)} วิ</span>
        </div>
        <div className="mt-5 flex h-16 items-center gap-1">
          {bars.map((_, i) => (
            <div key={i} className="skeleton h-1/3 flex-1 rounded-full" />
          ))}
        </div>
      </div>
    );
  }

  if (status === "error") {
    return (
      <div role="alert" className="alert alert-error alert-soft rounded-2xl">
        <AlertCircle className="size-5" />
        <div>
          <p className="font-medium">สร้างเสียงไม่สำเร็จ</p>
          <p className="text-sm opacity-80">{error || "เกิดข้อผิดพลาดที่ไม่ทราบสาเหตุ"}</p>
        </div>
        <button type="button" className="btn btn-sm rounded-xl" onClick={onRetry}>
          <RotateCcw className="size-4" />
          ลองอีกครั้ง
        </button>
      </div>
    );
  }

  if (status !== "success" || !result?.audioUrl) {
    return (
      <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-base-300 px-6 py-10 text-center">
        <span className="grid size-11 place-items-center rounded-xl bg-base-200">
          <AudioLines className="size-5 opacity-60" />
        </span>
        <p className="mt-3 text-sm font-medium">ยังไม่มีไฟล์เสียง</p>
        <p className="mt-1 max-w-xs text-sm opacity-60">
          เขียนบทพากย์แล้วกด “สร้างเสียงพากย์” ไฟล์รวมทุกบรรทัดจะแสดงที่นี่
        </p>
      </div>
    );
  }

  const active = player.currentUrl === result.audioUrl;
  const total = active && player.duration > 0 ? player.duration : result.duration;
  const progress = active && total > 0 ? player.time / total : 0;
  const cachedCount = result.files.filter((f) => f.cached).length;
  const ext = result.audioUrl.split(".").pop() || "mp3";

  return (
    <div className="rounded-2xl border border-base-300/60 bg-base-100 p-4 sm:p-6">
      <div className="flex items-center gap-4">
        <button
          type="button"
          className="btn btn-primary btn-circle btn-lg shrink-0"
          onClick={() => player.toggle(result.audioUrl!)}
          aria-label={player.isPlaying(result.audioUrl) ? "หยุดชั่วคราว" : "เล่นไฟล์เสียงรวม"}
        >
          {player.isPlaying(result.audioUrl) ? <Pause className="size-6" /> : <Play className="size-6 translate-x-0.5" />}
        </button>

        <div className="min-w-0 flex-1">
          <div
            className="flex h-14 cursor-pointer items-center gap-[3px]"
            role="slider"
            tabIndex={0}
            aria-label="ตำแหน่งการเล่น"
            aria-valuemin={0}
            aria-valuemax={Math.round(total)}
            aria-valuenow={Math.round(progress * total)}
            onClick={(e) => {
              if (!active) player.toggle(result.audioUrl!);
              const rect = e.currentTarget.getBoundingClientRect();
              player.seek((e.clientX - rect.left) / rect.width);
            }}
            onKeyDown={(e) => {
              if (!active) return;
              if (e.key === "ArrowRight") player.seek(progress + 0.05);
              if (e.key === "ArrowLeft") player.seek(progress - 0.05);
            }}
          >
            {bars.map((h, i) => (
              <span
                key={i}
                className={`flex-1 rounded-full transition-colors duration-200 ${
                  i / BAR_COUNT < progress ? "bg-primary" : "bg-base-content/15"
                }`}
                style={{ height: `${h}%` }}
              />
            ))}
          </div>
          <div className="mt-1 flex justify-between text-xs tabular-nums opacity-60">
            <span>{formatTime(active ? player.time : 0)}</span>
            <span>{formatTime(total)}</span>
          </div>
        </div>
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-2 border-t border-base-300/60 pt-4">
        <span className="badge badge-ghost">{result.files.length} บรรทัด</span>
        <span className="badge badge-ghost tabular-nums">{formatTime(result.duration)} นาที</span>
        {cachedCount > 0 && (
          <span className="badge badge-ghost gap-1">
            <Zap className="size-3" />
            ใช้แคช {cachedCount}
          </span>
        )}
        {result.fallbackNotice && <span className="badge badge-warning badge-soft">สลับเป็นเสียงมาตรฐาน</span>}
        <a
          href={result.audioUrl}
          download={`voiceover_${new Date().toISOString().slice(0, 10)}.${ext}`}
          className="btn btn-outline btn-sm ml-auto rounded-xl"
        >
          <Download className="size-4" />
          ดาวน์โหลด .{ext}
        </a>
      </div>
    </div>
  );
}
