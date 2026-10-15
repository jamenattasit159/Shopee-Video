"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  Sparkles,
  Volume2,
  Play,
  Square,
  Sliders,
  Star,
  Check,
  RotateCcw,
  BookOpen,
  Info,
  ShieldCheck,
  CheckCircle2,
  Wand2,
} from "lucide-react";
import {
  VOICE_PRESETS,
  VoicePreset,
  VoiceIntensity,
  getRecommendedPresetForCategory,
} from "@/lib/voicePresets";
import { apiFetch } from "@/lib/apiFetch";
import { VoiceLine } from "../../remotion/types";

interface VoiceStylePickerProps {
  category?: string;
  hookText: string;
  selectedPresetId: string;
  onSelectPreset: (presetId: string) => void;
  intensity: VoiceIntensity;
  onChangeIntensity: (intensity: VoiceIntensity) => void;
  polish: boolean;
  onTogglePolish: (polish: boolean) => void;
  aiDisclaimer: boolean;
  onToggleAiDisclaimer: (enabled: boolean) => void;
  geminiVoice: string;
  ttsEngine: "free" | "gemini";
  voiceLines?: VoiceLine[];
  onVoiceLinesUpdated?: (lines: VoiceLine[]) => void;
}

export const VoiceStylePicker: React.FC<VoiceStylePickerProps> = ({
  category,
  hookText,
  selectedPresetId,
  onSelectPreset,
  intensity,
  onChangeIntensity,
  polish,
  onTogglePolish,
  aiDisclaimer,
  onToggleAiDisclaimer,
  geminiVoice,
  ttsEngine,
  voiceLines,
  onVoiceLinesUpdated,
}) => {
  // Audio playback state
  const [isPlayingPreview, setIsPlayingPreview] = useState(false);
  const [previewAudioUrl, setPreviewAudioUrl] = useState<string | null>(null);
  const [rawAudioUrl, setRawAudioUrl] = useState<string | null>(null);
  const [isPlayingRaw, setIsPlayingRaw] = useState(false);
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);

  // Compare 3 presets state
  const [isComparing, setIsComparing] = useState(false);
  const [compareSamples, setCompareSamples] = useState<
    { presetId: string; nameTh: string; url: string }[]
  >([]);
  const [playingCompareId, setPlayingCompareId] = useState<string | null>(null);

  // Pronunciation map editor state
  const [unverifiedWords, setUnverifiedWords] = useState<string[]>([]);
  const [pronunciationMap, setPronunciationMap] = useState<Record<string, string>>({});
  const [editingWord, setEditingWord] = useState<string>("");
  const [wordPhonetic, setWordPhonetic] = useState<string>("");
  const [isSavingPronunciation, setIsSavingPronunciation] = useState(false);
  const [pronunciationSaved, setPronunciationSaved] = useState(false);

  // Feedback rating
  const [rating, setRating] = useState<number>(0);
  const [ratingSubmitted, setRatingSubmitted] = useState<boolean>(false);
  const [feedbackAdvice, setFeedbackAdvice] = useState<string | null>(null);

  // Audio ref
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Load pronunciation map on mount
  useEffect(() => {
    apiFetch<any>("/api/pronunciation-map", undefined, { silent: true })
      .then((res) => {
        if (res && res.map) {
          setPronunciationMap(res.map);
        }
      })
      .catch(() => {});
  }, []);

  // Stop audio when component unmounts
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  const playAudio = (url: string, onEnd?: () => void) => {
    if (audioRef.current) {
      audioRef.current.pause();
    }
    const audio = new Audio(url);
    audioRef.current = audio;
    audio.onended = () => {
      if (onEnd) onEnd();
    };
    audio.play().catch((err) => {
      console.warn("Audio play failed:", err);
      if (onEnd) onEnd();
    });
  };

  const stopAudio = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    setIsPlayingPreview(false);
    setIsPlayingRaw(false);
    setPlayingCompareId(null);
  };

  // Preview Hook Audio
  const handlePreviewHook = async () => {
    if (isPlayingPreview) {
      stopAudio();
      return;
    }

    setIsLoadingPreview(true);
    try {
      const payload = {
        presetId: selectedPresetId,
        intensity,
        polish,
        previewOnly: true,
        ttsEngine,
        geminiVoice,
        lines: [
          {
            id: "preview_hook",
            text: hookText || "ทุกคนนน เจอของเด็ดอีกแล้ว ไอเทมตัวดังในตำนาน!",
            role: "hook",
          },
        ],
      };

      const res = await apiFetch<any>("/api/synthesize-voice", {
        method: "POST",
        body: JSON.stringify(payload),
      });

      if (res && res.files && res.files[0]) {
        const file = res.files[0];
        setPreviewAudioUrl(file.url);
        setRawAudioUrl(file.rawUrl || file.url);

        // Check for unverified words from warnings
        if (res.warnings) {
          const uvWarning = res.warnings.find(
            (w: any) => w.code === "PRONUNCIATION_UNVERIFIED"
          );
          if (uvWarning && uvWarning.messageTh) {
            const match = uvWarning.messageTh.split(": ")[1];
            if (match) {
              setUnverifiedWords(match.split(", ").map((s: string) => s.trim()));
            }
          }
        }

        setIsPlayingPreview(true);
        playAudio(file.url, () => setIsPlayingPreview(false));
      }
    } catch (err) {
      console.error("Preview hook failed:", err);
    } finally {
      setIsLoadingPreview(false);
    }
  };

  // Compare 3 presets
  const handleCompareThreeStyles = async () => {
    if (isComparing) return;
    setIsComparing(true);
    setCompareSamples([]);

    const samplePresets = [
      VOICE_PRESETS.find((p) => p.id === "vendor-live") || VOICE_PRESETS[0],
      VOICE_PRESETS.find((p) => p.id === "friendly-trust") || VOICE_PRESETS[2],
      VOICE_PRESETS.find((p) => p.id === "calm-reviewer") || VOICE_PRESETS[4],
    ];

    try {
      const sampleText = hookText || "ทุกคนนน เจอของเด็ดอีกแล้ว ตัวนี้คือดีงามมาก!";
      const results: { presetId: string; nameTh: string; url: string }[] = [];

      for (const preset of samplePresets) {
        const res = await apiFetch<any>("/api/synthesize-voice", {
          method: "POST",
          body: JSON.stringify({
            presetId: preset.id,
            intensity,
            polish,
            previewOnly: true,
            ttsEngine,
            geminiVoice,
            lines: [{ id: `cmp_${preset.id}`, text: sampleText }],
          }),
        });
        if (res && res.files && res.files[0]) {
          results.push({
            presetId: preset.id,
            nameTh: preset.nameTh,
            url: res.files[0].url,
          });
        }
      }

      setCompareSamples(results);
      if (results.length > 0) {
        // Play first one
        setPlayingCompareId(results[0].presetId);
        playAudio(results[0].url, () => setPlayingCompareId(null));
      }
    } catch (err) {
      console.error("Comparison synthesis failed:", err);
    } finally {
      setIsComparing(false);
    }
  };

  // Save word pronunciation
  const handleSavePronunciation = async () => {
    if (!editingWord.trim() || !wordPhonetic.trim()) return;
    setIsSavingPronunciation(true);
    try {
      const updated = { [editingWord.trim()]: wordPhonetic.trim() };
      const res = await apiFetch<any>("/api/pronunciation-map", {
        method: "POST",
        body: JSON.stringify({ map: updated }),
      });
      if (res && res.map) {
        setPronunciationMap(res.map);
        setPronunciationSaved(true);
        setUnverifiedWords((prev) => prev.filter((w) => w.toLowerCase() !== editingWord.toLowerCase()));
        setEditingWord("");
        setWordPhonetic("");
        setTimeout(() => setPronunciationSaved(false), 3000);
      }
    } catch (err) {
      console.error("Failed to save pronunciation:", err);
    } finally {
      setIsSavingPronunciation(false);
    }
  };

  // Submit feedback
  const handleSubmitFeedback = async (score: number) => {
    setRating(score);
    try {
      await apiFetch<any>("/api/voice-feedback", {
        method: "POST",
        body: JSON.stringify({
          presetId: selectedPresetId,
          intensity,
          rating: score,
        }),
      });
      setRatingSubmitted(true);
      if (score <= 2) {
        setFeedbackAdvice("ระบบแนะนำให้ปรับระดับสไตล์เป็น 'เบา' เพื่อรักษาเอกลักษณ์เสียงพูดเดิมให้เป็นธรรมชาติที่สุด");
      } else {
        setFeedbackAdvice(null);
      }
    } catch (err) {
      console.error("Failed to save feedback:", err);
    }
  };

  const recommendedPreset = getRecommendedPresetForCategory(category);

  return (
    <div className="card bg-base-100 border border-base-300/70 rounded-2xl p-4 sm:p-5 shadow-xs space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-base-200 pb-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-base-content flex items-center gap-2">
              สไตล์เสียงพ่อค้า (Voice Style Presets)
              <span className="badge badge-primary badge-xs py-2 px-2.5 font-normal">
                คงเสียงโคลน + เติมพลังขาย
              </span>
            </h3>
            <p className="text-xs text-base-content/70">
              สั่งสไตล์และจังหวะการพูดโดยคงเสียงของผู้ใช้เป็นตัวตนหลัก 100%
            </p>
          </div>
        </div>

        {/* Category recommendation pill */}
        <div className="flex items-center gap-1.5 self-start sm:self-auto">
          <span className="text-[11px] text-base-content/60">แนะนำสำหรับหมวดนี้:</span>
          <button
            type="button"
            onClick={() => onSelectPreset(recommendedPreset.id)}
            className="badge badge-outline badge-sm gap-1 hover:badge-primary transition cursor-pointer"
          >
            <Check className="w-3 h-3 text-primary" />
            {recommendedPreset.nameTh}
          </button>
        </div>
      </div>

      {/* 1. Presets Selection Grid */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-xs font-semibold text-base-content uppercase tracking-wider">
            เลือกสไตล์เสียงพากย์ (6 สไตล์)
          </label>
          <button
            type="button"
            onClick={() => {
              const randomIndex = Math.floor(Math.random() * VOICE_PRESETS.length);
              onSelectPreset(VOICE_PRESETS[randomIndex].id);
            }}
            className="btn btn-ghost btn-xs gap-1 text-primary hover:bg-primary/10"
          >
            <RotateCcw className="w-3 h-3" />
            สุ่มสไตล์
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
          {VOICE_PRESETS.map((p) => {
            const isSelected = selectedPresetId === p.id;
            const isBestMatch = recommendedPreset.id === p.id;

            return (
              <div
                key={p.id}
                onClick={() => onSelectPreset(p.id)}
                className={`cursor-pointer rounded-xl p-3 border transition-all text-left relative flex flex-col justify-between ${
                  isSelected
                    ? "bg-primary/5 border-primary ring-1 ring-primary/40 shadow-xs"
                    : "bg-base-200/40 hover:bg-base-200/70 border-base-300"
                }`}
              >
                <div>
                  <div className="flex items-center justify-between gap-1.5 mb-1">
                    <span className="font-semibold text-sm text-base-content flex items-center gap-1.5">
                      {p.nameTh}
                    </span>
                    {isBestMatch && (
                      <span className="badge badge-xs badge-secondary">
                        ตรงหมวด
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-base-content/70 line-clamp-2 leading-relaxed">
                    {p.descriptionTh}
                  </p>
                </div>

                <div className="mt-2.5 pt-2 border-t border-base-200 flex items-center justify-between text-[11px] text-base-content/50">
                  <span>เร่งสปีด: {p.polish.atempo}x</span>
                  <span>ความดัง: {p.polish.targetLufs} LUFS</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 2. Intensity Slider & Controls */}
      <div className="bg-base-200/50 rounded-xl p-3.5 space-y-3.5 border border-base-300/50">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="space-y-0.5">
            <div className="flex items-center gap-2">
              <Sliders className="w-4 h-4 text-primary" />
              <span className="text-xs font-semibold text-base-content">
                ระดับความแรงของสไตล์ (Intensity)
              </span>
            </div>
            <p className="text-[11px] text-base-content/60">
              ควบคุมระดับการเน้นพลังงานและอารมณ์ในน้ำเสียง
            </p>
          </div>

          {/* 3-level Buttons */}
          <div className="join border border-base-300 bg-base-100 rounded-lg p-0.5">
            {[
              { id: "low", label: "เบา (เป็นธรรมชาติ)" },
              { id: "mid", label: "กลาง (มาตรฐาน)" },
              { id: "high", label: "จัดเต็ม (พลังงานสูง)" },
            ].map((lvl) => (
              <button
                key={lvl.id}
                type="button"
                onClick={() => onChangeIntensity(lvl.id as VoiceIntensity)}
                className={`join-item btn btn-xs ${
                  intensity === lvl.id
                    ? "btn-primary font-semibold"
                    : "btn-ghost text-base-content/70"
                }`}
              >
                {lvl.label}
              </button>
            ))}
          </div>
        </div>

        {/* Audio Polish & AI Disclaimer Toggles */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-base-300/50">
          {/* Polish Toggle */}
          <div className="flex items-center justify-between bg-base-100 rounded-lg p-2.5 border border-base-300">
            <div className="flex items-center gap-2">
              <Wand2 className="w-4 h-4 text-secondary" />
              <div>
                <span className="text-xs font-semibold text-base-content block">
                  ขัดเสียงอัตโนมัติ (Gentle Polish)
                </span>
                <span className="text-[10px] text-base-content/60">
                  ปรับความดัง −14 LUFS + ตัดเสียงซี่
                </span>
              </div>
            </div>
            <input
              type="checkbox"
              checked={polish}
              onChange={(e) => onTogglePolish(e.target.checked)}
              className="toggle toggle-primary toggle-sm"
            />
          </div>

          {/* AI Voice Disclaimer Toggle */}
          <div className="flex items-center justify-between bg-base-100 rounded-lg p-2.5 border border-base-300">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-info" />
              <div>
                <span className="text-xs font-semibold text-base-content block">
                  ป้ายกำกับเสียง AI (Disclaimer)
                </span>
                <span className="text-[10px] text-base-content/60">
                  ระบุในแคปชั่นตามข้อกำหนดแพลตฟอร์ม
                </span>
              </div>
            </div>
            <input
              type="checkbox"
              checked={aiDisclaimer}
              onChange={(e) => onToggleAiDisclaimer(e.target.checked)}
              className="toggle toggle-info toggle-sm"
            />
          </div>
        </div>
      </div>

      {/* 3. Action Buttons: Hook Preview & Compare 3 Styles */}
      <div className="flex flex-wrap items-center gap-2.5">
        <button
          type="button"
          onClick={handlePreviewHook}
          disabled={isLoadingPreview}
          className="btn btn-primary btn-sm gap-2"
        >
          {isLoadingPreview ? (
            <span className="loading loading-spinner loading-xs" />
          ) : isPlayingPreview ? (
            <Square className="w-3.5 h-3.5 fill-current" />
          ) : (
            <Play className="w-3.5 h-3.5 fill-current" />
          )}
          <span>{isPlayingPreview ? "หยุดฟัง" : "ลองฟังประโยค Hook"}</span>
        </button>

        <button
          type="button"
          onClick={handleCompareThreeStyles}
          disabled={isComparing}
          className="btn btn-outline btn-sm gap-2"
        >
          {isComparing ? (
            <span className="loading loading-spinner loading-xs" />
          ) : (
            <Volume2 className="w-3.5 h-3.5" />
          )}
          <span>เทียบ 3 สไตล์พร้อมกัน</span>
        </button>

        {rawAudioUrl && previewAudioUrl && polish && (
          <button
            type="button"
            onClick={() => {
              if (isPlayingRaw) {
                stopAudio();
              } else {
                setIsPlayingRaw(true);
                playAudio(rawAudioUrl, () => setIsPlayingRaw(false));
              }
            }}
            className="btn btn-ghost btn-sm text-xs gap-1.5"
          >
            {isPlayingRaw ? <Square className="w-3 h-3" /> : <Play className="w-3 h-3" />}
            <span>ฟังเสียงดิบก่อนขัด (A/B Test)</span>
          </button>
        )}
      </div>

      {/* Comparison Drawer / Player if samples ready */}
      {compareSamples.length > 0 && (
        <div className="bg-base-200/70 border border-base-300 rounded-xl p-3 space-y-2">
          <span className="text-xs font-semibold text-base-content flex items-center gap-1.5">
            <Volume2 className="w-3.5 h-3.5 text-primary" />
            ผลการเทียบ 3 สไตล์ (กดเพื่อฟังตัวอย่าง):
          </span>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            {compareSamples.map((sample) => (
              <button
                key={sample.presetId}
                type="button"
                onClick={() => {
                  if (playingCompareId === sample.presetId) {
                    stopAudio();
                  } else {
                    setPlayingCompareId(sample.presetId);
                    playAudio(sample.url, () => setPlayingCompareId(null));
                  }
                }}
                className={`btn btn-sm justify-between ${
                  playingCompareId === sample.presetId
                    ? "btn-primary"
                    : "btn-outline border-base-300 bg-base-100"
                }`}
              >
                <span>{sample.nameTh}</span>
                {playingCompareId === sample.presetId ? (
                  <Square className="w-3.5 h-3.5 fill-current" />
                ) : (
                  <Play className="w-3.5 h-3.5 fill-current" />
                )}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* 4. Pronunciation Map Editor if unverified words found */}
      {unverifiedWords.length > 0 && (
        <div className="alert alert-warning py-3 rounded-xl border border-warning/40 shadow-xs flex flex-col items-start gap-2.5">
          <div className="flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-warning-content shrink-0" />
            <span className="text-xs font-semibold text-warning-content">
              พบคำภาษาอังกฤษที่ควรตรวจการออกเสียง:
            </span>
          </div>
          <div className="flex flex-wrap gap-1.5 w-full">
            {unverifiedWords.map((word) => (
              <button
                key={word}
                type="button"
                onClick={() => {
                  setEditingWord(word);
                  setWordPhonetic(pronunciationMap[word] || "");
                }}
                className="badge badge-outline badge-sm cursor-pointer hover:badge-warning gap-1"
              >
                {word}
                {pronunciationMap[word] && ` (${pronunciationMap[word]})`}
              </button>
            ))}
          </div>

          {editingWord && (
            <div className="flex items-center gap-2 w-full mt-1">
              <span className="text-xs font-medium text-warning-content whitespace-nowrap">
                คำอ่านไทยของ {editingWord}:
              </span>
              <input
                type="text"
                value={wordPhonetic}
                onChange={(e) => setWordPhonetic(e.target.value)}
                placeholder="เช่น โดโดเลิฟ, ช้อปปี้"
                className="input input-xs input-bordered w-full max-w-xs"
              />
              <button
                type="button"
                onClick={handleSavePronunciation}
                disabled={isSavingPronunciation}
                className="btn btn-xs btn-neutral"
              >
                {isSavingPronunciation ? "กำลังบันทึก..." : "บันทึกคำอ่าน"}
              </button>
            </div>
          )}

          {pronunciationSaved && (
            <span className="text-xs text-success flex items-center gap-1 font-medium">
              <CheckCircle2 className="w-3.5 h-3.5" />
              บันทึกคำอ่านลงพจนานุกรมเรียบร้อยแล้ว
            </span>
          )}
        </div>
      )}

      {/* 5. User Feedback Rating: "ยังเป็นเสียงฉันไหม" */}
      <div className="pt-2 border-t border-base-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="space-y-0.5">
          <span className="text-xs font-medium text-base-content/80 flex items-center gap-1.5">
            <Star className="w-3.5 h-3.5 text-warning fill-warning" />
            ให้คะแนนความเหมือน: "ยังเป็นเสียงฉันไหม" (1–5 ดาว)
          </span>
          {feedbackAdvice && (
            <p className="text-[11px] text-warning font-medium flex items-center gap-1">
              <Info className="w-3 h-3 shrink-0" />
              <span>{feedbackAdvice}</span>
            </p>
          )}
        </div>

        <div className="flex items-center gap-1">
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              type="button"
              onClick={() => handleSubmitFeedback(star)}
              className="p-1 hover:scale-110 transition"
              title={`${star} ดาว`}
            >
              <Star
                className={`w-4 h-4 ${
                  rating >= star
                    ? "text-warning fill-warning"
                    : "text-base-300 hover:text-warning"
                }`}
              />
            </button>
          ))}
          {ratingSubmitted && (
            <span className="text-[11px] text-success ml-2 font-medium">
              ขอบคุณสำหรับคะแนน!
            </span>
          )}
        </div>
      </div>
    </div>
  );
};
