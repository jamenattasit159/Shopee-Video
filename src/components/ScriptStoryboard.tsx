"use client";

import {
  Check,
  Copy,
  Edit3,
  Gauge,
  Info,
  Mic,
  Music,
  Palette,
  Play,
  RefreshCw,
  Sparkles,
  Volume2,
  Wand2,
  Zap,
} from "lucide-react";
import React, { useState, useEffect } from "react";
import { PackId, StoryboardPlan } from "../../remotion/types";
import { CaptionPackage, generatePostCaptions } from "../lib/captions";
import { buildNaturalNarrationText } from "../lib/narrationHelper";
import { ALL_PACK_IDS, PACK_INFO, rerollClientStyleDNA } from "../lib/styleConstants";
import { VoiceCloningModal, ReplicatedVoiceItem } from "./VoiceCloningModal";
import { VoiceStylePicker } from "./VoiceStylePicker";
import { VoiceIntensity } from "@/lib/voicePresets";
import { apiFetch } from "@/lib/apiFetch";

interface ScriptStoryboardProps {
  productName: string;
  price: string;
  highlights: string;
  storyboard: StoryboardPlan;
  onUpdateStoryboard: (updated: StoryboardPlan) => void;
  onRegenerate: () => Promise<void>;
  isRegenerating: boolean;
  voiceoverUrl?: string;
  onVoiceoverGenerated?: (url: string, duration?: number) => void;
}

export const ScriptStoryboard: React.FC<ScriptStoryboardProps> = ({
  productName,
  price,
  highlights,
  storyboard,
  onUpdateStoryboard,
  onRegenerate,
  isRegenerating,
  voiceoverUrl,
  onVoiceoverGenerated,
}) => {
  const [data, setData] = useState<StoryboardPlan>(storyboard);
  const [ttsEngine, setTtsEngine] = useState<"free" | "gemini">("free");
  const [voiceType, setVoiceType] = useState<"female" | "male">("female");
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
  const [isCloningModalOpen, setIsCloningModalOpen] = useState<boolean>(false);
  const [fallbackNotice, setFallbackNotice] = useState<string | null>(null);
  const [isGeneratingVoice, setIsGeneratingVoice] = useState(false);
  const [currentVoiceUrl, setCurrentVoiceUrl] = useState<string | null>(
    voiceoverUrl || null
  );
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  const fetchReplicatedVoices = async () => {
    try {
      const data = await apiFetch<any>("/api/replicated-voices", undefined, { silent: true });
      if (data && data.success && Array.isArray(data.voices)) {
        setReplicatedVoices(data.voices);
      }
    } catch (err) {
      console.error("Failed to load replicated voices:", err);
    }
  };

  useEffect(() => {
    fetchReplicatedVoices();
  }, []);

  // Editable voiceover script state
  const [narrationText, setNarrationText] = useState<string>(
    storyboard.narrationScript ||
      buildNaturalNarrationText(
        productName,
        price,
        storyboard.scenes || [],
        storyboard.cta
      )
  );

  // Sync when prop updates
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
    const updated: StoryboardPlan = {
      ...data,
      styleDNA: newDna,
      theme: {
        ...data.theme,
        primaryColor: newDna.primaryColor,
        accentColor: newDna.accentColor,
        bgColor: newDna.bgColor,
        styleName: `Paper Collage (${newDna.pack})`,
      },
    };
    setData(updated);
    onUpdateStoryboard(updated);
  };

  const copyToClipboard = (text: string, index: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 3000);
  };

  return (
    <div className="bg-white border border-stone-200/90 rounded-2xl p-6 shadow-sm space-y-6 relative">
      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b border-stone-200/80">
        <div>
          <span className="text-xs font-bold text-amber-800 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-full uppercase tracking-wider">
            Step 2: AI Script & Voiceover
          </span>
          <h2 className="text-xl font-extrabold text-stone-900 mt-1.5 flex items-center gap-2">
            <span>✨ แผนสตอรี่บอร์ดและสคริปต์วิดีโอ (15 วินาที)</span>
          </h2>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onRegenerate}
            disabled={isRegenerating}
            className="text-xs bg-stone-100 hover:bg-stone-200 text-stone-700 hover:text-stone-900 px-3.5 py-2 rounded-xl border border-stone-300 transition flex items-center gap-2 disabled:opacity-50 shadow-xs"
          >
            <RefreshCw
              className={`w-3.5 h-3.5 text-amber-600 ${
                isRegenerating ? "animate-spin" : ""
              }`}
            />
            <span>{isRegenerating ? "กำลังเจนใหม่..." : "ให้ Gemini เจนสคริปต์ใหม่"}</span>
          </button>
        </div>
      </div>

      {/* 🎲 Style DNA & Visual Pack Bar */}
      <div className="bg-indigo-50/50 border border-indigo-200/70 rounded-xl p-5 space-y-4 shadow-2xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-white border border-indigo-200 flex items-center justify-center shadow-2xs">
              <Palette className="w-4 h-4 text-indigo-600" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-stone-900 flex items-center gap-2">
                <span>สไตล์วิดีโอ (Style DNA & Visual Pack)</span>
                <span className="text-[10px] bg-indigo-100 text-indigo-700 border border-indigo-300 px-2 py-0.5 rounded-full font-semibold">
                  {PACK_INFO[data.styleDNA?.pack || "kraft-scrapbook"]?.name || "Kraft Scrapbook"}
                </span>
              </h3>
              <p className="text-xs text-stone-500 mt-0.5">
                {PACK_INFO[data.styleDNA?.pack || "kraft-scrapbook"]?.desc || "กระดาษคราฟต์ โพลารอยด์ เทปกาว โทนอุ่น"}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => handleRerollStyle()}
            className="text-xs font-bold bg-amber-400 hover:bg-amber-500 text-stone-950 border border-amber-500 px-4 py-2 rounded-xl transition flex items-center gap-2 shadow-xs active:scale-95"
            title="สุ่มชุดธีม ดีไซน์ สีสัน และแอนิเมชันใหม่โดยไม่ต้องพิมพ์เนื้อหาใหม่"
          >
            <span>🎲 สุ่มสไตล์ใหม่</span>
          </button>
        </div>

        {/* Style Chips */}
        <div className="flex items-center gap-2 flex-wrap pt-2 border-t border-indigo-200/60 text-xs">
          <span className="text-stone-500 text-[11px] font-semibold uppercase tracking-wider">Style Chips:</span>
          
          <div className="bg-white border border-stone-200 rounded-lg px-2.5 py-1 text-stone-700 flex items-center gap-1.5 font-medium shadow-2xs">
            <span>{PACK_INFO[data.styleDNA?.pack || "kraft-scrapbook"]?.emoji}</span>
            <span>แพ็ก: <strong className="text-stone-900">{PACK_INFO[data.styleDNA?.pack || "kraft-scrapbook"]?.name}</strong></span>
          </div>

          <div className="bg-white border border-stone-200 rounded-lg px-2.5 py-1 text-stone-700 flex items-center gap-1.5 font-medium shadow-2xs">
            <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ backgroundColor: data.styleDNA?.primaryColor || "#EE4D2D" }} />
            <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ backgroundColor: data.styleDNA?.accentColor || "#FFE14D" }} />
            <span>พาเลต: <strong className="text-stone-900">{data.styleDNA?.palette?.split("-")[1] || "adaptive"}</strong></span>
          </div>

          <div className="bg-white border border-stone-200 rounded-lg px-2.5 py-1 text-stone-700 flex items-center gap-1.5 font-medium shadow-2xs">
            <span>📐 โครงเรื่อง: <strong className="text-amber-700">{data.styleDNA?.structure || "listicle"}</strong></span>
          </div>

          <div className="bg-white border border-stone-200 rounded-lg px-2.5 py-1 text-stone-700 flex items-center gap-1.5 font-medium shadow-2xs">
            <span>🎣 Hook: <strong className="text-sky-700">{data.styleDNA?.hookFormula || "question"}</strong></span>
          </div>

          <div className="bg-white border border-stone-200 rounded-lg px-2.5 py-1 text-stone-700 flex items-center gap-1.5 font-medium shadow-2xs">
            <span>⏱️ จังหวะ: <strong className="text-emerald-700">{data.styleDNA?.tempo || "snappy"}</strong></span>
          </div>
        </div>

        {/* 8-Pack Quick Selector */}
        <div className="pt-1">
          <div className="text-[11px] text-stone-600 mb-2 font-medium">หรือคลิกเลือกแพ็กโดยตรง:</div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {ALL_PACK_IDS.map((pId) => {
              const pInfo = PACK_INFO[pId];
              const isSelected = (data.styleDNA?.pack || "kraft-scrapbook") === pId;
              return (
                <button
                  key={pId}
                  type="button"
                  onClick={() => handleRerollStyle(pId)}
                  className={`text-left p-2 rounded-lg border text-xs transition flex items-center gap-2 ${
                    isSelected
                      ? "bg-white border-2 border-indigo-500 text-indigo-950 shadow-xs ring-1 ring-indigo-500/30"
                      : "bg-white/80 border-stone-200 text-stone-700 hover:border-stone-300 hover:bg-white"
                  }`}
                >
                  <span className="text-base">{pInfo.emoji}</span>
                  <div className="truncate">
                    <div className="font-bold truncate">{pInfo.name}</div>
                    <div className="text-[10px] text-stone-500">{pInfo.tempo}</div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* 🎙️ Professional AI Voiceover (TTS) Generator Bar */}
      <div className="bg-orange-50/50 border border-orange-200/70 rounded-xl p-5 space-y-4 shadow-2xs">
        {/* Header Title */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-white border border-orange-200 flex items-center justify-center shadow-2xs">
              <Mic className="w-4 h-4 text-orange-600" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-stone-900 flex items-center gap-2">
                <span>บทพากย์เสียง AI (Voiceover & TTS)</span>
                <span className="text-[10px] bg-emerald-100 text-emerald-800 border border-emerald-300 px-2 py-0.5 rounded-full font-semibold">
                  ภาษาไทยธรรมชาติ
                </span>
              </h3>
              <p className="text-xs text-stone-500 mt-0.5">
                เลือกได้ระหว่างเสียงฟรี (ปรับสปีดได้) หรือ Gemini 3.8 Flash TTS
              </p>
            </div>
          </div>

          {/* Action Trigger Button */}
          <button
            type="button"
            onClick={handleGenerateVoice}
            disabled={isGeneratingVoice}
            className="shopee-gradient-btn text-white text-xs font-bold px-4 py-2 rounded-lg flex items-center justify-center gap-1.5 shadow-sm transition disabled:opacity-50 active:scale-95 shrink-0"
          >
            {isGeneratingVoice ? (
              <>
                <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>กำลังอัดเสียง...</span>
              </>
            ) : (
              <>
                <Volume2 className="w-3.5 h-3.5" />
                <span>{currentVoiceUrl ? "อัดเสียงใหม่" : "บันทึกเสียงพากย์"}</span>
              </>
            )}
          </button>
        </div>

        {/* 🎛️ Engine Switch: Free vs Gemini 3.8 */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 bg-stone-100/90 p-1 rounded-xl border border-stone-200">
          <button
            type="button"
            onClick={() => setTtsEngine("free")}
            className={`py-2 px-3 rounded-lg text-xs font-bold transition flex items-center justify-center gap-2 ${
              ttsEngine === "free"
                ? "bg-white text-stone-900 shadow-2xs border border-stone-300/80 ring-1 ring-amber-500/30"
                : "text-stone-600 hover:text-stone-900 hover:bg-white/50"
            }`}
          >
            <Zap className={`w-3.5 h-3.5 ${ttsEngine === "free" ? "text-amber-500" : "text-stone-400"}`} />
            <span>⚡ ของฟรี (Edge-TTS)</span>
            <span className="text-[10px] bg-stone-200/80 text-stone-700 px-1.5 py-0.5 rounded font-normal">
              ปรับเร่ง/ช้าได้
            </span>
          </button>

          <button
            type="button"
            onClick={() => setTtsEngine("gemini")}
            className={`py-2 px-3 rounded-lg text-xs font-bold transition flex items-center justify-center gap-2 ${
              ttsEngine === "gemini"
                ? "bg-white text-stone-900 shadow-2xs border border-stone-300/80 ring-1 ring-orange-500/30"
                : "text-stone-600 hover:text-stone-900 hover:bg-white/50"
            }`}
          >
            <Sparkles className={`w-3.5 h-3.5 ${ttsEngine === "gemini" ? "text-orange-500" : "text-stone-400"}`} />
            <span>✨ Gemini 3.8 Flash TTS</span>
            <span className="text-[10px] bg-orange-100 text-orange-800 border border-orange-300 px-1.5 py-0.5 rounded font-semibold">
              AI พรีเมียม
            </span>
          </button>
        </div>

        {/* Engine-specific settings */}
        {ttsEngine === "free" ? (
          <div className="bg-white/90 border border-amber-200/80 rounded-xl p-3.5 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              {/* Voice Actor Selector */}
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-stone-700 whitespace-nowrap">ผู้พากย์:</span>
                <select
                  value={voiceType}
                  onChange={(e) => setVoiceType(e.target.value as any)}
                  className="bg-white border border-stone-300 text-xs text-stone-800 rounded-lg px-2.5 py-1.5 shadow-2xs focus:outline-none focus:border-amber-500 font-medium"
                >
                  <option value="female">👩 พรีมวดี (ผู้หญิง - สดใส/ป้ายยา)</option>
                  <option value="male">👨 นิวัฒน์ (ผู้ชาย - เป็นมิตร/น่าเชื่อถือ)</option>
                </select>
              </div>

              {/* Speed Buttons */}
              <div className="flex items-center gap-1 flex-wrap">
                <div className="flex items-center gap-1 text-xs font-bold text-stone-700 mr-1">
                  <Gauge className="w-3.5 h-3.5 text-amber-600" />
                  <span>สปีดเสียง:</span>
                </div>
                {[
                  { label: "0.85x ช้า", rate: "-15%", desc: "แนะนำสำหรับคนฟังไม่ทัน! ชัดถ้อยชัดคำ" },
                  { label: "0.9x ฟังสบาย", rate: "-10%", desc: "ช้าลงเล็กน้อย ฟังสบาย" },
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
                      className={`text-xs px-2.5 py-1 rounded-lg border font-medium transition active:scale-95 ${
                        active
                          ? "bg-amber-400 text-stone-950 border-amber-500 font-bold shadow-2xs ring-1 ring-amber-400/50"
                          : "bg-stone-50 text-stone-700 border-stone-300 hover:bg-white hover:text-stone-900"
                      }`}
                    >
                      {s.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Helpful Helper note for user */}
            <div className="text-[11px] text-stone-600 bg-amber-50/70 border border-amber-200/60 rounded-lg px-2.5 py-1.5 flex items-center gap-1.5">
              <span className="text-amber-700 font-bold">💡 ปรับสปีด:</span>
              <span>
                หากเสียงพูดเร็วไปจนฟังไม่ทัน ให้เลือก <strong className="text-amber-800">0.85x ช้า</strong> หรือ <strong className="text-amber-800">0.9x ฟังสบาย</strong> เพื่อให้อ่านช้าลงและชัดเจนขึ้น
              </span>
            </div>
          </div>
        ) : (
          <div className="bg-white/90 border border-orange-200/80 rounded-xl p-3.5 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              {/* Gemini Voice Selector */}
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-bold text-stone-700 whitespace-nowrap">โมเดลเสียง Gemini:</span>
                <select
                  value={geminiVoice}
                  onChange={(e) => setGeminiVoice(e.target.value)}
                  className="bg-white border border-stone-300 text-xs text-stone-800 rounded-lg px-2.5 py-1.5 shadow-2xs focus:outline-none focus:border-orange-500 font-medium"
                >
                  {replicatedVoices.length > 0 && (
                    <optgroup label="🌟 เสียงโคลนของฉัน (Replicated)">
                      {replicatedVoices.map((v) => (
                        <option key={v.id} value={v.id}>
                          👤 {v.displayName}
                        </option>
                      ))}
                    </optgroup>
                  )}
                  <optgroup label="🎙️ เสียงมาตรฐาน Gemini (Prebuilt)">
                    <option value="Puck">🎙️ Puck (สดใส มีเอเนอร์จี้ ชวนช้อป)</option>
                    <option value="Kore">🎙️ Kore (มั่นใจ สุภาพ พรีเมียม)</option>
                    <option value="Aoede">🎙️ Aoede (ฟังสบาย เป็นกันเอง)</option>
                    <option value="Charon">🎙️ Charon (สุขุม น่าเชื่อถือ)</option>
                    <option value="Fenrir">🎙️ Fenrir (ตื่นเต้น เร้าใจ)</option>
                  </optgroup>
                </select>

                <button
                  type="button"
                  onClick={() => setIsCloningModalOpen(true)}
                  className="btn btn-primary btn-xs rounded-lg gap-1.5 font-medium shadow-2xs"
                >
                  <Mic className="w-3.5 h-3.5" />
                  โคลนเสียงของฉัน
                </button>
              </div>

              <div className="text-[11px] text-stone-500">
                โมเดล: <strong className="text-stone-800">gemini-3.8-flash-tts</strong>
              </div>
            </div>

            <div className="text-[11px] text-stone-600 bg-sky-50/70 border border-sky-200/60 rounded-lg px-2.5 py-1.5 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-sky-600 shrink-0" />
              <span>
                ระบบเชื่อมต่อ <strong>Gemini 3.8 Flash TTS</strong> โดยตรง (หากโควตา API ไม่เพียงพอ ระบบจะสลับไปใช้เสียงฟรีให้อัตโนมัติทันที)
              </span>
            </div>
          </div>
        )}

        {/* 🎙️ Voice Style Presets Picker */}
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

        {/* Fallback Notice Alert */}
        {fallbackNotice && (
          <div className="text-xs text-amber-900 bg-amber-50 border border-amber-300 rounded-xl p-2.5 flex items-center gap-2">
            <Info className="w-4 h-4 text-amber-600 shrink-0" />
            <span>{fallbackNotice}</span>
          </div>
        )}

        {/* 📝 Editable Narration Text Box */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs">
            <label className="text-stone-800 font-bold flex items-center gap-1.5">
              <span>ข้อความที่ AI จะพูด (คุณสามารถแก้ไขคำพูดได้อิสระ):</span>
            </label>
            <button
              type="button"
              onClick={handleResetNarration}
              className="text-[11px] text-orange-600 hover:text-orange-700 font-medium flex items-center gap-1"
            >
              <Wand2 className="w-3 h-3" />
              <span>เรียบเรียงบทพากย์ใหม่อัตโนมัติ</span>
            </button>
          </div>

          <textarea
            value={narrationText}
            onChange={(e) => handleNarrationChange(e.target.value)}
            rows={3}
            className="w-full bg-white border border-stone-300 rounded-xl p-3 text-xs text-stone-900 leading-relaxed focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500/20 resize-none font-sans shadow-2xs"
            placeholder="พิมพ์หรือปรับแต่งข้อความที่ต้องการให้เสียง AI พูดในวิดีโอ..."
          />
          <div className="text-[11px] text-stone-500 flex items-center justify-between">
            <span>ความยาวประมาณ 12 - 15 วินาทีเมื่ออ่านด้วยสปีดปกติ</span>
            <span>{narrationText.length} ตัวอักษร</span>
          </div>
        </div>

        {/* Audio Player if generated */}
        {currentVoiceUrl && (
          <div className="pt-2 border-t border-orange-200/80 flex items-center gap-3">
            <span className="text-xs text-emerald-700 font-bold flex items-center gap-1 whitespace-nowrap">
              <Check className="w-3.5 h-3.5" />
              <span>ฟังเสียงพากย์:</span>
            </span>
            <audio controls src={currentVoiceUrl} className="h-8 flex-1" />
          </div>
        )}
      </div>

      {/* 1. Hook Scene Editor (0-3s) */}
      <div className="bg-rose-50/40 border border-rose-200/80 rounded-xl p-4 space-y-3 shadow-2xs">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse" />
            <h3 className="text-sm font-bold text-red-600 uppercase tracking-wide">
              ช่วงที่ 1: Hook เปิดคลิป (0 - 3 วินาที)
            </h3>
          </div>
          <span className="text-xs text-stone-600 bg-white px-2 py-0.5 rounded border border-rose-200 shadow-2xs">
            {data.hook.durationSec} วินาที
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="md:col-span-1">
            <label className="block text-xs font-semibold text-stone-700 mb-1">
              สติกเกอร์ Badge
            </label>
            <input
              type="text"
              value={data.hook.badgeText || ""}
              onChange={(e) => updateHook("badgeText", e.target.value)}
              className="w-full bg-white border border-stone-300 rounded-lg px-3 py-2 text-sm text-amber-800 font-bold focus:outline-none focus:border-orange-500 shadow-2xs"
            />
          </div>
          <div className="md:col-span-2">
            <label className="block text-xs font-semibold text-stone-700 mb-1">
              Headline ข้อความเปิดคลิป (Hook ชวนหยุดดู)
            </label>
            <input
              type="text"
              value={data.hook.headline}
              onChange={(e) => updateHook("headline", e.target.value)}
              className="w-full bg-white border border-stone-300 rounded-lg px-3 py-2 text-sm text-stone-900 font-bold focus:outline-none focus:border-orange-500 shadow-2xs"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-stone-700 mb-1">
            คำบรรยายรอง (Subheadline)
          </label>
          <input
            type="text"
            value={data.hook.subheadline || ""}
            onChange={(e) => updateHook("subheadline", e.target.value)}
            className="w-full bg-white border border-stone-300 rounded-lg px-3 py-1.5 text-xs text-stone-800 focus:outline-none focus:border-orange-500 shadow-2xs"
          />
        </div>
      </div>

      {/* 2. Body Scenes Editor (3-12s) */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-orange-700 uppercase tracking-wide flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-orange-500" />
            <span>ช่วงที่ 2: Body นำเสนอจุดเด่นสินค้า (3 - 12 วินาที)</span>
          </h3>
          <span className="text-xs text-stone-500 font-medium">
            {data.scenes.length} จุดเด่น
          </span>
        </div>

        <div className="space-y-2.5">
          {data.scenes.map((scene, idx) => (
            <div
              key={idx}
              className="bg-stone-50/80 border border-stone-200 rounded-xl p-3.5 space-y-2.5 shadow-2xs"
            >
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-stone-800 flex items-center gap-1.5">
                  <span className="w-5 h-5 rounded-md bg-orange-100 border border-orange-300 text-orange-700 flex items-center justify-center font-mono">
                    {idx + 1}
                  </span>
                  <span>จุดเด่นที่ {idx + 1}</span>
                </span>
                <span className="text-stone-600 bg-white px-2 py-0.5 rounded border border-stone-200 shadow-2xs">
                  {scene.durationSec} วินาที | ภาพรูปที่ #{scene.imageIndex + 1}
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
                <div className="md:col-span-1">
                  <input
                    type="text"
                    value={scene.stickerText || ""}
                    onChange={(e) => updateScene(idx, "stickerText", e.target.value)}
                    placeholder="สติกเกอร์ เช่น ✨ เย็นเจี๊ยบ"
                    className="w-full bg-white border border-stone-300 rounded-lg px-2.5 py-1.5 text-xs text-amber-800 font-bold focus:outline-none focus:border-orange-500 shadow-2xs"
                  />
                </div>
                <div className="md:col-span-2">
                  <input
                    type="text"
                    value={scene.highlightTitle}
                    onChange={(e) => updateScene(idx, "highlightTitle", e.target.value)}
                    placeholder="หัวข้อจุดเด่น"
                    className="w-full bg-white border border-stone-300 rounded-lg px-2.5 py-1.5 text-xs text-stone-900 font-bold focus:outline-none focus:border-orange-500 shadow-2xs"
                  />
                </div>
              </div>

              <input
                type="text"
                value={scene.highlightDesc}
                onChange={(e) => updateScene(idx, "highlightDesc", e.target.value)}
                placeholder="คำอธิบายสั้นๆ (สรรพคุณ/ประโยชน์ ไม่ต้องใส่ราคาซ้ำ)"
                className="w-full bg-white border border-stone-300 rounded-lg px-2.5 py-1.5 text-xs text-stone-700 focus:outline-none focus:border-orange-500 shadow-2xs"
              />
            </div>
          ))}
        </div>
      </div>

      {/* 3. CTA Scene Editor (12-15s) */}
      <div className="bg-emerald-50/40 border border-emerald-200/80 rounded-xl p-4 space-y-3 shadow-2xs">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
            <h3 className="text-sm font-bold text-emerald-700 uppercase tracking-wide">
              ช่วงที่ 3: CTA ปิดท้าย ชวนกดซื้อ (12 - 15 วินาที)
            </h3>
          </div>
          <span className="text-xs text-stone-600 bg-white px-2 py-0.5 rounded border border-emerald-200 shadow-2xs">
            {data.cta.durationSec} วินาที
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1">
              ข้อความปิดท้าย (CTA Headline)
            </label>
            <input
              type="text"
              value={data.cta.ctaTitle}
              onChange={(e) => updateCta("ctaTitle", e.target.value)}
              className="w-full bg-white border border-stone-300 rounded-lg px-3 py-2 text-sm text-stone-900 font-bold focus:outline-none focus:border-orange-500 shadow-2xs"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1">
              คำกระตุ้นสิทธิพิเศษ (Sub-incentive)
            </label>
            <input
              type="text"
              value={data.cta.ctaSubtitle || ""}
              onChange={(e) => updateCta("ctaSubtitle", e.target.value)}
              className="w-full bg-white border border-stone-300 rounded-lg px-3 py-2 text-sm text-stone-700 focus:outline-none focus:border-orange-500 shadow-2xs"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-stone-700 mb-1">
            ชี้เป้าตะกร้าส้ม (Basket Note)
          </label>
          <input
            type="text"
            value={data.cta.basketNote || ""}
            onChange={(e) => updateCta("basketNote", e.target.value)}
            className="w-full bg-white border border-stone-300 rounded-lg px-3 py-1.5 text-xs text-amber-800 font-semibold focus:outline-none focus:border-orange-500 shadow-2xs"
          />
        </div>
      </div>

      {/* 4. 📋 READY-TO-COPY POST CAPTIONS & HASHTAGS */}
      <div className="bg-stone-50 border border-stone-200 rounded-xl p-5 space-y-4 shadow-2xs">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-stone-900 flex items-center gap-2">
              <span>📋 แคปชั่นและแฮชแท็กพร้อมโพสต์ (Post Captions & Hashtags)</span>
            </h3>
            <p className="text-xs text-stone-500 mt-0.5">
              กดปุ่มก็อปปี้เพื่อนำไปวางในช่องแคปชั่นตอนโพสต์คลิปบน Shopee Video / TikTok ได้ทันที
            </p>
          </div>
        </div>

        <div className="space-y-3">
          {captions.map((cap, i) => (
            <div
              key={i}
              className="bg-white border border-stone-200 rounded-xl p-4 space-y-2.5 shadow-2xs"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-orange-600">
                  {cap.styleName}
                </span>
                <button
                  type="button"
                  onClick={() => copyToClipboard(cap.fullPost, i)}
                  className={`text-xs px-3 py-1.5 rounded-lg font-bold flex items-center gap-1.5 transition ${
                    copiedIndex === i
                      ? "bg-emerald-600 text-white shadow-xs"
                      : "bg-stone-100 hover:bg-stone-200 text-stone-700 hover:text-stone-900 border border-stone-300 shadow-2xs"
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

              <div className="text-xs text-stone-800 whitespace-pre-line leading-relaxed bg-stone-50 p-3 rounded-lg border border-stone-200 font-mono shadow-inner">
                {cap.fullPost}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Gemini 3.8 Voice Replication Modal */}
      <VoiceCloningModal
        isOpen={isCloningModalOpen}
        onClose={() => setIsCloningModalOpen(false)}
        onVoiceSelected={(voiceId, voiceName) => {
          setGeminiVoice(voiceId);
          fetchReplicatedVoices();
        }}
      />
    </div>
  );
};
