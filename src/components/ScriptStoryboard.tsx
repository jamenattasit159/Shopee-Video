"use client";

import {
  ArrowLeft,
  BookOpen,
  Check,
  Copy,
  Dices,
  Film,
  FileText,
  Gauge,
  Image as ImageIcon,
  Info,
  Layout,
  Mic,
  Palette,
  Plus,
  RefreshCw,
  Sparkles,
  Subtitles,
  Trash2,
  Upload,
  Volume2,
  Wand2,
  Zap,
} from "lucide-react";
import React, { useState, useEffect, useRef } from "react";
import {
  CaptionPosition,
  CaptionSettings,
  CaptionStyleId,
  PackId,
  SceneLayout,
  StoryboardPlan,
} from "../../remotion/types";
import { isVideoMedia } from "../../remotion/utils";
import { generatePostCaptions } from "../lib/captions";
import { buildNaturalNarrationText } from "../lib/narrationHelper";
import { adjustNarrationGender, NarrationGender } from "../lib/narrationGender";
import {
  ALL_PACK_IDS,
  ALL_SCENE_LAYOUTS,
  PACK_INFO,
  rerollClientStyleDNA,
} from "../lib/styleConstants";
import type { ReplicatedVoiceItem } from "./VoiceCloningModal";
import { VoiceStylePicker } from "./VoiceStylePicker";
import { VoiceIntensity } from "@/lib/voicePresets";
import { apiFetch } from "@/lib/apiFetch";
import { MascotUpload } from "./MascotUpload";

interface ScriptStoryboardProps {
  productId?: string;
  productName: string;
  price: string;
  highlights: string;
  images?: string[];
  storyboard: StoryboardPlan;
  onUpdateStoryboard: (updated: StoryboardPlan) => void;
  onRegenerate: (provider?: "claude" | "gemini") => Promise<void>;
  isRegenerating: boolean;
  voiceoverUrl?: string;
  onVoiceoverGenerated?: (url: string, duration?: number) => void;
  onAppendMedia?: (files: FileList) => Promise<void>;
  onNavigateToStep1?: () => void;
}

const DEFAULT_CAPTION_SETTINGS: CaptionSettings = {
  enabled: true,
  style: "tiktok-pop",
  position: "bottom",
  language: "th",
  highlightColor: "#FACC15",
};

const BUILTIN_PRON_MAP: Record<string, string> = {
  DODOLOVE: "ดูดูเลิฟ",
  Tyeso: "ไทโซ",
  MamyPoko: "มามี่โพโค",
  "Mama's Choice": "มาม่าส์ช้อยส์",
  Clevamama: "คลีวามาม่า",
  ClevaFoam: "คลีวาโฟม",
  "Madame Fin": "มาดามฟิน",
  "Baby Wipes": "เบบี้ไวพส์",
  Wipes: "ไวพส์",
  "Shower Gel": "ชาวเวอร์เจล",
  "Head to Toe": "เฮดทูโท",
  "Active Rush": "แอคทีฟรัช",
  "Element Of Energy": "เอเลเมนต์ออฟเอเนอร์จี้",
  Shopee: "ช้อปปี้",
  TikTok: "ติ๊กต็อก",
  "Flash Sale": "แฟลชเซลล์",
  Bluetooth: "บลูทูธ",
  "Type-C": "ไทป์ซี",
  USB: "ยูเอสบี",
  ANC: "เอเอ็นซี",
  "Hi-Fi": "ไฮไฟ",
  "Food Grade": "ฟู้ดเกรด",
  Organic: "ออร์แกนิค",
  pH: "พีเอช",
  UV: "ยูวี",
  SPF: "เอสพีเอฟ",
  "PA++++": "พีเอ สี่บวก",
  "PA+++": "พีเอ สามบวก",
  mAh: "มิลลิแอมป์",
  ml: "มิลลิลิตร",
  kg: "กิโลกรัม",
  cm: "เซนติเมตร",
  "NB-S": "เอ็นบี ถึง เอส",
};

const DIGITS_TH = ["ศูนย์", "หนึ่ง", "สอง", "สาม", "สี่", "ห้า", "หก", "เจ็ด", "แปด", "เก้า"];
const DIGITS_INT_TH = ["", "หนึ่ง", "สอง", "สาม", "สี่", "ห้า", "หก", "เจ็ด", "แปด", "เก้า"];
const POSITIONS_TH = ["", "สิบ", "ร้อย", "พัน", "หมื่น", "แสน", "ล้าน"];

function clientNumberToThai(numStr: string): string {
  const clean = numStr.replace(/,/g, "").replace(/^0+/, "");
  if (!clean) return "ศูนย์";
  const n = parseInt(clean, 10);
  if (isNaN(n) || n === 0) return "ศูนย์";
  const digits = n.toString().split("").map(Number);
  const len = digits.length;
  let res = "";
  for (let i = 0; i < len; i++) {
    const d = digits[i];
    const pos = len - i - 1;
    if (d === 0) continue;
    if (pos === 1) {
      res += d === 1 ? "สิบ" : d === 2 ? "ยี่สิบ" : DIGITS_INT_TH[d] + "สิบ";
    } else if (pos === 0) {
      res += d === 1 && len > 1 ? "เอ็ด" : DIGITS_INT_TH[d];
    } else if (pos < POSITIONS_TH.length) {
      res += DIGITS_INT_TH[d] + POSITIONS_TH[pos];
    }
  }
  return res || numStr;
}

function computeClientPhoneticPreview(
  rawText: string,
  pronMap: Record<string, string>
): {
  spokenText: string;
  appliedRules: Array<{ from: string; to: string }>;
  unmappedEnglish: string[];
} {
  if (!rawText || !rawText.trim()) {
    return { spokenText: "", appliedRules: [], unmappedEnglish: [] };
  }
  const merged = { ...BUILTIN_PRON_MAP, ...pronMap };
  if (merged.DODOLOVE === "โดโดเลิฟ") merged.DODOLOVE = "ดูดูเลิฟ";

  let text = rawText;
  const appliedRules: Array<{ from: string; to: string }> = [];

  // 1. Dictionary words sorted by longest first
  const entries = Object.entries(merged)
    .filter(([k, v]) => k.trim() && v.trim())
    .sort((a, b) => b[0].length - a[0].length);

  for (const [key, val] of entries) {
    const escaped = key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const prefix = /[A-Za-z0-9]/.test(key[0]) ? "(?<![A-Za-z0-9])" : "";
    const suffix = /[A-Za-z0-9]/.test(key[key.length - 1]) ? "(?![A-Za-z0-9])" : "";
    const rx = new RegExp(`${prefix}${escaped}${suffix}`, "gi");
    if (rx.test(text)) {
      appliedRules.push({ from: key, to: val });
      text = text.replace(rx, ` ${val} `);
    }
  }

  // 2. Campaign Double-Days: 10.10 -> สิบเดือนสิบ, 11.11 -> สิบเอ็ดเดือนสิบเอ็ด, 12.12 -> สิบสองเดือนสิบสอง
  text = text.replace(
    /(?<!พีเอช\s*)(?<!pH\s*)\b(1[0-2]|[1-9]|15|25)\.\1\b/gi,
    (match, nStr) => {
      const w = clientNumberToThai(nStr);
      const spoken = `${w}เดือน${w}`;
      appliedRules.push({ from: match, to: spoken });
      return ` ${spoken} `;
    }
  );

  // 3. Stainless steel / grade 304, 316 -> สามศูนย์สี่
  text = text.replace(/\b(304|316)\b/g, (match) => {
    const spoken = match
      .split("")
      .map((c) => DIGITS_TH[parseInt(c, 10)] || c)
      .join("");
    appliedRules.push({ from: match, to: spoken });
    return spoken;
  });

  // 4. Percentages
  text = text.replace(/(\d+)\s*%/g, (match, p1) => {
    const spoken = p1 === "100" ? "ร้อยเปอร์เซ็นต์" : `${clientNumberToThai(p1)}เปอร์เซ็นต์`;
    appliedRules.push({ from: match, to: spoken });
    return ` ${spoken} `;
  });

  // 5. Decimals e.g. 5.5 -> ห้าจุดห้า
  text = text.replace(/(\d+)\.(\d+)/g, (match, p1, p2) => {
    const dec = p2
      .split("")
      .map((c: string) => DIGITS_TH[parseInt(c, 10)] || c)
      .join("");
    const spoken = `${clientNumberToThai(p1)}จุด${dec}`;
    appliedRules.push({ from: match, to: spoken });
    return ` ${spoken} `;
  });

  const unmapped = Array.from(new Set(text.match(/\b[A-Za-z]{2,}\b/g) || []));
  return {
    spokenText: text.replace(/\s+/g, " ").trim(),
    appliedRules: appliedRules.slice(0, 12),
    unmappedEnglish: unmapped,
  };
}

export const ScriptStoryboard: React.FC<ScriptStoryboardProps> = ({
  productId,
  productName,
  price,
  highlights,
  images = ["/samples/tumbler-1.svg", "/samples/tumbler-2.svg", "/samples/tumbler-3.svg"],
  storyboard,
  onUpdateStoryboard,
  onRegenerate,
  isRegenerating,
  voiceoverUrl,
  onVoiceoverGenerated,
  onAppendMedia,
  onNavigateToStep1,
}) => {
  const [data, setData] = useState<StoryboardPlan>(storyboard);
  const [ttsEngine, setTtsEngine] = useState<"free" | "gemini">("free");
  const [voiceType, setVoiceType] = useState<"female" | "male">("female");
  const [narrationGender, setNarrationGender] = useState<NarrationGender>("female");
  const [speechRate, setSpeechRate] = useState<string>("+0%");
  const [geminiVoice, setGeminiVoice] = useState<string>("Puck");
  const [voicePresetId, setVoicePresetId] = useState<string>(
    storyboard.voicePresetId || "vendor-live"
  );
  const [voiceIntensity, setVoiceIntensity] = useState<VoiceIntensity>(
    (storyboard.voiceIntensity as VoiceIntensity) || "mid"
  );
  const [polishVoice, setPolishVoice] = useState<boolean>(true);
  const [aiVoiceDisclaimer, setAiVoiceDisclaimer] = useState<boolean>(true);
  const [replicatedVoices, setReplicatedVoices] = useState<ReplicatedVoiceItem[]>([]);
  const [fallbackNotice, setFallbackNotice] = useState<string | null>(null);
  const [isGeneratingVoice, setIsGeneratingVoice] = useState(false);
  const [isUploadingMedia, setIsUploadingMedia] = useState(false);
  const [currentVoiceUrl, setCurrentVoiceUrl] = useState<string | null>(
    voiceoverUrl || null
  );
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  // Pronunciation dictionary states
  const [pronMap, setPronMap] = useState<Record<string, string>>(BUILTIN_PRON_MAP);
  const [customTerm, setCustomTerm] = useState<string>("");
  const [customSpoken, setCustomSpoken] = useState<string>("");
  const [isSavingPron, setIsSavingPron] = useState<boolean>(false);
  const [showFullDict, setShowFullDict] = useState<boolean>(false);

  const extraMediaInputRef = useRef<HTMLInputElement>(null);

  const fetchReplicatedVoices = async () => {
    try {
      const res = await apiFetch<any>("/api/replicated-voices", undefined, { silent: true });
      if (res && res.success && Array.isArray(res.voices)) {
        setReplicatedVoices(res.voices);
      }
    } catch (err) {
      console.error("Failed to load replicated voices:", err);
    }
  };

  const fetchPronunciationMap = async () => {
    try {
      const res = await apiFetch<any>("/api/pronunciation-map", undefined, { silent: true });
      if (res && res.success && res.map) {
        setPronMap({ ...BUILTIN_PRON_MAP, ...res.map });
      }
    } catch (err) {
      console.error("Failed to load pronunciation map:", err);
    }
  };

  useEffect(() => {
    fetchReplicatedVoices();
    fetchPronunciationMap();
    // Voice cloning lives in /voice (opened in a new tab) — pick up new clones on return
    const onFocus = () => fetchReplicatedVoices();
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, []);

  const [narrationText, setNarrationText] = useState<string>(
    storyboard.narrationScript ||
      buildNaturalNarrationText(
        productName,
        price,
        storyboard.scenes || [],
        storyboard.cta
      )
  );

  React.useEffect(() => {
    setData(storyboard);
    if (storyboard.narrationScript) {
      setNarrationText(storyboard.narrationScript);
    } else {
      setNarrationText(
        buildNaturalNarrationText(
          productName,
          price,
          storyboard.scenes || [],
          storyboard.cta
        )
      );
    }
  }, [storyboard, productName, price]);

  React.useEffect(() => {
    if (voiceoverUrl) {
      setCurrentVoiceUrl(voiceoverUrl);
    }
  }, [voiceoverUrl]);

  const phoneticPreview = React.useMemo(
    () => computeClientPhoneticPreview(narrationText, pronMap),
    [narrationText, pronMap]
  );

  const handleSaveCustomPronunciation = async () => {
    const t = customTerm.trim();
    const s = customSpoken.trim();
    if (!t || !s) return;

    setIsSavingPron(true);
    try {
      const nextPatch = { [t]: s };
      const res = await apiFetch<any>("/api/pronunciation-map", {
        method: "POST",
        body: { map: nextPatch },
      });
      if (res && res.success && res.map) {
        setPronMap({ ...BUILTIN_PRON_MAP, ...res.map });
      } else {
        setPronMap((prev) => ({ ...prev, [t]: s }));
      }
      setCustomTerm("");
      setCustomSpoken("");
    } finally {
      setIsSavingPron(false);
    }
  };

  const handleDeletePronunciation = async (termKey: string) => {
    try {
      const res = await apiFetch<any>(
        `/api/pronunciation-map?term=${encodeURIComponent(termKey)}`,
        { method: "DELETE" }
      );
      if (res && res.success && res.map) {
        setPronMap(res.map);
      }
    } catch (err) {
      console.error("Failed to delete pronunciation:", err);
    }
  };

  const handleApplyPhoneticToScriptBox = () => {
    if (phoneticPreview.spokenText) {
      handleNarrationChange(phoneticPreview.spokenText);
    }
  };

  const activeCaptionSettings: CaptionSettings = {
    ...DEFAULT_CAPTION_SETTINGS,
    ...(data.captionSettings || {}),
  };

  const updateCaptionSettings = (patch: Partial<CaptionSettings>) => {
    const nextSettings: CaptionSettings = {
      ...activeCaptionSettings,
      ...patch,
    };
    const updated: StoryboardPlan = {
      ...data,
      captionSettings: nextSettings,
    };
    setData(updated);
    onUpdateStoryboard(updated);
  };

  const updateHook = (field: string, val: any) => {
    const updated = {
      ...data,
      hook: { ...data.hook, [field]: val },
    };
    setData(updated);
    onUpdateStoryboard(updated);
  };

  const updateScene = (idx: number, field: string, val: any) => {
    const newScenes = [...data.scenes];
    newScenes[idx] = { ...newScenes[idx], [field]: val };
    const updated = { ...data, scenes: newScenes };
    setData(updated);
    onUpdateStoryboard(updated);
  };

  const updateCta = (field: string, val: any) => {
    const updated = {
      ...data,
      cta: { ...data.cta, [field]: val },
    };
    setData(updated);
    onUpdateStoryboard(updated);
  };

  const handleNarrationChange = (text: string) => {
    setNarrationText(text);
    const updated = { ...data, narrationScript: text };
    setData(updated);
    onUpdateStoryboard(updated);
  };

  const handleResetNarration = () => {
    const freshScript = buildNaturalNarrationText(
      productName,
      price,
      data.scenes || [],
      data.cta
    );
    handleNarrationChange(freshScript);
  };

  const handleGenerateVoice = async () => {
    if (!narrationText.trim()) {
      alert("กรุณาใส่ข้อความบทพากย์ก่อนกดบันทึกเสียงครับ");
      return;
    }

    setIsGeneratingVoice(true);
    setFallbackNotice(null);
    try {
      const payload: any = {
        productName,
        price,
        customText: narrationText.trim(),
        ttsEngine,
        voiceType,
        rate: speechRate,
        geminiVoice,
        presetId: voicePresetId,
        intensity: voiceIntensity,
        polish: polishVoice,
      };

      const resData = await apiFetch<any>("/api/synthesize-voice", {
        method: "POST",
        body: payload,
      });

      if (resData && resData.success) {
        const primaryAudio = resData.audioUrl || (resData.files && resData.files[0]?.url);
        if (primaryAudio) {
          setCurrentVoiceUrl(primaryAudio);
          if (resData.fallbackNotice) {
            setFallbackNotice(resData.fallbackNotice);
          }

          const updatedStoryboard: StoryboardPlan = {
            ...data,
            narrationScript: narrationText.trim(),
            voicePresetId,
            voiceIntensity,
            voiceLines: data.voiceLines
              ? data.voiceLines.map((vl) => ({
                  ...vl,
                  audioUrl: undefined,
                  rawAudioUrl: undefined,
                }))
              : undefined,
          };
          setData(updatedStoryboard);
          onUpdateStoryboard(updatedStoryboard);

          if (onVoiceoverGenerated) {
            onVoiceoverGenerated(primaryAudio, resData.duration);
          }
        }
      }
    } catch (err: any) {
      console.error("Generate voice error:", err);
    } finally {
      setIsGeneratingVoice(false);
    }
  };

  const captions = generatePostCaptions(
    productName,
    price,
    highlights,
    data.cta.ctaTitle,
    undefined,
    aiVoiceDisclaimer
  );

  const handleRerollStyle = (forcedPack?: PackId) => {
    const newDna = rerollClientStyleDNA(data.styleDNA, forcedPack);
    const variedScenes = data.scenes.map((s, idx) => ({
      ...s,
      layout: newDna.layouts[idx % newDna.layouts.length] || s.layout,
    }));
    const updated: StoryboardPlan = {
      ...data,
      scenes: variedScenes,
      styleDNA: newDna,
      theme: {
        ...data.theme,
        primaryColor: newDna.primaryColor,
        accentColor: newDna.accentColor,
        bgColor: newDna.bgColor,
        styleName: `${PACK_INFO[newDna.pack]?.name || newDna.pack}`,
      },
    };
    setData(updated);
    onUpdateStoryboard(updated);
  };

  const handleShuffleSceneLayouts = () => {
    const allIds = ALL_SCENE_LAYOUTS.map((l) => l.id);
    const shuffled = [...allIds].sort(() => Math.random() - 0.5);
    const updatedScenes = data.scenes.map((s, idx) => ({
      ...s,
      layout: shuffled[idx % shuffled.length],
    }));
    const updated: StoryboardPlan = {
      ...data,
      scenes: updatedScenes,
    };
    setData(updated);
    onUpdateStoryboard(updated);
  };

  const copyToClipboard = (text: string, index: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 3000);
  };

  const proPackIds = ALL_PACK_IDS.filter((id) => PACK_INFO[id].category === "pro");
  const collagePackIds = ALL_PACK_IDS.filter((id) => PACK_INFO[id].category === "collage");

  const renderMediaSelector = (
    selectedIdx: number,
    onSelect: (idx: number) => void,
    videoStartSec?: number,
    onChangeStartSec?: (sec: number | undefined) => void,
    videoAudioMode?: "mute" | "mix",
    onChangeAudioMode?: (mode: "mute" | "mix") => void,
    clipOptions?: { videoEndSec?: number; videoFillMode?: "freeze" | "error"; durationSec?: number; durationMode?: "voice" | "manual"; update: (key: string, value: any) => void }
  ) => {
    const safeIdx = Math.max(0, selectedIdx % Math.max(1, images.length));
    const currentUrl = images[safeIdx] || images[0] || "";
    const isVid = isVideoMedia(currentUrl);

    return (
      <div className="bg-base-100/80 border border-base-300 rounded-xl p-3 space-y-2.5">
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
          <span className="font-semibold text-base-content flex items-center gap-1.5">
            {isVid ? (
              <Film className="w-3.5 h-3.5 text-info" />
            ) : (
              <ImageIcon className="w-3.5 h-3.5 text-primary" />
            )}
            <span>สื่อที่ใช้ในฉากนี้:</span>
          </span>
          <div className="flex items-center gap-1.5 flex-wrap">
            {images.map((url, i) => {
              const itemIsVid = isVideoMedia(url);
              const active = i === safeIdx;
              return (
                <button
                  key={i}
                  type="button"
                  onClick={() => onSelect(i)}
                  className={`btn btn-xs rounded-lg gap-1 ${
                    active
                      ? "btn-primary font-bold shadow-xs"
                      : "btn-ghost border border-base-300 text-base-content/70"
                  }`}
                >
                  <span>#{i + 1}</span>
                  <span>{itemIsVid ? "🎬 คลิป" : "🖼️ รูป"}</span>
                </button>
              );
            })}
          </div>
        </div>

        {isVid && <video key={currentUrl} src={currentUrl} controls preload="metadata" className="w-full max-h-48 rounded-xl bg-neutral" aria-label="ดูคลิปต้นฉบับก่อนเลือกช่วง" />}
        {isVid && onChangeStartSec && onChangeAudioMode && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-2 border-t border-base-300 text-xs">
            <label className="flex items-center justify-between gap-2 bg-base-200/60 px-3 py-1.5 rounded-lg border border-base-300">
              <span className="font-medium text-base-content/80">เริ่มเล่นคลิปที่ (วินาที):</span>
              <input
                type="number"
                min={0}
                max={600}
                step={0.5}
                value={videoStartSec ?? ""}
                placeholder="อัตโนมัติ"
                onChange={(e) => onChangeStartSec(e.target.value === "" ? undefined : Math.max(0, Number(e.target.value) || 0))}
                className="input input-bordered input-xs w-20 text-right font-mono rounded-lg bg-base-100"
              />
            </label>
            <label className="flex items-center justify-between gap-2 bg-base-200/60 px-3 py-1.5 rounded-lg border border-base-300">
              <span className="font-medium text-base-content/80">เสียงคลิปต้นฉบับ:</span>
              <select
                value={videoAudioMode || "mute"}
                onChange={(e) => onChangeAudioMode(e.target.value as "mute" | "mix")}
                className="select select-bordered select-xs rounded-lg bg-base-100 font-medium"
              >
                <option value="mute">ปิดเสียงคลิป (ใช้เสียงพากย์)</option>
                <option value="mix">เปิดคลอเบาๆ 25% + พากย์</option>
              </select>
            </label>
          </div>
        )}
        {clipOptions && <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          {isVid && <>
            <label className="form-control space-y-1"><span>จบคลิปที่ (วินาที)</span><input aria-label="เวลาจบคลิป" type="number" min={0} step={0.1} value={clipOptions.videoEndSec ?? ""} placeholder="ว่าง = จบไฟล์ต้นฉบับ" onChange={(e) => clipOptions.update("videoEndSec", e.target.value === "" ? undefined : Number(e.target.value))} className="input input-bordered input-sm w-full rounded-xl" /></label>
            <label className="form-control space-y-1"><span>เมื่อช่วงคลิปสั้นกว่าฉาก</span><select aria-label="เมื่อคลิปสั้นกว่าฉาก" value={clipOptions.videoFillMode || "freeze"} onChange={(e) => clipOptions.update("videoFillMode", e.target.value)} className="select select-bordered select-sm w-full rounded-xl"><option value="freeze">ค้างภาพสุดท้ายของช่วงที่เลือก</option><option value="error">หยุดและให้เลือกช่วงเพิ่ม</option></select></label>
          </>}
          <label className="form-control space-y-1"><span>ระยะเวลาฉาก</span><select aria-label="วิธีกำหนดเวลาฉาก" value={clipOptions.durationMode || "voice"} onChange={(e) => clipOptions.update("durationMode", e.target.value)} className="select select-bordered select-sm w-full rounded-xl"><option value="voice">ให้ครอบคลุมเสียงพากย์</option><option value="manual">กำหนดเวลาเอง</option></select></label>
          <label className="form-control space-y-1"><span>{clipOptions.durationMode === "manual" ? "เวลาฉาก (วินาที)" : "เวลาฉากขั้นต่ำ (วินาที)"}</span><input aria-label="ระยะเวลาฉาก" type="number" min={0.5} step={0.1} value={clipOptions.durationSec || 3} onChange={(e) => clipOptions.update("durationSec", Math.max(0.5, Number(e.target.value) || 0.5))} className="input input-bordered input-sm w-full rounded-xl" /></label>
          {isVid && <p className="text-base-content/60 sm:col-span-2">เวลาเข้า–ออกกำหนดช่วงภาพต้นฉบับ ระบบไม่วนคลิป หากเว้นเวลาเริ่มไว้จะใช้ช่วงต่อจากฉากก่อนหน้า</p>}
        </div>}
      </div>
    );
  };

  return (
    <div className="bg-base-100 border border-base-300 rounded-2xl p-6 shadow-xs space-y-6 relative">
      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b border-base-300 flex-wrap gap-3">
        <div>
          <span className="text-xs font-bold text-primary bg-primary/10 border border-primary/20 px-2.5 py-1 rounded-full uppercase tracking-wider">
            Step 2: Storyboard, Voiceover & Subtitles
          </span>
          <h2 className="text-xl font-bold text-base-content mt-1.5 flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            <span>สตอรี่บอร์ด เลือกคลิป/ภาพ พากย์เสียง & แต่งซับ</span>
          </h2>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {onNavigateToStep1 && (
            <button
              type="button"
              onClick={onNavigateToStep1}
              className="btn btn-outline btn-xs rounded-xl gap-1.5 font-semibold"
              title="กลับไปหน้า 1 เพื่อแก้ไขข้อมูลสินค้าหรือจัดการรูป/คลิปทั้งหมด"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>กลับหน้า 1 (แก้ข้อมูล/จัดการรูป-คลิป)</span>
            </button>
          )}

          {onAppendMedia && (
            <>
              <input
                ref={extraMediaInputRef}
                type="file"
                multiple
                accept="image/jpeg,image/png,image/webp,video/mp4,video/quicktime,video/webm,.mp4,.mov,.webm"
                className="hidden"
                onChange={async (e) => {
                  if (e.target.files && e.target.files.length > 0) {
                    setIsUploadingMedia(true);
                    try {
                      await onAppendMedia(e.target.files);
                    } finally {
                      setIsUploadingMedia(false);
                      e.target.value = "";
                    }
                  }
                }}
              />
              <button
                type="button"
                disabled={isUploadingMedia}
                onClick={() => extraMediaInputRef.current?.click()}
                className="btn btn-outline btn-primary btn-xs rounded-xl gap-1.5 font-semibold"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>{isUploadingMedia ? "กำลังอัปโหลด..." : "+ เพิ่มรูป/คลิปด่วน"}</span>
              </button>
            </>
          )}

          <button
            type="button"
            onClick={() => onRegenerate("claude")}
            disabled={isRegenerating}
            className="btn btn-outline btn-primary btn-xs rounded-xl gap-1.5 font-semibold"
          >
            <Sparkles className={`w-3.5 h-3.5 ${isRegenerating ? "animate-spin" : ""}`} />
            <span>{isRegenerating ? "กำลังประมวลผล..." : "เขียนบทใหม่ (Claude)"}</span>
          </button>

          <button
            type="button"
            onClick={() => onRegenerate("gemini")}
            disabled={isRegenerating}
            className="btn btn-ghost btn-xs text-base-content/70 hover:text-base-content rounded-xl border border-base-300 gap-1.5 font-medium"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRegenerating ? "animate-spin" : ""}`} />
            <span>สร้างบทไว (Gemini)</span>
          </button>
        </div>
      </div>

      {/* Style DNA & Visual Pack Bar (12 Packs + 7 Layouts) */}
      <div className="space-y-2">
        <label htmlFor="video-presentation-style" className="text-sm font-semibold text-base-content">รูปแบบการนำเสนอ</label>
        <select
          id="video-presentation-style"
          className="select select-bordered w-full rounded-xl sm:max-w-sm"
          value={data.presentationStyle || "notebook-presenter"}
          aria-describedby="video-presentation-help"
          onChange={(event) => {
            const updated = { ...data, presentationStyle: event.target.value as "notebook-presenter" | "original" };
            setData(updated);
            onUpdateStoryboard(updated);
          }}
        >
          <option value="notebook-presenter">สมุดกระดาษ + มาสคอตของคุณ</option>
          <option value="original">ธีมและเลย์เอาต์เดิม</option>
        </select>
        <p id="video-presentation-help" className="text-sm text-base-content/65">
          {data.presentationStyle === "original"
            ? "เลือกธีม สี และเลย์เอาต์ของแต่ละฉากได้ด้านล่าง"
            : "มาสคอตนำเสนอคู่กับสินค้า พร้อมซับสติกเกอร์ตามเสียง ใช้รูปแบบเดียวกันทั้งพรีวิวและไฟล์ MP4"}
        </p>
      </div>
      {productId && data.presentationStyle !== "original" && <MascotUpload productId={productId} value={data} onChange={(mascot) => {
        const updated = { ...data, ...mascot };
        setData(updated);
        onUpdateStoryboard(updated);
      }} />}
      {data.presentationStyle === "original" && (
      <div className="bg-base-200/50 border border-base-300 rounded-2xl p-5 space-y-4 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center shadow-xs">
              <Palette className="w-4 h-4 text-primary" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-base-content flex items-center gap-2">
                <span>ธีมและสไตล์วิดีโอ (12 Pro Themes & 7 Layouts)</span>
                <span className="badge badge-primary badge-outline badge-xs py-2 px-2.5 font-medium">
                  {PACK_INFO[data.styleDNA?.pack || "pro-minimal-luxury"]?.name || "Pro Minimal Studio"}
                </span>
              </h3>
              <p className="text-xs text-base-content/60 mt-0.5">
                {PACK_INFO[data.styleDNA?.pack || "pro-minimal-luxury"]?.desc}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={handleShuffleSceneLayouts}
              className="btn btn-outline btn-xs rounded-xl gap-1.5"
              title="สุ่มเปลี่ยนการจัดวาง Layout ของแต่ละฉากให้ไม่ซ้ำกัน"
            >
              <Layout className="w-3.5 h-3.5" />
              <span>สลับ Layout ทุกฉาก</span>
            </button>
            <button
              type="button"
              onClick={() => handleRerollStyle()}
              className="btn btn-primary btn-xs rounded-xl gap-1.5 shadow-xs"
            >
              <Dices className="w-3.5 h-3.5" />
              <span>สุ่มธีม & สีใหม่</span>
            </button>
          </div>
        </div>

        {/* 4 Pro Commercial Studio Packs */}
        <div className="space-y-2 pt-2 border-t border-base-300">
          <div className="text-[11px] font-bold text-primary uppercase tracking-wider">
            ✦ โหมดสตูดิโอขายของมือโปร (Pro Commercial Studio — แนะนำสำหรับใส่คลิปและภาพสินค้าจริง)
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {proPackIds.map((pId) => {
              const pInfo = PACK_INFO[pId];
              const isSelected = (data.styleDNA?.pack || "pro-minimal-luxury") === pId;
              return (
                <button
                  key={pId}
                  type="button"
                  onClick={() => handleRerollStyle(pId)}
                  className={`text-left p-2.5 rounded-xl border text-xs transition flex flex-col gap-1 ${
                    isSelected
                      ? "bg-primary/10 border-2 border-primary text-base-content shadow-xs"
                      : "bg-base-100 border-base-300 text-base-content/80 hover:border-primary/40"
                  }`}
                >
                  <div className="font-bold truncate text-base-content">{pInfo.name}</div>
                  <div className="text-[10px] text-base-content/60 line-clamp-2 leading-snug">{pInfo.desc}</div>
                </button>
              );
            })}
          </div>
        </div>

        {/* 8 Creative Paper Collage Packs */}
        <div className="space-y-2 pt-1">
          <div className="text-[11px] font-semibold text-base-content/60">
            🎨 โหมดคอลลาจและป๊อปอาร์ต (Creative Collage & Pop-Art Packs):
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {collagePackIds.map((pId) => {
              const pInfo = PACK_INFO[pId];
              const isSelected = data.styleDNA?.pack === pId;
              return (
                <button
                  key={pId}
                  type="button"
                  onClick={() => handleRerollStyle(pId)}
                  className={`text-left p-2.5 rounded-xl border text-xs transition flex items-center gap-2 ${
                    isSelected
                      ? "bg-primary/10 border-2 border-primary text-base-content shadow-xs"
                      : "bg-base-100 border-base-300 text-base-content/80 hover:border-base-content/30"
                  }`}
                >
                  <div className="truncate">
                    <div className="font-bold truncate text-base-content">{pInfo.name}</div>
                    <div className="text-[10px] text-base-content/60 truncate">{pInfo.desc}</div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      )}

      {/* Professional AI Voiceover (TTS) + Pronunciation & Thai Accent Tuner */}
      <div className="bg-base-200/50 border border-base-300 rounded-2xl p-5 space-y-4 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center shadow-xs">
              <Mic className="w-4 h-4 text-primary" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-base-content flex items-center gap-2">
                <span>บทพากย์เสียง AI & ปรับสำเนียงคำอ่านไทย</span>
                <span className="badge badge-success badge-outline badge-xs py-2 px-2.5 font-medium">
                  อ่านแบรนด์ & แคมเปญแม่นยำ
                </span>
              </h3>
              <p className="text-xs text-base-content/60 mt-0.5">
                แปลงคำอ่านอัตโนมัติ เช่น DODOLOVE → ดูดูเลิฟ, 10.10 → สิบเดือนสิบ, 304 → สามศูนย์สี่
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleGenerateVoice}
            disabled={isGeneratingVoice}
            className="btn btn-primary btn-sm rounded-xl gap-1.5 shadow-sm shrink-0"
          >
            {isGeneratingVoice ? (
              <>
                <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>กำลังอัดเสียง...</span>
              </>
            ) : (
              <>
                <Volume2 className="w-3.5 h-3.5" />
                <span>{currentVoiceUrl ? "อัดเสียงพากย์ใหม่" : "บันทึกเสียงพากย์"}</span>
              </>
            )}
          </button>
        </div>

        {/* Engine Switch: Free vs Gemini */}
        <div className="join border border-base-300 bg-base-100 rounded-xl p-0.5 w-full grid grid-cols-2">
          <button
            type="button"
            onClick={() => setTtsEngine("free")}
            className={`join-item btn btn-sm gap-2 ${
              ttsEngine === "free"
                ? "btn-primary font-bold shadow-xs"
                : "btn-ghost text-base-content/70"
            }`}
          >
            <Zap className="w-3.5 h-3.5" />
            <span>เสียงมาตรฐานฟรี (เสถียร รวดเร็ว)</span>
          </button>

          <button
            type="button"
            onClick={() => setTtsEngine("gemini")}
            className={`join-item btn btn-sm gap-2 ${
              ttsEngine === "gemini"
                ? "btn-primary font-bold shadow-xs"
                : "btn-ghost text-base-content/70"
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>เสียง AI ขั้นสูง / โคลนเสียง</span>
          </button>
        </div>

        {ttsEngine === "free" ? (
          <div className="bg-base-100 border border-base-300 rounded-xl p-3.5 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-base-content whitespace-nowrap">ผู้พากย์:</span>
                <select
                  value={voiceType}
                  onChange={(e) => setVoiceType(e.target.value as any)}
                  className="select select-bordered select-xs rounded-lg bg-base-100 text-base-content border-base-300 font-medium"
                >
                  <option value="female">พรีมวดี (ผู้หญิง - สดใส/ป้ายยา)</option>
                  <option value="male">นิวัฒน์ (ผู้ชาย - เป็นมิตร/น่าเชื่อถือ)</option>
                </select>
              </div>

              <div className="flex items-center gap-1 flex-wrap">
                <div className="flex items-center gap-1 text-xs font-bold text-base-content mr-1">
                  <Gauge className="w-3.5 h-3.5 text-primary" />
                  <span>สปีดเสียง:</span>
                </div>
                {[
                  { label: "0.85x ช้า", rate: "-15%", desc: "ชัดถ้อยชัดคำ" },
                  { label: "0.9x ฟังสบาย", rate: "-10%", desc: "ช้าลงเล็กน้อย" },
                  { label: "1.0x ปกติ", rate: "+0%", desc: "ความเร็วมาตรฐาน" },
                  { label: "1.15x กระฉับกระเฉง", rate: "+15%", desc: "พูดไว มีเอเนอร์จี้" },
                  { label: "1.25x ไวรัล", rate: "+25%", desc: "เร็ว สไตล์ TikTok ไวรัล" },
                ].map((s) => {
                  const active = speechRate === s.rate;
                  return (
                    <button
                      key={s.rate}
                      type="button"
                      onClick={() => setSpeechRate(s.rate)}
                      title={s.desc}
                      className={`btn btn-xs rounded-lg ${
                        active
                          ? "btn-primary font-bold shadow-xs"
                          : "btn-ghost text-base-content/70 border border-base-300"
                      }`}
                    >
                      {s.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-base-100 border border-base-300 rounded-xl p-3.5 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-bold text-base-content whitespace-nowrap">เสียงพากย์ AI:</span>
                <select
                  value={geminiVoice}
                  onChange={(e) => setGeminiVoice(e.target.value)}
                  className="select select-bordered select-xs rounded-lg bg-base-100 text-base-content border-base-300 font-medium"
                >
                  {replicatedVoices.length > 0 && (
                    <optgroup label="เสียงโคลนของฉัน (Replicated)">
                      {replicatedVoices.map((v) => (
                        <option key={v.id} value={v.id}>
                          {v.displayName} (ไม่ระบุเพศ)
                        </option>
                      ))}
                    </optgroup>
                  )}
                  <optgroup label="เสียงมาตรฐาน">
                    <option value="Puck">Puck (ชาย · สดใส มีเอเนอร์จี้ ชวนช้อป)</option>
                    <option value="Kore">Kore (หญิง · มั่นใจ สุภาพ พรีเมียม)</option>
                    <option value="Aoede">Aoede (หญิง · ฟังสบาย เป็นกันเอง)</option>
                    <option value="Charon">Charon (ชาย · สุขุม น่าเชื่อถือ)</option>
                    <option value="Fenrir">Fenrir (ชาย · ตื่นเต้น เร้าใจ)</option>
                  </optgroup>
                </select>

                <a
                  href="/voice?clone=1"
                  target="_blank"
                  rel="noopener"
                  className="btn btn-primary btn-xs rounded-lg gap-1.5 font-medium shadow-xs"
                >
                  <Mic className="w-3.5 h-3.5" />
                  โคลนเสียงใน Voice Studio
                </a>
              </div>
            </div>
          </div>
        )}

        <VoiceStylePicker
          category={storyboard.theme?.styleName}
          hookText={data.hook?.headline || ""}
          selectedPresetId={voicePresetId}
          onSelectPreset={(pId) => {
            setVoicePresetId(pId);
            const updated = { ...data, voicePresetId: pId };
            setData(updated);
            onUpdateStoryboard(updated);
          }}
          intensity={voiceIntensity}
          onChangeIntensity={(lvl) => {
            setVoiceIntensity(lvl);
            const updated = { ...data, voiceIntensity: lvl };
            setData(updated);
            onUpdateStoryboard(updated);
          }}
          polish={polishVoice}
          onTogglePolish={setPolishVoice}
          aiDisclaimer={aiVoiceDisclaimer}
          onToggleAiDisclaimer={setAiVoiceDisclaimer}
          geminiVoice={geminiVoice}
          ttsEngine={ttsEngine}
          voiceLines={data.voiceLines}
          onVoiceLinesUpdated={(lines) => {
            const updated = { ...data, voiceLines: lines };
            setData(updated);
            onUpdateStoryboard(updated);
          }}
        />

        {fallbackNotice && (
          <div className="text-xs text-amber-900 bg-amber-50 border border-amber-300 rounded-xl p-2.5 flex items-center gap-2">
            <Info className="w-4 h-4 text-amber-600 shrink-0" />
            <span>{fallbackNotice}</span>
          </div>
        )}

        {/* Narration Textarea */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs flex-wrap gap-2">
            <label htmlFor="narration-script" className="text-base-content font-semibold flex items-center gap-1.5">
              <span>ข้อความบทพากย์รวม (แก้ไขคำพูดได้อิสระ):</span>
            </label>
            <div className="flex items-center gap-2 flex-wrap">
              <button
                type="button"
                onClick={handleApplyPhoneticToScriptBox}
                className="btn btn-outline btn-secondary btn-xs rounded-lg gap-1"
                title="แปลงคำภาษาอังกฤษและตัวเลขในกล่องข้อความให้เป็นคำอ่านภาษาไทยโดยตรง"
              >
                <Wand2 className="w-3 h-3" />
                <span>แปลงเป็นคำอ่านไทยในกล่องนี้</span>
              </button>
              <button
                type="button"
                onClick={handleResetNarration}
                className="btn btn-ghost btn-xs text-primary hover:underline gap-1"
              >
                <RefreshCw className="w-3 h-3" />
                <span>เรียบเรียงบทใหม่</span>
              </button>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <label htmlFor="narration-gender" className="text-xs font-medium text-base-content">
              รูปแบบคำพูด:
            </label>
            <select
              id="narration-gender"
              value={narrationGender}
              onChange={(e) => setNarrationGender(e.target.value as NarrationGender)}
              className="select select-sm rounded-xl bg-base-100 border-base-300"
              disabled={isGeneratingVoice}
            >
              <option value="male">ชาย (ครับ)</option>
              <option value="female">หญิง (ค่ะ / คะ)</option>
            </select>
            <button
              type="button"
              className="btn btn-primary btn-sm rounded-xl gap-1.5"
              disabled={isGeneratingVoice || !narrationText.trim()}
              onClick={() => handleNarrationChange(adjustNarrationGender(narrationText, narrationGender))}
              aria-describedby="narration-gender-help"
            >
              <Wand2 className="w-3.5 h-3.5" aria-hidden="true" />
              ปรับคำพูดทั้งบท
            </button>
          </div>
          <p id="narration-gender-help" className="text-xs text-base-content/70">
            เปลี่ยนคำลงท้ายทั้งบทตามเพศที่เลือก โดยใช้ คะ กับคำถามและ นะคะ · เลือกเสียงพากย์แยกได้ด้านบน
          </p>

          <textarea
            id="narration-script"
            value={narrationText}
            onChange={(e) => handleNarrationChange(e.target.value)}
            rows={3}
            className="textarea textarea-bordered w-full bg-base-100 border-base-300 rounded-xl p-3 text-xs text-base-content focus:border-primary resize-none font-sans shadow-xs"
            placeholder="พิมพ์หรือปรับแต่งข้อความที่ต้องการให้เสียง AI พูดในวิดีโอ..."
          />

          {/* Live Phonetic & Thai Accent Preview Box */}
          <div className="bg-base-100 border border-primary/25 rounded-xl p-3.5 space-y-2.5 text-xs">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <span className="font-bold text-primary flex items-center gap-1.5">
                <BookOpen className="w-3.5 h-3.5" />
                <span>คำอ่านออกเสียงจริงที่จะส่งให้ AI พูด (Thai Phonetic Preview):</span>
              </span>
              <button
                type="button"
                onClick={() => setShowFullDict((v) => !v)}
                className="btn btn-ghost btn-xs text-primary underline"
              >
                {showFullDict ? "ซ่อนพจนานุกรมคำอ่าน" : "ตั้งค่าคำอ่านแบรนด์/ตัวเลขเพิ่มเติม"}
              </button>
            </div>

            <p className="text-xs text-base-content/90 bg-base-200/70 p-2.5 rounded-lg border border-base-300 leading-relaxed">
              {phoneticPreview.spokenText || "ยังไม่มีข้อความบทพากย์"}
            </p>

            {/* Applied Accent Replacements */}
            {phoneticPreview.appliedRules.length > 0 && (
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-[11px] text-base-content/60 font-medium">แปลงสำเนียงอัตโนมัติ:</span>
                {phoneticPreview.appliedRules.map((r, i) => (
                  <span
                    key={i}
                    onClick={() => {
                      setCustomTerm(r.from);
                      setCustomSpoken(r.to);
                      setShowFullDict(true);
                    }}
                    title="คลิกเพื่อแก้ไขคำอ่านคำนี้"
                    className="badge badge-success badge-outline badge-xs py-2 px-2 cursor-pointer hover:bg-success/10"
                  >
                    {r.from} → {r.to}
                  </span>
                ))}
              </div>
            )}

            {/* Unmapped English words warning chips */}
            {phoneticPreview.unmappedEnglish.length > 0 && (
              <div className="flex items-center gap-1.5 flex-wrap pt-1">
                <span className="text-[11px] text-warning font-semibold">
                  คลิกที่คำอังกฤษเพื่อตั้งคำอ่านไทย:
                </span>
                {phoneticPreview.unmappedEnglish.map((w) => (
                  <button
                    key={w}
                    type="button"
                    onClick={() => {
                      setCustomTerm(w);
                      setCustomSpoken("");
                      setShowFullDict(true);
                    }}
                    className="badge badge-warning badge-outline badge-xs py-2 px-2 cursor-pointer hover:bg-warning/20 font-semibold"
                  >
                    + ตั้งคำอ่าน &ldquo;{w}&rdquo;
                  </button>
                ))}
              </div>
            )}

            {/* Custom Pronunciation Dictionary Editor */}
            {showFullDict && (
              <div className="pt-2.5 border-t border-base-300 space-y-2.5">
                <div className="text-[11px] text-base-content/70 font-medium">
                  กำหนดคำอ่านเฉพาะคำ (เช่น DODOLOVE → ดูดูเลิฟ, 10.10 → สิบเดือนสิบ, 304 → สามศูนย์สี่):
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <input
                    type="text"
                    value={customTerm}
                    onChange={(e) => setCustomTerm(e.target.value)}
                    placeholder="คำศัพท์ / แบรนด์ เช่น DODOLOVE"
                    className="input input-bordered input-xs rounded-lg bg-base-100 text-xs"
                  />
                  <input
                    type="text"
                    value={customSpoken}
                    onChange={(e) => setCustomSpoken(e.target.value)}
                    placeholder="คำอ่านไทย เช่น ดูดูเลิฟ"
                    className="input input-bordered input-xs rounded-lg bg-base-100 text-xs"
                  />
                  <button
                    type="button"
                    disabled={isSavingPron || !customTerm.trim() || !customSpoken.trim()}
                    onClick={handleSaveCustomPronunciation}
                    className="btn btn-primary btn-xs rounded-lg gap-1 font-bold"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>บันทึกคำอ่าน</span>
                  </button>
                </div>

                <div className="max-h-36 overflow-y-auto flex flex-wrap gap-1.5 pt-1">
                  {Object.entries(pronMap).map(([k, v]) => (
                    <div
                      key={k}
                      className="inline-flex items-center gap-1.5 bg-base-200 border border-base-300 px-2.5 py-1 rounded-lg text-[11px]"
                    >
                      <button
                        type="button"
                        onClick={() => {
                          setCustomTerm(k);
                          setCustomSpoken(v);
                        }}
                        className="hover:underline font-medium"
                      >
                        <strong>{k}</strong> → {v}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeletePronunciation(k)}
                        className="text-error hover:opacity-80"
                        title={`ลบคำอ่าน ${k}`}
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {currentVoiceUrl && (
          <div className="pt-2 border-t border-base-300 flex items-center gap-3">
            <span className="text-xs text-success font-semibold flex items-center gap-1 whitespace-nowrap">
              <Check className="w-3.5 h-3.5" />
              <span>ฟังเสียงพากย์:</span>
            </span>
            <audio controls src={currentVoiceUrl} className="h-8 flex-1" />
          </div>
        )}
      </div>

      {/* Interactive Subtitle Studio */}
      <div className="bg-base-200/50 border border-base-300 rounded-2xl p-5 space-y-4 shadow-xs">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center shadow-xs">
              <Subtitles className="w-4 h-4 text-primary" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-base-content flex items-center gap-2">
                <span>ซับไตเติลในวิดีโอ (Subtitle Studio)</span>
                <span className="badge badge-primary badge-outline badge-xs py-2 px-2">
                  ซิงค์ตามเสียงพูดอัตโนมัติ
                </span>
              </h3>
              <p className="text-xs text-base-content/60">
                ปรับรูปแบบซับ ตำแหน่ง และสีไฮไลต์คำพูดให้เข้ากับคลิปของคุณ
              </p>
            </div>
          </div>

          <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold">
            <span>แสดงซับไตเติลในคลิป</span>
            <input
              type="checkbox"
              checked={activeCaptionSettings.enabled}
              onChange={(e) => updateCaptionSettings({ enabled: e.target.checked })}
              className="toggle toggle-primary toggle-sm"
            />
          </label>
        </div>

        {activeCaptionSettings.enabled && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-base-300 text-xs">
            <div>
              <label className="block font-semibold text-base-content/80 mb-1">สไตล์ซับไตเติล</label>
              <select
                value={activeCaptionSettings.style}
                onChange={(e) => updateCaptionSettings({ style: e.target.value as CaptionStyleId })}
                className="select select-bordered select-sm w-full rounded-xl bg-base-100 text-xs font-medium"
              >
                <option value="tiktok-pop">{data.presentationStyle === "original" ? "TikTok Pop (เด้งทีละคำยอดฮิต)" : "สติกเกอร์กระดาษ (ขึ้นตามช่วงเสียง)"}</option>
                <option value="karaoke-pill">Karaoke Pill (แคปซูลโมเดิร์น)</option>
                <option value="clean-bar">Clean Bar (แถบซับขาวคลีนอ่านง่าย)</option>
                <option value="minimal-outline">Minimal Outline (ขอบหนาไร้พื้นหลัง ไม่บังคลิป)</option>
              </select>
            </div>

            <div>
              <label className="block font-semibold text-base-content/80 mb-1">ตำแหน่งซับ</label>
              <select
                value={activeCaptionSettings.position}
                onChange={(e) => updateCaptionSettings({ position: e.target.value as CaptionPosition })}
                className="select select-bordered select-sm w-full rounded-xl bg-base-100 text-xs font-medium"
              >
                <option value="bottom">ด้านล่าง (เหนือตะกร้าส้ม Safe Zone)</option>
                <option value="center">กึ่งกลางหน้าจอ (เน้นสายตา)</option>
                <option value="top">ด้านบน (ใต้หัวข้อหลัก)</option>
              </select>
            </div>

            <div>
              <label className="block font-semibold text-base-content/80 mb-1">สีไฮไลต์คำที่กำลังพูด</label>
              <div className="flex items-center gap-2 pt-1">
                {[
                  { color: "#FACC15", label: "เหลืองทอง" },
                  { color: "#EE4D2D", label: "ส้ม Shopee" },
                  { color: "#38BDF8", label: "ฟ้าสดใส" },
                  { color: "#4ADE80", label: "เขียวมรกต" },
                  { color: "#F472B6", label: "ชมพูพาสเทล" },
                  { color: "#FFFFFF", label: "ขาวคลีน" },
                ].map((sw) => (
                  <button
                    key={sw.color}
                    type="button"
                    title={sw.label}
                    onClick={() => updateCaptionSettings({ highlightColor: sw.color })}
                    className={`w-6 h-6 rounded-full border-2 transition ${
                      activeCaptionSettings.highlightColor === sw.color
                        ? "border-base-content scale-115 ring-2 ring-primary/40"
                        : "border-base-300 opacity-80 hover:opacity-100"
                    }`}
                    style={{ backgroundColor: sw.color }}
                  />
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 1. Hook Scene Editor (0-3s) */}
      <div className="bg-base-200/40 border border-base-300 rounded-2xl p-4 space-y-3 shadow-xs">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-primary animate-pulse" />
            <h3 className="text-sm font-semibold text-primary uppercase tracking-wide">
              ช่วงที่ 1: Hook เปิดคลิป (0 - 3 วินาที)
            </h3>
          </div>
          <span className="text-xs text-base-content/70 bg-base-100 px-2.5 py-0.5 rounded-lg border border-base-300 shadow-xs font-mono">
            {data.hook.durationSec} วินาที
          </span>
        </div>

        {renderMediaSelector(
          data.hook.imageIndex ?? 0,
          (idx) => updateHook("imageIndex", idx),
          data.hook.videoStartSec,
          (sec) => updateHook("videoStartSec", sec),
          data.hook.videoAudioMode,
          (mode) => updateHook("videoAudioMode", mode),
          { ...data.hook, update: updateHook }
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="md:col-span-1">
            <label className="block text-xs font-semibold text-base-content/80 mb-1">
              สติกเกอร์ Badge
            </label>
            <input
              type="text"
              value={data.hook.badgeText || ""}
              onChange={(e) => updateHook("badgeText", e.target.value)}
              className="input input-bordered w-full rounded-xl bg-base-100 text-base-content border-base-300 focus:border-primary text-xs shadow-xs"
            />
          </div>
          <div className="md:col-span-2">
            <label className="block text-xs font-semibold text-base-content/80 mb-1">
              Headline ข้อความเปิดคลิป (Hook ชวนหยุดดู)
            </label>
            <input
              type="text"
              value={data.hook.headline}
              onChange={(e) => updateHook("headline", e.target.value)}
              className="input input-bordered w-full rounded-xl bg-base-100 text-base-content border-base-300 focus:border-primary text-xs shadow-xs font-semibold"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-base-content/80 mb-1">
              คำบรรยายรองบนจอ (Subheadline)
            </label>
            <input
              type="text"
              value={data.hook.subheadline || ""}
              onChange={(e) => updateHook("subheadline", e.target.value)}
              className="input input-bordered w-full rounded-xl bg-base-100 text-base-content border-base-300 focus:border-primary text-xs shadow-xs"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-base-content/80 mb-1">
              ข้อความซับไตเติลช่วง Hook (เว้นว่างเพื่อใช้ตามบทพูด)
            </label>
            <input
              type="text"
              placeholder={data.hook.subheadline || "ใช้ข้อความตามบทพูดอัตโนมัติ"}
              value={data.hook.customCaption || ""}
              onChange={(e) => updateHook("customCaption", e.target.value)}
              className="input input-bordered w-full rounded-xl bg-base-100 text-base-content border-base-300 focus:border-primary text-xs shadow-xs"
            />
          </div>
        </div>
      </div>

      {/* 2. Body Scenes Editor (3-12s) */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-primary uppercase tracking-wide flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-primary" />
            <span>ช่วงที่ 2: Body นำเสนอจุดเด่นสินค้า{data.presentationStyle === "original" ? " (เลือกภาพ/คลิป และ Layout รายฉากได้)" : " (เลือกภาพหรือคลิปสำหรับแต่ละฉาก)"}</span>
          </h3>
          <span className="text-xs text-base-content/60 font-medium">
            {data.scenes.length} ฉาก
          </span>
        </div>

        <div className="space-y-3">
          {data.scenes.map((scene, idx) => (
            <div
              key={idx}
              className="bg-base-100 border border-base-300 rounded-2xl p-4 space-y-3 shadow-xs"
            >
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                <span className="font-semibold text-base-content flex items-center gap-2">
                  <span className="w-5 h-5 rounded-lg bg-primary/10 border border-primary/20 text-primary flex items-center justify-center font-mono font-bold text-xs">
                    {idx + 1}
                  </span>
                  <span>ฉากจุดเด่นที่ {idx + 1}</span>
                </span>

                {data.presentationStyle === "original" && <div className="flex items-center gap-2">
                  <span className="text-base-content/60 font-medium">รูปแบบการจัดวาง:</span>
                  <select
                    value={scene.layout || ALL_SCENE_LAYOUTS[idx % ALL_SCENE_LAYOUTS.length].id}
                    onChange={(e) => updateScene(idx, "layout", e.target.value as SceneLayout)}
                    className="select select-bordered select-xs rounded-lg bg-base-100 font-semibold text-primary"
                  >
                    {ALL_SCENE_LAYOUTS.map((ly) => (
                      <option key={ly.id} value={ly.id}>
                        {ly.label}
                      </option>
                    ))}
                  </select>
                </div>}
              </div>

              {renderMediaSelector(
                scene.imageIndex ?? idx,
                (newImgIdx) => updateScene(idx, "imageIndex", newImgIdx),
                scene.videoStartSec,
                (sec) => updateScene(idx, "videoStartSec", sec),
                scene.videoAudioMode,
                (mode) => updateScene(idx, "videoAudioMode", mode),
                { ...scene, update: (key, value) => updateScene(idx, key, value) }
              )}

              <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
                <div className="md:col-span-1">
                  <input
                    type="text"
                    value={scene.stickerText || ""}
                    onChange={(e) => updateScene(idx, "stickerText", e.target.value)}
                    placeholder="สติกเกอร์ เช่น ❄️ เย็นนาน"
                    className="input input-bordered w-full rounded-xl bg-base-100 text-base-content border-base-300 focus:border-primary text-xs shadow-xs"
                  />
                </div>
                <div className="md:col-span-2">
                  <input
                    type="text"
                    value={scene.highlightTitle}
                    onChange={(e) => updateScene(idx, "highlightTitle", e.target.value)}
                    placeholder="หัวข้อจุดเด่น"
                    className="input input-bordered w-full rounded-xl bg-base-100 text-base-content border-base-300 focus:border-primary text-xs shadow-xs font-semibold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                <input
                  type="text"
                  value={scene.highlightDesc}
                  onChange={(e) => updateScene(idx, "highlightDesc", e.target.value)}
                  placeholder="คำอธิบายสั้นๆ บนการ์ด"
                  className="input input-bordered w-full rounded-xl bg-base-100 text-base-content border-base-300 focus:border-primary text-xs shadow-xs"
                />
                <input
                  type="text"
                  value={scene.customCaption || ""}
                  onChange={(e) => updateScene(idx, "customCaption", e.target.value)}
                  placeholder="ซับไตเติลฉากนี้ (เว้นว่างเพื่อใช้ตามคำอธิบาย/บทพูด)"
                  className="input input-bordered w-full rounded-xl bg-base-100 text-base-content border-base-300 focus:border-primary text-xs shadow-xs"
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 3. CTA Scene Editor (12-15s) */}
      <div className="bg-base-200/40 border border-base-300 rounded-2xl p-4 space-y-3 shadow-xs">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-primary" />
            <h3 className="text-sm font-semibold text-primary uppercase tracking-wide">
              ช่วงที่ 3: CTA ปิดท้าย ชวนกดตะกร้า (12 - 15 วินาที)
            </h3>
          </div>
          <span className="text-xs text-base-content/70 bg-base-100 px-2.5 py-0.5 rounded-lg border border-base-300 shadow-xs font-mono">
            {data.cta.durationSec} วินาที
          </span>
        </div>

        {renderMediaSelector(
          data.cta.imageIndex ?? Math.max(0, images.length - 1),
          (idx) => updateCta("imageIndex", idx),
          data.cta.videoStartSec,
          (sec) => updateCta("videoStartSec", sec),
          data.cta.videoAudioMode,
          (mode) => updateCta("videoAudioMode", mode),
          { ...data.cta, update: updateCta }
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-base-content/80 mb-1">
              ข้อความปิดท้าย (CTA Headline)
            </label>
            <input
              type="text"
              value={data.cta.ctaTitle}
              onChange={(e) => updateCta("ctaTitle", e.target.value)}
              className="input input-bordered w-full rounded-xl bg-base-100 text-base-content border-base-300 focus:border-primary text-xs shadow-xs font-semibold"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-base-content/80 mb-1">
              คำกระตุ้นสิทธิพิเศษ (Sub-incentive)
            </label>
            <input
              type="text"
              value={data.cta.ctaSubtitle || ""}
              onChange={(e) => updateCta("ctaSubtitle", e.target.value)}
              className="input input-bordered w-full rounded-xl bg-base-100 text-base-content border-base-300 focus:border-primary text-xs shadow-xs"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-base-content/80 mb-1">
              ชี้เป้าตะกร้าส้ม (Basket Note)
            </label>
            <input
              type="text"
              value={data.cta.basketNote || ""}
              onChange={(e) => updateCta("basketNote", e.target.value)}
              className="input input-bordered w-full rounded-xl bg-base-100 text-base-content border-base-300 focus:border-primary text-xs shadow-xs"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-base-content/80 mb-1">
              ซับไตเติลช่วง CTA (เว้นว่างเพื่อใช้ตามบทพูด)
            </label>
            <input
              type="text"
              placeholder={data.cta.ctaSubtitle || "ใช้ข้อความตามบทพูดอัตโนมัติ"}
              value={data.cta.customCaption || ""}
              onChange={(e) => updateCta("customCaption", e.target.value)}
              className="input input-bordered w-full rounded-xl bg-base-100 text-base-content border-base-300 focus:border-primary text-xs shadow-xs"
            />
          </div>
        </div>
      </div>

      {/* 4. POST CAPTIONS & HASHTAGS */}
      <div className="bg-base-200/40 border border-base-300 rounded-2xl p-5 space-y-4 shadow-xs">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-base-content flex items-center gap-2">
              <FileText className="w-4 h-4 text-primary" />
              <span>แคปชั่นและแฮชแท็กพร้อมโพสต์ (Post Captions & Hashtags)</span>
            </h3>
            <p className="text-xs text-base-content/60 mt-0.5">
              กดปุ่มก็อปปี้เพื่อนำไปวางในช่องแคปชั่นตอนโพสต์คลิปบน Shopee Video / TikTok ได้ทันที
            </p>
          </div>
        </div>

        <div className="space-y-3">
          {captions.map((cap, i) => (
            <div
              key={i}
              className="bg-base-100 border border-base-300 rounded-xl p-4 space-y-2.5 shadow-xs"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-primary">{cap.styleName}</span>
                <button
                  type="button"
                  onClick={() => copyToClipboard(cap.fullPost, i)}
                  className={`btn btn-xs rounded-lg gap-1.5 transition ${
                    copiedIndex === i
                      ? "btn-success text-white"
                      : "btn-ghost border border-base-300"
                  }`}
                >
                  {copiedIndex === i ? (
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

              <div className="text-xs text-base-content/90 whitespace-pre-line leading-relaxed bg-base-200/60 p-3 rounded-lg border border-base-300 font-mono">
                {cap.fullPost}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
