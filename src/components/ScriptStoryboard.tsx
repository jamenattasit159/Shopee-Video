"use client";

import {
  Check,
  Copy,
  Edit3,
  Mic,
  Music,
  Palette,
  Play,
  RefreshCw,
  Sparkles,
  Volume2,
  Wand2,
} from "lucide-react";
import React, { useState } from "react";
import { StoryboardPlan } from "../../remotion/types";
import { CaptionPackage, generatePostCaptions } from "../lib/captions";
import { buildNaturalNarrationText } from "../lib/gemini";

interface ScriptStoryboardProps {
  productName: string;
  price: string;
  highlights: string;
  storyboard: StoryboardPlan;
  onUpdateStoryboard: (updated: StoryboardPlan) => void;
  onRegenerate: () => Promise<void>;
  isRegenerating: boolean;
  voiceoverUrl?: string;
  onVoiceoverGenerated?: (url: string) => void;
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
  const [voiceType, setVoiceType] = useState<"female" | "male">("female");
  const [isGeneratingVoice, setIsGeneratingVoice] = useState(false);
  const [currentVoiceUrl, setCurrentVoiceUrl] = useState<string | null>(
    voiceoverUrl || null
  );
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

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
    try {
      const res = await fetch("/api/synthesize-voice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productName,
          price,
          customText: narrationText,
          voiceType,
        }),
      });
      const resData = await res.json();
      if (resData.success && resData.audioUrl) {
        setCurrentVoiceUrl(resData.audioUrl);
        if (onVoiceoverGenerated) {
          onVoiceoverGenerated(resData.audioUrl);
        }
      } else {
        alert("ไม่สามารถสร้างเสียงพากย์ได้: " + (resData.error || ""));
      }
    } catch (err: any) {
      console.error(err);
      alert("เกิดข้อผิดพลาดในการสร้างเสียงพากย์: " + err.message);
    } finally {
      setIsGeneratingVoice(false);
    }
  };

  const captions = generatePostCaptions(productName, price, highlights, data.cta.ctaTitle);

  const copyToClipboard = (text: string, index: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 3000);
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b border-slate-800">
        <div>
          <span className="text-xs font-bold text-amber-400 bg-amber-950/60 border border-amber-800/60 px-2.5 py-1 rounded-full uppercase tracking-wider">
            Step 2: AI Script & Voiceover
          </span>
          <h2 className="text-xl font-bold text-white mt-1.5 flex items-center gap-2">
            <span>✨ แผนสตอรี่บอร์ดและสคริปต์วิดีโอ (15 วินาที)</span>
          </h2>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onRegenerate}
            disabled={isRegenerating}
            className="text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white px-3.5 py-2 rounded-xl border border-slate-700 transition flex items-center gap-2 disabled:opacity-50"
          >
            <RefreshCw
              className={`w-3.5 h-3.5 text-amber-400 ${
                isRegenerating ? "animate-spin" : ""
              }`}
            />
            <span>{isRegenerating ? "กำลังเจนใหม่..." : "ให้ Gemini เจนสคริปต์ใหม่"}</span>
          </button>
        </div>
      </div>

      {/* 🎙️ Professional AI Voiceover (TTS) Generator Bar */}
      <div className="bg-slate-950 border border-orange-900/60 rounded-xl p-5 space-y-4 shadow-lg">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-orange-950 border border-orange-700/60 flex items-center justify-center">
              <Mic className="w-4 h-4 text-orange-400" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <span>บทพากย์เสียง AI แบบมืออาชีพ (Natural Voiceover)</span>
                <span className="text-[10px] bg-emerald-950 text-emerald-400 border border-emerald-800 px-2 py-0.5 rounded-full font-semibold">
                  ภาษาไทยธรรมชาติ
                </span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                พูดลื่นไหลเหมือนครีเอเตอร์จริง ไม่พูดวน ไม่พูดคำว่าจุดเด่นซ้ำซาก
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <select
              value={voiceType}
              onChange={(e) => setVoiceType(e.target.value as any)}
              className="bg-slate-900 border border-slate-700 text-xs text-white rounded-lg px-3 py-2 focus:outline-none focus:border-orange-500"
            >
              <option value="female">👩 เสียงผู้หญิง (พรีมวดี - สดใส/ป้ายยา)</option>
              <option value="male">👨 เสียงผู้ชาย (นิวัฒน์ - เป็นมิตร/น่าเชื่อถือ)</option>
            </select>

            <button
              type="button"
              onClick={handleGenerateVoice}
              disabled={isGeneratingVoice}
              className="bg-orange-600 hover:bg-orange-500 text-white text-xs font-bold px-4 py-2 rounded-lg flex items-center gap-1.5 shadow transition disabled:opacity-50"
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
        </div>

        {/* 📝 Editable Narration Text Box */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs">
            <label className="text-slate-300 font-semibold flex items-center gap-1.5">
              <span>ข้อความที่ AI จะพูด (คุณสามารถแก้ไขคำพูดได้อิสระ):</span>
            </label>
            <button
              type="button"
              onClick={handleResetNarration}
              className="text-[11px] text-orange-400 hover:text-orange-300 flex items-center gap-1"
            >
              <Wand2 className="w-3 h-3" />
              <span>เรียบเรียงบทพากย์ใหม่อัตโนมัติ</span>
            </button>
          </div>

          <textarea
            value={narrationText}
            onChange={(e) => handleNarrationChange(e.target.value)}
            rows={3}
            className="w-full bg-slate-900 border border-slate-700/80 rounded-xl p-3 text-xs text-white leading-relaxed focus:outline-none focus:border-orange-500 resize-none font-sans"
            placeholder="พิมพ์หรือปรับแต่งข้อความที่ต้องการให้เสียง AI พูดในวิดีโอ..."
          />
          <div className="text-[11px] text-slate-500 flex items-center justify-between">
            <span>ความยาวประมาณ 12 - 15 วินาทีเมื่ออ่านด้วยสปีดปกติ</span>
            <span>{narrationText.length} ตัวอักษร</span>
          </div>
        </div>

        {/* Audio Player if generated */}
        {currentVoiceUrl && (
          <div className="pt-2 border-t border-slate-800/80 flex items-center gap-3">
            <span className="text-xs text-emerald-400 font-semibold flex items-center gap-1 whitespace-nowrap">
              <Check className="w-3.5 h-3.5" />
              <span>ฟังเสียงพากย์:</span>
            </span>
            <audio controls src={currentVoiceUrl} className="h-8 flex-1" />
          </div>
        )}
      </div>

      {/* 1. Hook Scene Editor (0-3s) */}
      <div className="bg-slate-950 border border-slate-800/80 rounded-xl p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse" />
            <h3 className="text-sm font-bold text-red-400 uppercase tracking-wide">
              ช่วงที่ 1: Hook เปิดคลิป (0 - 3 วินาที)
            </h3>
          </div>
          <span className="text-xs text-slate-400 bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
            {data.hook.durationSec} วินาที
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="md:col-span-1">
            <label className="block text-xs font-medium text-slate-400 mb-1">
              สติกเกอร์ Badge
            </label>
            <input
              type="text"
              value={data.hook.badgeText || ""}
              onChange={(e) => updateHook("badgeText", e.target.value)}
              className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-sm text-amber-300 font-bold focus:outline-none focus:border-orange-500"
            />
          </div>
          <div className="md:col-span-2">
            <label className="block text-xs font-medium text-slate-400 mb-1">
              Headline ข้อความเปิดคลิป (Hook ชวนหยุดดู)
            </label>
            <input
              type="text"
              value={data.hook.headline}
              onChange={(e) => updateHook("headline", e.target.value)}
              className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white font-bold focus:outline-none focus:border-orange-500"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-400 mb-1">
            คำบรรยายรอง (Subheadline)
          </label>
          <input
            type="text"
            value={data.hook.subheadline || ""}
            onChange={(e) => updateHook("subheadline", e.target.value)}
            className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-300 focus:outline-none focus:border-orange-500"
          />
        </div>
      </div>

      {/* 2. Body Scenes Editor (3-12s) */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-orange-400 uppercase tracking-wide flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-orange-500" />
            <span>ช่วงที่ 2: Body นำเสนอจุดเด่นสินค้า (3 - 12 วินาที)</span>
          </h3>
          <span className="text-xs text-slate-400">
            {data.scenes.length} จุดเด่น
          </span>
        </div>

        <div className="space-y-2.5">
          {data.scenes.map((scene, idx) => (
            <div
              key={idx}
              className="bg-slate-950 border border-slate-800/80 rounded-xl p-3.5 space-y-2.5"
            >
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-slate-300 flex items-center gap-1.5">
                  <span className="w-5 h-5 rounded-md bg-orange-950 border border-orange-800/80 text-orange-400 flex items-center justify-center font-mono">
                    {idx + 1}
                  </span>
                  <span>จุดเด่นที่ {idx + 1}</span>
                </span>
                <span className="text-slate-400 bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
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
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-amber-300 font-semibold focus:outline-none focus:border-orange-500"
                  />
                </div>
                <div className="md:col-span-2">
                  <input
                    type="text"
                    value={scene.highlightTitle}
                    onChange={(e) => updateScene(idx, "highlightTitle", e.target.value)}
                    placeholder="หัวข้อจุดเด่น"
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-white font-bold focus:outline-none focus:border-orange-500"
                  />
                </div>
              </div>

              <input
                type="text"
                value={scene.highlightDesc}
                onChange={(e) => updateScene(idx, "highlightDesc", e.target.value)}
                placeholder="คำอธิบายสั้นๆ (สรรพคุณ/ประโยชน์ ไม่ต้องใส่ราคาซ้ำ)"
                className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-300 focus:outline-none focus:border-orange-500"
              />
            </div>
          ))}
        </div>
      </div>

      {/* 3. CTA Scene Editor (12-15s) */}
      <div className="bg-slate-950 border border-slate-800/80 rounded-xl p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
            <h3 className="text-sm font-bold text-emerald-400 uppercase tracking-wide">
              ช่วงที่ 3: CTA ปิดท้าย ชวนกดซื้อ (12 - 15 วินาที)
            </h3>
          </div>
          <span className="text-xs text-slate-400 bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
            {data.cta.durationSec} วินาที
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">
              ข้อความปิดท้าย (CTA Headline)
            </label>
            <input
              type="text"
              value={data.cta.ctaTitle}
              onChange={(e) => updateCta("ctaTitle", e.target.value)}
              className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white font-bold focus:outline-none focus:border-orange-500"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">
              คำกระตุ้นสิทธิพิเศษ (Sub-incentive)
            </label>
            <input
              type="text"
              value={data.cta.ctaSubtitle || ""}
              onChange={(e) => updateCta("ctaSubtitle", e.target.value)}
              className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-300 focus:outline-none focus:border-orange-500"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-400 mb-1">
            ชี้เป้าตะกร้าส้ม (Basket Note)
          </label>
          <input
            type="text"
            value={data.cta.basketNote || ""}
            onChange={(e) => updateCta("basketNote", e.target.value)}
            className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-amber-300 font-semibold focus:outline-none focus:border-orange-500"
          />
        </div>
      </div>

      {/* 4. 📋 READY-TO-COPY POST CAPTIONS & HASHTAGS */}
      <div className="bg-slate-950 border border-slate-800 rounded-xl p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <span>📋 แคปชั่นและแฮชแท็กพร้อมโพสต์ (Post Captions & Hashtags)</span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              กดปุ่มก็อปปี้เพื่อนำไปวางในช่องแคปชั่นตอนโพสต์คลิปบน Shopee Video / TikTok ได้ทันที
            </p>
          </div>
        </div>

        <div className="space-y-3">
          {captions.map((cap, i) => (
            <div
              key={i}
              className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-2.5"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-orange-400">
                  {cap.styleName}
                </span>
                <button
                  type="button"
                  onClick={() => copyToClipboard(cap.fullPost, i)}
                  className={`text-xs px-3 py-1.5 rounded-lg font-bold flex items-center gap-1.5 transition ${
                    copiedIndex === i
                      ? "bg-emerald-600 text-white"
                      : "bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white"
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

              <div className="text-xs text-slate-300 whitespace-pre-line leading-relaxed bg-slate-950 p-3 rounded-lg border border-slate-800/60 font-mono">
                {cap.fullPost}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
