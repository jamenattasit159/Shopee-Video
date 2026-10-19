"use client";

import { Check, Cpu, Sparkles } from "lucide-react";
import { VOICE_PRESETS, VoiceIntensity } from "@/lib/voicePresets";
import type { ReplicatedVoiceItem } from "../VoiceCloningModal";
import { GEMINI_VOICES, TtsEngine, VoiceSettings, formatRate } from "./types";

interface VoiceSettingsPanelProps {
  settings: VoiceSettings;
  onChange: (patch: Partial<VoiceSettings>) => void;
  disabled?: boolean;
  clonedVoices?: ReplicatedVoiceItem[];
}

const INTENSITY: { id: VoiceIntensity; label: string }[] = [
  { id: "low", label: "เบา" },
  { id: "mid", label: "ปกติ" },
  { id: "high", label: "จัดเต็ม" },
];

const ENGINES: { id: TtsEngine; label: string; hint: string; icon: typeof Cpu }[] = [
  { id: "free", label: "มาตรฐาน", hint: "เร็ว ฟรี ไม่จำกัด", icon: Cpu },
  { id: "gemini", label: "Gemini AI", hint: "สมจริง ใส่อารมณ์ได้", icon: Sparkles },
];

export function VoiceSettingsPanel({ settings, onChange, disabled, clonedVoices = [] }: VoiceSettingsPanelProps) {
  return (
    <fieldset disabled={disabled} className="space-y-6">
      <legend className="sr-only">ตั้งค่าเสียงพากย์</legend>

      <section className="space-y-2">
        <h3 className="text-sm font-medium">เอนจินเสียง</h3>
        <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="เอนจินเสียง">
          {ENGINES.map(({ id, label, hint, icon: Icon }) => {
            const active = settings.engine === id;
            return (
              <button
                key={id}
                type="button"
                role="radio"
                aria-checked={active}
                onClick={() => onChange({ engine: id })}
                className={`flex flex-col items-start gap-1 rounded-xl border p-3 text-left transition duration-200 ease-out focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${
                  active
                    ? "border-primary bg-primary/5"
                    : "border-base-300/70 hover:border-base-content/20 hover:bg-base-200/60"
                }`}
              >
                <span className="flex items-center gap-2 text-sm font-medium">
                  <Icon className={`size-4 ${active ? "text-primary" : "opacity-60"}`} />
                  {label}
                </span>
                <span className="text-xs opacity-60">{hint}</span>
              </button>
            );
          })}
        </div>
      </section>

      <section className="space-y-2">
        <label htmlFor="voice-select" className="text-sm font-medium">
          ผู้พากย์
        </label>
        {settings.engine === "gemini" ? (
          <select
            id="voice-select"
            className="select w-full rounded-xl"
            value={settings.geminiVoice}
            onChange={(e) => onChange({ geminiVoice: e.target.value })}
          >
            {clonedVoices.length > 0 && (
              <optgroup label="เสียงโคลนของฉัน">
                {clonedVoices.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.displayName}
                  </option>
                ))}
              </optgroup>
            )}
            <optgroup label="เสียงมาตรฐาน">
              {GEMINI_VOICES.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.id} · {v.gender} · {v.description}
                </option>
              ))}
            </optgroup>
          </select>
        ) : (
          <div className="join w-full" role="radiogroup" aria-label="เพศเสียง">
            {(["female", "male"] as const).map((g) => (
              <button
                key={g}
                id={g === "female" ? "voice-select" : undefined}
                type="button"
                role="radio"
                aria-checked={settings.voiceType === g}
                onClick={() => onChange({ voiceType: g })}
                className={`btn join-item flex-1 rounded-xl ${
                  settings.voiceType === g ? "btn-neutral" : "btn-ghost border-base-300"
                }`}
              >
                {g === "female" ? "เสียงผู้หญิง" : "เสียงผู้ชาย"}
              </button>
            ))}
          </div>
        )}
      </section>

      {settings.engine === "free" && (
        <section className="space-y-2">
          <div className="flex items-center justify-between">
            <label htmlFor="rate-range" className="text-sm font-medium">
              ความเร็วการพูด
            </label>
            <span className="badge badge-ghost badge-sm tabular-nums">{formatRate(settings.rate)}</span>
          </div>
          <input
            id="rate-range"
            type="range"
            min={-20}
            max={40}
            step={5}
            value={settings.rate}
            onChange={(e) => onChange({ rate: Number(e.target.value) })}
            className="range range-primary range-xs w-full"
          />
          <div className="flex justify-between text-xs opacity-50">
            <span>ช้า</span>
            <span>ปกติ</span>
            <span>เร็ว</span>
          </div>
        </section>
      )}

      <section className="space-y-2">
        <h3 className="text-sm font-medium">สไตล์การพากย์</h3>
        <ul className="space-y-1" role="radiogroup" aria-label="สไตล์การพากย์">
          {VOICE_PRESETS.map((p) => {
            const active = settings.presetId === p.id;
            return (
              <li key={p.id}>
                <button
                  type="button"
                  role="radio"
                  aria-checked={active}
                  onClick={() => onChange({ presetId: p.id })}
                  className={`flex w-full items-start gap-3 rounded-xl px-3 py-2 text-left transition duration-200 ease-out focus-visible:outline-2 focus-visible:outline-primary ${
                    active ? "bg-base-200" : "hover:bg-base-200/60"
                  }`}
                >
                  <span
                    className={`mt-0.5 grid size-4 shrink-0 place-items-center rounded-full border ${
                      active ? "border-primary bg-primary text-primary-content" : "border-base-content/25"
                    }`}
                    aria-hidden
                  >
                    {active && <Check className="size-3" strokeWidth={3} />}
                  </span>
                  <span className="min-w-0">
                    <span className="block text-sm font-medium">{p.nameTh}</span>
                    <span className="block text-xs leading-relaxed opacity-60">{p.descriptionTh}</span>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
        {settings.engine === "free" && (
          <p className="px-1 text-xs opacity-50">เอนจินมาตรฐานใช้สไตล์เพื่อปรับความเร็วและโทนเสียงหลังสร้าง</p>
        )}
      </section>

      <section className="space-y-2">
        <h3 className="text-sm font-medium">ระดับอารมณ์</h3>
        <div className="join w-full" role="radiogroup" aria-label="ระดับอารมณ์">
          {INTENSITY.map((i) => (
            <button
              key={i.id}
              type="button"
              role="radio"
              aria-checked={settings.intensity === i.id}
              onClick={() => onChange({ intensity: i.id })}
              className={`btn btn-sm join-item flex-1 ${
                settings.intensity === i.id ? "btn-neutral" : "btn-ghost border-base-300"
              }`}
            >
              {i.label}
            </button>
          ))}
        </div>
      </section>

      <section className="space-y-3 border-t border-base-300/60 pt-5">
        <label className="flex cursor-pointer items-start justify-between gap-3">
          <span>
            <span className="block text-sm font-medium">ปรับแต่งเสียงอัตโนมัติ</span>
            <span className="block text-xs opacity-60">บีบอัด เพิ่มความชัด ปรับระดับเสียงให้พร้อมโพสต์</span>
          </span>
          <input
            type="checkbox"
            className="toggle toggle-primary toggle-sm mt-0.5"
            checked={settings.polish}
            onChange={(e) => onChange({ polish: e.target.checked })}
          />
        </label>
        <label className="flex cursor-pointer items-start justify-between gap-3">
          <span>
            <span className="block text-sm font-medium">สร้างใหม่ทุกครั้ง</span>
            <span className="block text-xs opacity-60">ไม่ใช้เสียงที่เคยสร้างไว้แล้ว (ช้ากว่า)</span>
          </span>
          <input
            type="checkbox"
            className="toggle toggle-sm mt-0.5"
            checked={settings.skipCache}
            onChange={(e) => onChange({ skipCache: e.target.checked })}
          />
        </label>
      </section>
    </fieldset>
  );
}
