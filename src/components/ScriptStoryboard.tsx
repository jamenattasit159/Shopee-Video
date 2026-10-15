"use client";

import {
  Check,
  Copy,
  Dices,
  Edit3,
  FileText,
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
  onRegenerate: (provider?: "claude" | "gemini") => Promise<void>;
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
    <div className="bg-base-100 border border-base-300 rounded-2xl p-6 shadow-xs space-y-6 relative">
      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b border-base-300">
        <div>
          <span className="text-xs font-bold text-primary bg-primary/10 border border-primary/20 px-2.5 py-1 rounded-full uppercase tracking-wider">
            Step 2: AI Script & Voiceover
          </span>
          <h2 className="text-xl font-bold text-base-content mt-1.5 flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            <span>แผนสตอรี่บอร์ดและสคริปต์วิดีโอ (15 วินาที)</span>
          </h2>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={() => onRegenerate("claude")}
            disabled={isRegenerating}
            className="btn btn-outline btn-primary btn-xs rounded-xl gap-1.5 font-semibold"
            title="ใช้ AI บทสร้างสรรค์สร้างประโยคเปิดคลิปและบทใหม่"
          >
            <Sparkles
              className={`w-3.5 h-3.5 ${
                isRegenerating ? "animate-spin" : ""
              }`}
            />
            <span>{isRegenerating ? "กำลังประมวลผล..." : "เขียนบทใหม่แบบสร้างสรรค์"}</span>
          </button>

          <button
            type="button"
            onClick={() => onRegenerate("gemini")}
            disabled={isRegenerating}
            className="btn btn-ghost btn-xs text-base-content/70 hover:text-base-content rounded-xl border border-base-300 gap-1.5 font-medium"
            title="ใช้ AI บทรวดเร็วสร้างบทใหม่"
          >
            <RefreshCw
              className={`w-3.5 h-3.5 ${
                isRegenerating ? "animate-spin" : ""
              }`}
            />
            <span>สร้างบทแบบรวดเร็ว</span>
          </button>
        </div>
      </div>

      {/* Style DNA & Visual Pack Bar */}
      <div className="bg-base-200/50 border border-base-300 rounded-2xl p-5 space-y-4 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center shadow-xs">
              <Palette className="w-4 h-4 text-primary" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-base-content flex items-center gap-2">
                <span>สไตล์วิดีโอ (Style DNA & Visual Pack)</span>
                <span className="badge badge-primary badge-outline badge-xs py-2 px-2.5 font-medium">
                  {PACK_INFO[data.styleDNA?.pack || "kraft-scrapbook"]?.name || "Kraft Scrapbook"}
                </span>
              </h3>
              <p className="text-xs text-base-content/60 mt-0.5">
                {PACK_INFO[data.styleDNA?.pack || "kraft-scrapbook"]?.desc || "กระดาษคราฟต์ โพลารอยด์ เทปกาว โทนอุ่น"}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => handleRerollStyle()}
            className="btn btn-primary btn-xs rounded-xl gap-1.5 shadow-xs"
            title="สุ่มชุดธีม ดีไซน์ สีสัน และแอนิเมชันใหม่โดยไม่ต้องพิมพ์เนื้อหาใหม่"
          >
            <Dices className="w-3.5 h-3.5" />
            <span>สุ่มสไตล์ใหม่</span>
          </button>
        </div>

        {/* Style Chips */}
        <div className="flex items-center gap-2 flex-wrap pt-2 border-t border-base-300 text-xs">
          <span className="text-base-content/50 text-[11px] font-semibold uppercase tracking-wider">Style Chips:</span>
          
          <div className="bg-base-100 border border-base-300 rounded-lg px-2.5 py-1 text-base-content flex items-center gap-1.5 font-medium shadow-xs">
            <span>แพ็ก: <strong className="text-base-content font-semibold">{PACK_INFO[data.styleDNA?.pack || "kraft-scrapbook"]?.name}</strong></span>
          </div>

          <div className="bg-base-100 border border-base-300 rounded-lg px-2.5 py-1 text-base-content flex items-center gap-1.5 font-medium shadow-xs">
            <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ backgroundColor: data.styleDNA?.primaryColor || "#EE4D2D" }} />
            <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ backgroundColor: data.styleDNA?.accentColor || "#FFE14D" }} />
            <span>พาเลต: <strong className="text-base-content font-semibold">{data.styleDNA?.palette?.split("-")[1] || "adaptive"}</strong></span>
          </div>

          <div className="bg-base-100 border border-base-300 rounded-lg px-2.5 py-1 text-base-content flex items-center gap-1.5 font-medium shadow-xs">
            <span>โครงเรื่อง: <strong className="text-primary font-semibold">{data.styleDNA?.structure || "listicle"}</strong></span>
          </div>

          <div className="bg-base-100 border border-base-300 rounded-lg px-2.5 py-1 text-base-content flex items-center gap-1.5 font-medium shadow-xs">
            <span>Hook: <strong className="text-secondary font-semibold">{data.styleDNA?.hookFormula || "question"}</strong></span>
          </div>

          <div className="bg-base-100 border border-base-300 rounded-lg px-2.5 py-1 text-base-content flex items-center gap-1.5 font-medium shadow-xs">
            <span>จังหวะ: <strong className="text-success font-semibold">{data.styleDNA?.tempo || "snappy"}</strong></span>
          </div>
        </div>

        {/* 8-Pack Quick Selector */}
        <div className="pt-1">
          <div className="text-[11px] text-base-content/60 mb-2 font-medium">หรือคลิกเลือกแพ็กโดยตรง:</div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {ALL_PACK_IDS.map((pId) => {
              const pInfo = PACK_INFO[pId];
              const isSelected = (data.styleDNA?.pack || "kraft-scrapbook") === pId;
              return (
                <button
                  key={pId}
                  type="button"
                  onClick={() => handleRerollStyle(pId)}
                  className={`text-left p-2.5 rounded-xl border text-xs transition flex items-center gap-2 ${
                    isSelected
                      ? "bg-primary/5 border-2 border-primary text-base-content shadow-xs ring-1 ring-primary/30"
                      : "bg-base-100 border-base-300 text-base-content/80 hover:border-base-content/30"
                  }`}
                >
                  <div className="truncate">
                    <div className="font-bold truncate text-base-content">{pInfo.name}</div>
                    <div className="text-[10px] text-base-content/60">{pInfo.tempo}</div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Professional AI Voiceover (TTS) Generator Bar */}
      <div className="bg-base-200/50 border border-base-300 rounded-2xl p-5 space-y-4 shadow-xs">
        {/* Header Title */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center shadow-xs">
              <Mic className="w-4 h-4 text-primary" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-base-content flex items-center gap-2">
                <span>บทพากย์เสียง AI (Voiceover & TTS)</span>
                <span className="badge badge-success badge-outline badge-xs py-2 px-2.5 font-medium">
                  ภาษาไทยธรรมชาติ
                </span>
              </h3>
              <p className="text-xs text-base-content/60 mt-0.5">
                เลือกได้ระหว่างเสียงฟรี (ปรับสปีดได้) หรือเสียง AI ขั้นสูง
              </p>
            </div>
          </div>

          {/* Action Trigger Button */}
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
                <span>{currentVoiceUrl ? "อัดเสียงใหม่" : "บันทึกเสียงพากย์"}</span>
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
            <span>เสียงมาตรฐานฟรี</span>
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
            <span>เสียง AI ขั้นสูง</span>
          </button>
        </div>

        {/* Engine-specific settings */}
        {ttsEngine === "free" ? (
          <div className="bg-base-100 border border-base-300 rounded-xl p-3.5 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              {/* Voice Actor Selector */}
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

              {/* Speed Buttons */}
              <div className="flex items-center gap-1 flex-wrap">
                <div className="flex items-center gap-1 text-xs font-bold text-base-content mr-1">
                  <Gauge className="w-3.5 h-3.5 text-primary" />
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

            {/* Helpful Helper note for user */}
            <div className="alert alert-info py-2 px-3 text-xs rounded-xl flex items-center gap-2">
              <span className="font-bold">ปรับสปีด:</span>
              <span>
                หากเสียงพูดเร็วไปจนฟังไม่ทัน ให้เลือก <strong>0.85x ช้า</strong> หรือ <strong>0.9x ฟังสบาย</strong> เพื่อให้อ่านช้าลงและชัดเจนขึ้น
              </span>
            </div>
          </div>
        ) : (
          <div className="bg-base-100 border border-base-300 rounded-xl p-3.5 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              {/* Gemini Voice Selector */}
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
                          {v.displayName}
                        </option>
                      ))}
                    </optgroup>
                  )}
                  <optgroup label="เสียงมาตรฐาน">
                    <option value="Puck">Puck (สดใส มีเอเนอร์จี้ ชวนช้อป)</option>
                    <option value="Kore">Kore (มั่นใจ สุภาพ พรีเมียม)</option>
                    <option value="Aoede">Aoede (ฟังสบาย เป็นกันเอง)</option>
                    <option value="Charon">Charon (สุขุม น่าเชื่อถือ)</option>
                    <option value="Fenrir">Fenrir (ตื่นเต้น เร้าใจ)</option>
                  </optgroup>
                </select>

                <button
                  type="button"
                  onClick={() => setIsCloningModalOpen(true)}
                  className="btn btn-primary btn-xs rounded-lg gap-1.5 font-medium shadow-xs"
                >
                  <Mic className="w-3.5 h-3.5" />
                  โคลนเสียงของฉัน
                </button>
              </div>

              <div className="text-[11px] text-base-content/60">
                ระบบเสียง: <strong className="text-base-content">เสียง AI ขั้นสูง</strong>
              </div>
            </div>

            <div className="alert alert-info py-2 px-3 text-xs rounded-xl flex items-center gap-2">
              <Sparkles className="w-3.5 h-3.5 shrink-0 text-info-content" />
              <span>
                ใช้ระบบ <strong>เสียง AI ขั้นสูง</strong> (หากโควตาไม่เพียงพอ ระบบจะสลับไปใช้เสียงฟรีให้อัตโนมัติทันที)
              </span>
            </div>
          </div>
        )}

        {/* Voice Style Presets Picker */}
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

        {/* Editable Narration Text Box */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs">
            <label className="text-base-content font-semibold flex items-center gap-1.5">
              <span>ข้อความที่ AI จะพูด (คุณสามารถแก้ไขคำพูดได้อิสระ):</span>
            </label>
            <button
              type="button"
              onClick={handleResetNarration}
              className="btn btn-ghost btn-xs text-primary hover:underline gap-1"
            >
              <Wand2 className="w-3 h-3" />
              <span>เรียบเรียงบทพากย์ใหม่อัตโนมัติ</span>
            </button>
          </div>

          <textarea
            value={narrationText}
            onChange={(e) => handleNarrationChange(e.target.value)}
            rows={3}
            className="textarea textarea-bordered w-full bg-base-100 border-base-300 rounded-xl p-3 text-xs text-base-content focus:border-primary resize-none font-sans shadow-xs"
            placeholder="พิมพ์หรือปรับแต่งข้อความที่ต้องการให้เสียง AI พูดในวิดีโอ..."
          />
          <div className="text-[11px] text-base-content/60 flex items-center justify-between">
            <span>ความยาวประมาณ 12 - 15 วินาทีเมื่ออ่านด้วยสปีดปกติ</span>
            <span>{narrationText.length} ตัวอักษร</span>
          </div>
        </div>

        {/* Audio Player if generated */}
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

        <div>
          <label className="block text-xs font-semibold text-base-content/80 mb-1">
            คำบรรยายรอง (Subheadline)
          </label>
          <input
            type="text"
            value={data.hook.subheadline || ""}
            onChange={(e) => updateHook("subheadline", e.target.value)}
            className="input input-bordered w-full rounded-xl bg-base-100 text-base-content border-base-300 focus:border-primary text-xs shadow-xs"
          />
        </div>
      </div>

      {/* 2. Body Scenes Editor (3-12s) */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-primary uppercase tracking-wide flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-primary" />
            <span>ช่วงที่ 2: Body นำเสนอจุดเด่นสินค้า (3 - 12 วินาที)</span>
          </h3>
          <span className="text-xs text-base-content/60 font-medium">
            {data.scenes.length} จุดเด่น
          </span>
        </div>

        <div className="space-y-2.5">
          {data.scenes.map((scene, idx) => (
            <div
              key={idx}
              className="bg-base-100 border border-base-300 rounded-2xl p-4 space-y-3 shadow-xs"
            >
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-base-content flex items-center gap-2">
                  <span className="w-5 h-5 rounded-lg bg-primary/10 border border-primary/20 text-primary flex items-center justify-center font-mono font-bold text-xs">
                    {idx + 1}
                  </span>
                  <span>จุดเด่นที่ {idx + 1}</span>
                </span>
                <span className="text-base-content/70 bg-base-200/60 px-2.5 py-0.5 rounded-lg border border-base-300 shadow-xs font-mono">
                  {scene.durationSec} วินาที | ภาพรูปที่ #{scene.imageIndex + 1}
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
                <div className="md:col-span-1">
                  <input
                    type="text"
                    value={scene.stickerText || ""}
                    onChange={(e) => updateScene(idx, "stickerText", e.target.value)}
                    placeholder="สติกเกอร์ เช่น ร้อนจัด/เย็นนาน"
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

              <input
                type="text"
                value={scene.highlightDesc}
                onChange={(e) => updateScene(idx, "highlightDesc", e.target.value)}
                placeholder="คำอธิบายสั้นๆ (สรรพคุณ/ประโยชน์ ไม่ต้องใส่ราคาซ้ำ)"
                className="input input-bordered w-full rounded-xl bg-base-100 text-base-content border-base-300 focus:border-primary text-xs shadow-xs"
              />
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
              ช่วงที่ 3: CTA ปิดท้าย ชวนกดซื้อ (12 - 15 วินาที)
            </h3>
          </div>
          <span className="text-xs text-base-content/70 bg-base-100 px-2.5 py-0.5 rounded-lg border border-base-300 shadow-xs font-mono">
            {data.cta.durationSec} วินาที
          </span>
        </div>

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
                <span className="text-xs font-bold text-primary">
                  {cap.styleName}
                </span>
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
