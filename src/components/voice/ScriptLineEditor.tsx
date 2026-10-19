"use client";

import { ArrowDown, ArrowUp, Headphones, Pause, Play, Plus, Trash2 } from "lucide-react";
import type { AudioPlayer } from "./useAudioPlayer";
import {
  LineRole,
  ROLE_META,
  ScriptLine,
  SynthFile,
  estimateSeconds,
  formatTime,
  newLineId,
} from "./types";

interface ScriptLineEditorProps {
  lines: ScriptLine[];
  onChange: (lines: ScriptLine[]) => void;
  results: Record<string, SynthFile>;
  player: AudioPlayer;
  rate: number;
  processing: boolean;
  previewingId: string | null;
  onPreview: (line: ScriptLine) => void;
}

const MAX_CHARS = 400;

export function ScriptLineEditor({
  lines,
  onChange,
  results,
  player,
  rate,
  processing,
  previewingId,
  onPreview,
}: ScriptLineEditorProps) {
  const update = (id: string, patch: Partial<ScriptLine>) =>
    onChange(lines.map((l) => (l.id === id ? { ...l, ...patch } : l)));

  const move = (index: number, dir: -1 | 1) => {
    const target = index + dir;
    if (target < 0 || target >= lines.length) return;
    const next = [...lines];
    [next[index], next[target]] = [next[target], next[index]];
    onChange(next);
  };

  const remove = (id: string) => onChange(lines.filter((l) => l.id !== id));

  const add = () => {
    const role: LineRole = lines.length === 0 ? "hook" : "body";
    onChange([...lines, { id: newLineId(), text: "", role }]);
  };

  return (
    <div className="space-y-3">
      <ol className="space-y-3">
        {lines.map((line, index) => {
          const result = results[line.id];
          const resultFresh = result && result.text === line.text.trim();
          const over = line.text.length > MAX_CHARS;
          return (
            <li
              key={line.id}
              className="group rounded-2xl border border-base-300/60 bg-base-100 p-4 transition duration-200 ease-out focus-within:border-primary/50 hover:border-base-300"
            >
              <div className="flex items-center gap-2">
                <span className="grid size-6 shrink-0 place-items-center rounded-lg bg-base-200 text-xs font-medium tabular-nums opacity-70">
                  {index + 1}
                </span>
                <select
                  aria-label={`ประเภทบรรทัดที่ ${index + 1}`}
                  className="select select-ghost select-sm w-auto rounded-xl pl-2 font-medium"
                  value={line.role}
                  onChange={(e) => update(line.id, { role: e.target.value as LineRole })}
                >
                  {(Object.keys(ROLE_META) as LineRole[]).map((r) => (
                    <option key={r} value={r}>
                      {ROLE_META[r].label}
                    </option>
                  ))}
                </select>
                <span className={`badge badge-sm hidden sm:inline-flex ${ROLE_META[line.role].badge}`}>
                  {ROLE_META[line.role].hint}
                </span>

                <div className="ml-auto flex items-center gap-1 opacity-100 transition duration-200 sm:opacity-60 sm:group-focus-within:opacity-100 sm:group-hover:opacity-100">
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm btn-square rounded-xl"
                    aria-label="เลื่อนขึ้น"
                    disabled={index === 0}
                    onClick={() => move(index, -1)}
                  >
                    <ArrowUp className="size-4" />
                  </button>
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm btn-square rounded-xl"
                    aria-label="เลื่อนลง"
                    disabled={index === lines.length - 1}
                    onClick={() => move(index, 1)}
                  >
                    <ArrowDown className="size-4" />
                  </button>
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm btn-square rounded-xl hover:text-error"
                    aria-label={`ลบบรรทัดที่ ${index + 1}`}
                    onClick={() => remove(line.id)}
                  >
                    <Trash2 className="size-4" />
                  </button>
                </div>
              </div>

              <label className="sr-only" htmlFor={`line-${line.id}`}>
                ข้อความบรรทัดที่ {index + 1}
              </label>
              <textarea
                id={`line-${line.id}`}
                rows={2}
                className={`textarea textarea-ghost mt-2 min-h-16 w-full resize-y rounded-xl px-2 text-base leading-relaxed focus:bg-base-200/50 ${
                  over ? "textarea-error" : ""
                }`}
                placeholder={
                  line.role === "hook"
                    ? "เช่น ใครกำลังหาของดีราคาถูก ต้องดูคลิปนี้!"
                    : line.role === "cta"
                    ? "เช่น ลดเหลือ 199 บาท กดตะกร้าเลย!"
                    : "พิมพ์ข้อความที่ต้องการให้พากย์..."
                }
                value={line.text}
                onChange={(e) => update(line.id, { text: e.target.value })}
              />

              <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-2 px-2 text-xs">
                <span className={`tabular-nums ${over ? "text-error" : "opacity-60"}`}>
                  {line.text.length}/{MAX_CHARS} ตัวอักษร · ~{estimateSeconds(line.text, rate).toFixed(1)} วิ
                </span>

                <div className="ml-auto flex items-center gap-2">
                  {resultFresh && (
                    <button
                      type="button"
                      className="btn btn-sm rounded-xl btn-soft btn-primary"
                      onClick={() => player.toggle(result.url)}
                      aria-label={`เล่นเสียงบรรทัดที่ ${index + 1}`}
                    >
                      {player.isPlaying(result.url) ? <Pause className="size-4" /> : <Play className="size-4" />}
                      <span className="tabular-nums">{formatTime(result.durationSec)}</span>
                    </button>
                  )}
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm rounded-xl"
                    disabled={!line.text.trim() || processing || previewingId !== null}
                    onClick={() => onPreview(line)}
                  >
                    {previewingId === line.id ? (
                      <span className="loading loading-spinner loading-xs" aria-hidden />
                    ) : (
                      <Headphones className="size-4" />
                    )}
                    ฟังตัวอย่าง
                  </button>
                </div>
              </div>
              {processing && !resultFresh && line.text.trim() && (
                <progress className="progress progress-primary mt-3 h-1 w-full" aria-label="กำลังสร้างเสียง" />
              )}
            </li>
          );
        })}
      </ol>

      <button
        type="button"
        onClick={add}
        className="btn btn-ghost btn-block h-12 rounded-2xl border border-dashed border-base-300 font-normal opacity-80 hover:opacity-100"
      >
        <Plus className="size-4" />
        เพิ่มบรรทัด
      </button>
    </div>
  );
}
