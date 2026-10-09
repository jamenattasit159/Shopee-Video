"use client";

import {
  AlertCircle,
  Check,
  Copy,
  MessageSquareText,
  RefreshCw,
  Scissors,
  Sparkles,
} from "lucide-react";
import React, { useEffect, useState } from "react";
import {
  CaptionPackage,
  countChars,
  countWords,
  enforceWordLimit,
  generatePostCaptions,
} from "../lib/captions";

interface ShopeeCaptionBoxProps {
  productName: string;
  price: string;
  highlights: string;
  ctaText?: string;
  originalUrl?: string;
  category?: string;
}

export const ShopeeCaptionBox: React.FC<ShopeeCaptionBoxProps> = ({
  productName,
  price,
  highlights,
  ctaText,
  originalUrl,
  category,
}) => {
  const [seed, setSeed] = useState<number>(Date.now());
  const [captions, setCaptions] = useState<CaptionPackage[]>([]);
  const [editedTexts, setEditedTexts] = useState<Record<string, string>>({});
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<string>("all");

  // Generate initial captions
  useEffect(() => {
    const fresh = generatePostCaptions(
      productName,
      price,
      highlights,
      ctaText,
      originalUrl,
      { category, seed }
    );
    setCaptions(fresh);
    // Initialize edited texts
    const initialMap: Record<string, string> = {};
    fresh.forEach((c) => {
      initialMap[c.id] = c.fullPost;
    });
    setEditedTexts(initialMap);
  }, [productName, price, highlights, ctaText, originalUrl, category, seed]);

  // Handle Reroll: randomize templates without calling AI
  const handleReroll = () => {
    setSeed(Date.now() + Math.floor(Math.random() * 10000));
    setAiError(null);
  };

  // Handle Gemini AI generation
  const handleGenerateAi = async () => {
    setIsAiLoading(true);
    setAiError(null);
    try {
      const res = await fetch("/api/generate-captions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productName,
          price,
          highlights,
          category,
        }),
      });
      const data = await res.json();
      if (data.success && Array.isArray(data.captions) && data.captions.length > 0) {
        setCaptions(data.captions);
        const map: Record<string, string> = {};
        data.captions.forEach((c: CaptionPackage) => {
          map[c.id] = c.fullPost;
        });
        setEditedTexts(map);
      } else {
        throw new Error(data.error || "ไม่สามารถสร้างแคปชั่น AI ได้");
      }
    } catch (err: any) {
      console.error(err);
      setAiError(err.message || "เกิดข้อผิดพลาดในการเรียก AI");
    } finally {
      setIsAiLoading(false);
    }
  };

  // Handle text modification in editable textarea
  const handleTextChange = (id: string, text: string) => {
    setEditedTexts((prev) => ({ ...prev, [id]: text }));
  };

  // Auto trim text if it exceeds 100 words
  const handleAutoTrim = (id: string) => {
    const currentText = editedTexts[id] || "";
    const trimmed = enforceWordLimit(currentText, 90);
    handleTextChange(id, trimmed);
  };

  // Copy to clipboard
  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2500);
  };

  return (
    <div className="bg-base-100 border border-base-300 rounded-2xl p-5 sm:p-6 space-y-4 shadow-sm">
      {/* Header and Control Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-base-200">
        <div>
          <div className="flex items-center gap-2">
            <MessageSquareText className="w-5 h-5 text-primary" />
            <h3 className="font-bold text-sm sm:text-base text-base-content">
              แคปชั่นพร้อมโพสต์ (Shopee Video & TikTok)
            </h3>
            <span className="badge badge-success badge-sm font-semibold">
              Shopee 100 คำ Safe
            </span>
          </div>
          <p className="text-xs text-base-content/70 mt-1">
            แคปชั่นปรับแต่งพิเศษไม่เกิน 100 คำตามกฎ Shopee Video พร้อมแฮชแท็กเฉพาะสินค้า
          </p>
        </div>

        {/* Action Buttons: Reroll & AI Generate */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={handleReroll}
            disabled={isAiLoading}
            className="btn btn-sm btn-outline border-base-300 hover:bg-base-200 gap-1.5 font-medium text-xs text-base-content"
            title="สุ่มสำนวนและประโยคใหม่แบบไม่จำเจ"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>สุ่มสำนวนใหม่</span>
          </button>

          <button
            type="button"
            onClick={handleGenerateAi}
            disabled={isAiLoading}
            className="btn btn-sm btn-primary gap-1.5 font-medium text-xs"
            title="ให้ Gemini 2.5 Flash คิดแคปชั่นใหม่สดๆ ไม่ซ้ำใคร"
          >
            {isAiLoading ? (
              <>
                <span className="loading loading-spinner loading-xs" />
                <span>กำลังคิดแคปชั่น...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-3.5 h-3.5" />
                <span>ให้ AI คิดแคปชั่นใหม่</span>
              </>
            )}
          </button>
        </div>
      </div>

      {aiError && (
        <div className="alert alert-warning text-xs py-2 px-3 flex items-center gap-2 rounded-xl">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{aiError} (สลับมาใช้แคปชั่นแบบ Dynamic Smart Engine แทน)</span>
        </div>
      )}

      {/* Caption Cards Grid */}
      <div className="grid grid-cols-1 gap-3.5">
        {captions.map((cap) => {
          const currentText = editedTexts[cap.id] ?? cap.fullPost;
          const wordCount = countWords(currentText);
          const charCount = countChars(currentText);
          const isOverLimit = wordCount > 100;
          const isWarning = wordCount >= 85 && wordCount <= 100;

          return (
            <div
              key={cap.id}
              className="bg-base-200/50 border border-base-300/80 rounded-xl p-4 transition-all hover:border-base-300 space-y-2.5 shadow-2xs"
            >
              {/* Card Title & Word Count Badge */}
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-xs sm:text-sm text-base-content">
                    {cap.styleName}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  {/* Word Counter Badge */}
                  <span
                    className={`badge badge-sm font-mono font-bold transition-colors ${
                      isOverLimit
                        ? "badge-error text-error-content animate-pulse"
                        : isWarning
                        ? "badge-warning text-warning-content"
                        : "badge-ghost text-base-content/80 border-base-300"
                    }`}
                  >
                    {wordCount}/100 คำ ({charCount} ตัวอักษร)
                  </span>

                  {isOverLimit && (
                    <button
                      type="button"
                      onClick={() => handleAutoTrim(cap.id)}
                      className="btn btn-xs btn-outline btn-error gap-1 text-[11px]"
                      title="ตัดคำส่วนเกินออกให้พอดี 100 คำของ Shopee"
                    >
                      <Scissors className="w-3 h-3" />
                      <span>ตัดให้พอดี 100 คำ</span>
                    </button>
                  )}

                  {/* Copy Button */}
                  <button
                    type="button"
                    onClick={() => handleCopy(cap.id, currentText)}
                    className={`btn btn-xs gap-1.5 transition ${
                      copiedId === cap.id
                        ? "btn-success text-white"
                        : "btn-primary text-white"
                    }`}
                  >
                    {copiedId === cap.id ? (
                      <>
                        <Check className="w-3.5 h-3.5" />
                        <span>คัดลอกแล้ว!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>คัดลอก</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Description */}
              <p className="text-[11px] text-base-content/60">
                {cap.styleDescription}
              </p>

              {/* Editable Text Box */}
              <div className="relative">
                <textarea
                  value={currentText}
                  onChange={(e) => handleTextChange(cap.id, e.target.value)}
                  rows={4}
                  className="w-full bg-base-100 border border-base-300 rounded-lg p-2.5 text-xs text-base-content font-sans focus:outline-none focus:border-primary resize-y leading-relaxed shadow-inner"
                  placeholder="แก้ไขข้อความแคปชั่นได้ที่นี่..."
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
