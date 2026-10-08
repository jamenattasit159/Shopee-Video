// src/components/LinkImport.tsx
"use client";

import {
  AlertCircle,
  CheckCircle2,
  ExternalLink,
  Layers,
  Link as LinkIcon,
  Loader2,
  PlusCircle,
  RefreshCw,
  Sparkles,
} from "lucide-react";
import React, { useEffect, useState } from "react";
import { ProductDraft } from "../lib/types";

interface LinkImportProps {
  onDraftLoaded: (draft: ProductDraft) => void;
  onLoadPreset: (preset: "tumbler" | "earbuds" | "skincare") => void;
  onSwitchToManual: () => void;
  isParentLoading: boolean;
}

export const LinkImport: React.FC<LinkImportProps> = ({
  onDraftLoaded,
  onLoadPreset,
  onSwitchToManual,
  isParentLoading,
}) => {
  const [mode, setMode] = useState<"single" | "batch">("single");
  const [singleInput, setSingleInput] = useState("");
  const [batchInput, setBatchInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState(0);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Batch queue results
  const [batchResults, setBatchResults] = useState<
    { url: string; success: boolean; draft?: ProductDraft; error?: string }[]
  >([]);

  // Stepped loading message simulation
  const loadingSteps = [
    "กำลังอ่านและตรวจสอบลิงก์ Shopee…",
    "กำลังดึงข้อมูลและราคาสินค้า…",
    "กำลังดาวน์โหลดและตรวจสอบคุณภาพรูปภาพ…",
    "กำลังวิเคราะห์โครงสร้างข้อมูลด้วย AI…",
  ];

  useEffect(() => {
    let timer: any;
    if (loading) {
      setLoadingStep(0);
      timer = setInterval(() => {
        setLoadingStep((prev) => (prev < loadingSteps.length - 1 ? prev + 1 : prev));
      }, 1200);
    }
    return () => clearInterval(timer);
  }, [loading]);

  const handleFetchSingle = async (e?: React.FormEvent, forceBypass = false) => {
    if (e) e.preventDefault();
    if (!singleInput.trim()) {
      setErrorMsg("กรุณาวางลิงก์หรือข้อความแชร์จาก Shopee ก่อนครับ");
      return;
    }

    setLoading(true);
    setErrorMsg(null);

    try {
      const res = await fetch("/api/import-link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          input: singleInput.trim(),
          bypassCache: forceBypass,
        }),
      });

      const data = await res.json();
      if (data.ok && data.draft) {
        onDraftLoaded(data.draft);
      } else {
        setErrorMsg(
          data.error?.message ||
            "ไม่สามารถดึงข้อมูลได้ กรุณาลองใหม่อีกครั้ง หรือเลือกกรอกข้อมูลเอง"
        );
      }
    } catch (err: any) {
      console.error("Link import error:", err);
      setErrorMsg("เกิดข้อผิดพลาดในการเชื่อมต่อ กรุณาลองใหม่อีกครั้ง");
    } finally {
      setLoading(false);
    }
  };

  const handleFetchBatch = async (e: React.FormEvent) => {
    e.preventDefault();
    const lines = batchInput
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean);

    if (lines.length === 0) {
      setErrorMsg("กรุณาวางอย่างน้อย 1 ลิงก์ในโหมดหลายรายการ");
      return;
    }

    if (lines.length > 10) {
      setErrorMsg("ระบบรองรับสูงสุด 10 ลิงก์ต่อครั้ง กรุณาลดจำนวนลิงก์ลงครับ");
      return;
    }

    setLoading(true);
    setErrorMsg(null);
    setBatchResults([]);

    try {
      const res = await fetch("/api/import-link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          inputs: lines,
        }),
      });

      const data = await res.json();
      if (data.ok && Array.isArray(data.batch)) {
        const mapped = data.batch.map((item: any, idx: number) => ({
          url: lines[idx],
          success: item.success,
          draft: item.draft,
          error: item.error,
        }));
        setBatchResults(mapped);

        // Auto-load first successful draft
        const firstSuccess = mapped.find((m: any) => m.success && m.draft);
        if (firstSuccess && firstSuccess.draft) {
          onDraftLoaded(firstSuccess.draft);
        }
      } else {
        setErrorMsg(data.error?.message || "เกิดข้อผิดพลาดในการดึงข้อมูลหลายรายการ");
      }
    } catch (err: any) {
      console.error("Batch import error:", err);
      setErrorMsg("เกิดข้อผิดพลาดในการเชื่อมต่อ กรุณาลองใหม่อีกครั้ง");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white border border-stone-200/90 rounded-2xl p-5 sm:p-6 shadow-sm space-y-4 mb-6 relative">
      {/* Washi Tape Strip Accent */}
      <div className="absolute -top-2.5 right-12 w-20 h-4 bg-amber-200/80 border-l border-r border-dashed border-amber-600/40 rotate-1 pointer-events-none shadow-xs rounded-xs z-10" />

      {/* Header & Mode Switch */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-stone-200/60">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-orange-50 text-orange-600 border border-orange-200 rounded-xl shadow-xs">
            <LinkIcon className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-base text-stone-900 flex items-center gap-2">
              <span>นำเข้าข้อมูลสินค้าผ่านลิงก์ Shopee</span>
              <span className="badge badge-primary badge-outline text-xs font-semibold">
                สะดวก & รวดเร็ว
              </span>
            </h3>
            <p className="text-xs text-stone-500">
              วางลิงก์หรือข้อความแชร์จากแอป Shopee ช่องเดียว ระบบจะดึงข้อมูลมาเติมให้อัตโนมัติ
            </p>
          </div>
        </div>

        {/* Toggle Mode Buttons */}
        <div className="join join-horizontal self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setMode("single")}
            className={`join-item btn btn-xs ${
              mode === "single" ? "btn-primary" : "btn-ghost text-base-content/70"
            }`}
          >
            ลิงก์เดี่ยว
          </button>
          <button
            type="button"
            onClick={() => setMode("batch")}
            className={`join-item btn btn-xs ${
              mode === "batch" ? "btn-primary" : "btn-ghost text-base-content/70"
            }`}
          >
            <Layers className="w-3.5 h-3.5 mr-1" />
            หลายรายการ (Batch)
          </button>
        </div>
      </div>

      {/* Error Alert */}
      {errorMsg && (
        <div className="alert alert-warning py-2.5 px-3 text-xs rounded-xl flex items-start gap-2 shadow-sm">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-warning-content" />
          <div className="flex-1 text-warning-content">
            <span className="font-medium">{errorMsg}</span>
          </div>
          <button
            type="button"
            onClick={() => setErrorMsg(null)}
            className="btn btn-ghost btn-xs btn-circle text-warning-content"
          >
            ✕
          </button>
        </div>
      )}

      {/* Single Mode Form */}
      {mode === "single" && (
        <form onSubmit={handleFetchSingle} className="space-y-3">
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1">
              <input
                type="text"
                value={singleInput}
                onChange={(e) => setSingleInput(e.target.value)}
                placeholder="วางลิงก์ Shopee เช่น https://s.shopee.co.th/... หรือข้อความแชร์เต็ม"
                disabled={loading || isParentLoading}
                className="input input-bordered w-full text-sm rounded-xl bg-base-100 placeholder:text-base-content/40 focus:outline-none focus:border-primary pr-10"
              />
              {singleInput && (
                <button
                  type="button"
                  onClick={() => setSingleInput("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-base-content/40 hover:text-base-content text-xs"
                >
                  ✕
                </button>
              )}
            </div>
            <button
              type="submit"
              disabled={loading || isParentLoading || !singleInput.trim()}
              className="btn btn-primary rounded-xl px-5 gap-1.5 shadow-sm text-sm"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>กำลังดึงข้อมูล…</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>ดึงข้อมูลสินค้า</span>
                </>
              )}
            </button>
          </div>

          {/* Stepped Loading Animation */}
          {loading && (
            <div className="bg-base-100 border border-base-300/60 rounded-xl p-3 text-xs space-y-2 animate-fadeIn">
              <div className="flex items-center justify-between text-base-content/80 font-medium">
                <span className="flex items-center gap-1.5 text-primary">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>{loadingSteps[loadingStep]}</span>
                </span>
                <span className="text-base-content/50">
                  ขั้นที่ {loadingStep + 1} จาก {loadingSteps.length}
                </span>
              </div>
              <progress
                className="progress progress-primary w-full h-1.5"
                value={(loadingStep + 1) * 25}
                max="100"
              ></progress>
            </div>
          )}
        </form>
      )}

      {/* Batch Mode Form */}
      {mode === "batch" && (
        <form onSubmit={handleFetchBatch} className="space-y-3">
          <div>
            <div className="flex justify-between items-center mb-1 text-xs text-base-content/70">
              <span>วางลิงก์ Shopee บรรทัดละ 1 ลิงก์ (สูงสุด 10 รายการ)</span>
              <span>
                {batchInput.split("\n").filter((l) => l.trim()).length} / 10 รายการ
              </span>
            </div>
            <textarea
              rows={4}
              value={batchInput}
              onChange={(e) => setBatchInput(e.target.value)}
              placeholder="https://s.shopee.co.th/abc1&#10;https://shopee.co.th/product/123/456&#10;[ยกลัง12] DODOLOVE https://shopee.co.th/..."
              disabled={loading || isParentLoading}
              className="textarea textarea-bordered w-full text-xs font-mono rounded-xl bg-base-100 placeholder:text-base-content/40 focus:outline-none focus:border-primary"
            />
          </div>

          <div className="flex items-center justify-between">
            <span className="text-xs text-base-content/60">
              ระบบจะประมวลผลพร้อมกันทีละ 2 รายการเพื่อความเสถียร
            </span>
            <button
              type="submit"
              disabled={loading || isParentLoading || !batchInput.trim()}
              className="btn btn-primary btn-sm rounded-xl px-4 gap-1.5 shadow-sm text-xs"
            >
              {loading ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>กำลังดึงข้อมูลชุด…</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>เริ่มดึงข้อมูลทั้งหมด</span>
                </>
              )}
            </button>
          </div>

          {/* Batch Queue Cards */}
          {batchResults.length > 0 && (
            <div className="mt-3 space-y-2 border-t border-base-300/60 pt-3">
              <div className="text-xs font-semibold text-base-content/80">
                ผลการนำเข้าคิว ({batchResults.filter((r) => r.success).length}/
                {batchResults.length} สำเร็จ):
              </div>
              <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1">
                {batchResults.map((item, idx) => (
                  <div
                    key={idx}
                    className={`flex items-center justify-between p-2.5 rounded-xl border text-xs transition ${
                      item.success
                        ? "bg-base-100 border-base-300 hover:border-primary/50"
                        : "bg-error/5 border-error/20 text-error"
                    }`}
                  >
                    <div className="flex items-center gap-2 truncate flex-1 mr-2">
                      {item.success ? (
                        <CheckCircle2 className="w-4 h-4 text-success shrink-0" />
                      ) : (
                        <AlertCircle className="w-4 h-4 text-error shrink-0" />
                      )}
                      <span className="truncate text-base-content font-medium">
                        {item.draft?.name?.value || item.url}
                      </span>
                    </div>

                    {item.success && item.draft ? (
                      <button
                        type="button"
                        onClick={() => onDraftLoaded(item.draft!)}
                        className="btn btn-xs btn-outline btn-primary rounded-lg shrink-0"
                      >
                        ตรวจรายการนี้
                      </button>
                    ) : (
                      <span className="text-[10px] text-error shrink-0">
                        {item.error || "ล้มเหลว"}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </form>
      )}

      {/* Alternative Shortcuts Footer */}
      <div className="flex flex-wrap items-center justify-between gap-2 pt-2 text-xs border-t border-base-300/40 text-base-content/70">
        <span className="flex items-center gap-1.5">
          <span>หรือเลือกใช้งานรูปแบบเดิม:</span>
        </span>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => onLoadPreset("tumbler")}
            className="hover:text-primary transition underline underline-offset-2 flex items-center gap-1"
          >
            <span>🥤 แก้วเก็บความเย็น</span>
          </button>
          <span>•</span>
          <button
            type="button"
            onClick={() => onLoadPreset("earbuds")}
            className="hover:text-primary transition underline underline-offset-2 flex items-center gap-1"
          >
            <span>🎧 หูฟังบลูทูธ</span>
          </button>
          <span>•</span>
          <button
            type="button"
            onClick={onSwitchToManual}
            className="hover:text-primary transition font-medium underline underline-offset-2"
          >
            ✏️ กรอกข้อมูลเองแบบละเอียด
          </button>
        </div>
      </div>
    </div>
  );
};
