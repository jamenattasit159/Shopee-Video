import type { VoiceIntensity } from "@/lib/voicePresets";

export type LineRole = "hook" | "body" | "cta";
export type TtsEngine = "free" | "gemini";

export interface ScriptLine {
  id: string;
  text: string;
  role: LineRole;
}

export interface SynthWarning {
  code?: string;
  messageTh?: string;
}

export interface SynthFile {
  id: string;
  text: string;
  textForSpeech: string;
  url: string;
  rawUrl: string;
  durationSec: number;
  cached: boolean;
  polished: boolean;
  warnings?: SynthWarning[];
}

export interface SynthResponse {
  ok: boolean;
  files: SynthFile[];
  audioUrl: string | null;
  duration: number;
  engineUsed: TtsEngine;
  fallbackNotice?: string;
}

export interface VoiceSettings {
  engine: TtsEngine;
  voiceType: "female" | "male";
  geminiVoice: string;
  /** Speaking-rate offset in percent, free engine only. */
  rate: number;
  presetId: string;
  intensity: VoiceIntensity;
  polish: boolean;
  skipCache: boolean;
}

export interface HistoryEntry {
  id: string;
  createdAt: number;
  title: string;
  audioUrl: string;
  duration: number;
  voiceLabel: string;
  lineCount: number;
}

export const GEMINI_VOICES = [
  { id: "Puck", gender: "ชาย", description: "สดใส มีเอเนอร์จี้ ชวนช้อป" },
  { id: "Kore", gender: "หญิง", description: "มั่นใจ สุภาพ พรีเมียม" },
  { id: "Aoede", gender: "หญิง", description: "ฟังสบาย เป็นกันเอง" },
  { id: "Charon", gender: "ชาย", description: "สุขุม น่าเชื่อถือ" },
  { id: "Fenrir", gender: "ชาย", description: "ตื่นเต้น เร้าใจ" },
] as const;

export const ROLE_META: Record<LineRole, { label: string; hint: string; badge: string }> = {
  hook: { label: "Hook", hint: "ดึงความสนใจใน 3 วินาทีแรก", badge: "badge-primary badge-soft" },
  body: { label: "เนื้อหา", hint: "จุดเด่นและประโยชน์ของสินค้า", badge: "badge-ghost" },
  cta: { label: "ปิดการขาย", hint: "ชวนกดตะกร้า / โปรโมชั่น", badge: "badge-accent badge-soft" },
};

export const DEFAULT_SETTINGS: VoiceSettings = {
  engine: "free",
  voiceType: "female",
  geminiVoice: "Puck",
  rate: 10,
  presetId: "vendor-live",
  intensity: "mid",
  polish: true,
  skipCache: false,
};

export const SAMPLE_LINES: Omit<ScriptLine, "id">[] = [
  { role: "hook", text: "ใครผิวแห้งลอกเป็นขุย ต้องฟังคลิปนี้!" },
  { role: "body", text: "ครีมตัวนี้เนื้อบางเบา ซึมไว ไม่เหนอะหนะ ทาแล้วผิวนุ่มชุ่มชื้นทั้งวัน" },
  { role: "cta", text: "ตอนนี้ลดเหลือแค่ 199 บาท ส่งฟรี กดตะกร้าเลย!" },
];

export const newLineId = () => `ln_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;

/** Rough Thai speaking speed (~13 chars/second) used only for on-screen estimates. */
export const estimateSeconds = (text: string, rate = 0) =>
  text.replace(/\s+/g, "").length / 13 / (1 + rate / 100);

export const formatRate = (rate: number) => `${rate >= 0 ? "+" : ""}${rate}%`;

export const formatTime = (sec: number) => {
  if (!Number.isFinite(sec) || sec < 0) return "0:00";
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
};
