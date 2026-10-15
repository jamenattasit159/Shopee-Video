"use client";

import React, { useEffect, useState } from "react";
import {
  AlertCircle,
  AlertTriangle,
  Check,
  CheckCircle2,
  Copy,
  Download,
  Info,
  Loader2,
  Sparkles,
  Trash2,
  Wand2,
  X,
  Filter,
} from "lucide-react";
import {
  clearHistory,
  getAiDiagnosisForError,
  getErrorState,
  setDrawerOpen,
  subscribeErrorStore,
  triggerAiAutoFix,
} from "@/lib/errorStore";
import { AppError } from "@/lib/errors";

export const ErrorCenterDrawer: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [history, setHistory] = useState<AppError[]>([]);
  const [severityFilter, setSeverityFilter] = useState<string>("all");
  const [sourceFilter, setSourceFilter] = useState<string>("all");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const [fixingId, setFixingId] = useState<string | null>(null);
  const [fixedMap, setFixedMap] = useState<Record<string, string>>({});

  useEffect(() => {
    setIsOpen(getErrorState().isDrawerOpen);
    setHistory(getErrorState().history);

    const unsubscribe = subscribeErrorStore(() => {
      setIsOpen(getErrorState().isDrawerOpen);
      setHistory([...getErrorState().history]);
    });
    return unsubscribe;
  }, []);

  const handleClose = () => {
    setDrawerOpen(false);
  };

  const handleAutoFixItem = async (err: AppError) => {
    setFixingId(err.id);
    try {
      const res = await triggerAiAutoFix(err);
      setFixedMap((prev) => ({ ...prev, [err.id]: res.summaryTh }));
    } finally {
      setFixingId(null);
    }
  };

  const handleCopyDetails = (err: AppError) => {
    const text = `[${err.code}] ${err.messageTh}\nวิธีแก้: ${err.hintTh}\nเวลา: ${err.timestamp}\nรายละเอียด: ${JSON.stringify(
      err.details || {},
      null,
      2
    )}`;
    navigator.clipboard.writeText(text);
    setCopiedId(err.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleDownloadReport = async () => {
    setIsDownloading(true);
    try {
      let healthData = null;
      try {
        const res = await fetch("/api/health");
        healthData = await res.json();
      } catch (healthErr) {
        healthData = { error: String(healthErr) };
      }

      const report = {
        appName: "Shopee Video Generator",
        version: "1.0.0",
        generatedAt: new Date().toISOString(),
        userAgent: typeof navigator !== "undefined" ? navigator.userAgent : "unknown",
        healthCheck: healthData,
        errorCount: history.length,
        errors: history,
      };

      const blob = new Blob([JSON.stringify(report, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `shopee-video-error-report-${Date.now()}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } finally {
      setIsDownloading(false);
    }
  };

  if (!isOpen) return null;

  const filteredHistory = history.filter((item) => {
    if (severityFilter !== "all" && item.severity !== severityFilter) return false;
    if (sourceFilter !== "all" && item.source !== sourceFilter) return false;
    return true;
  });

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div
        className="fixed inset-0 bg-black/40 backdrop-blur-xs transition-opacity"
        onClick={handleClose}
      />

      <div className="relative z-10 w-full max-w-lg bg-base-100 text-base-content h-full shadow-2xl border-l border-base-300 flex flex-col">
        {/* Drawer Header */}
        <div className="p-5 border-b border-base-300 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-base-content flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-primary" />
              <span>ศูนย์ช่วยเหลือ & AI แก้ไขปัญหาอัตโนมัติ</span>
            </h2>
            <p className="text-xs text-base-content/60 mt-0.5">
              วิเคราะห์สาเหตุและกดปุ่มให้ AI แก้ไขปัญหาให้ได้ทันที ({history.length} รายการ)
            </p>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="btn btn-ghost btn-sm btn-circle"
            aria-label="ปิดหน้าต่าง"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Filter Bar */}
        <div className="px-5 py-3 bg-base-200/50 border-b border-base-300 flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2">
            <Filter className="w-3.5 h-3.5 text-base-content/60" />
            <select
              value={severityFilter}
              onChange={(e) => setSeverityFilter(e.target.value)}
              className="select select-bordered select-xs rounded-lg bg-base-100"
            >
              <option value="all">ทุกระดับความสำคัญ</option>
              <option value="fatal">Fatal (วิกฤต)</option>
              <option value="error">Error (ข้อผิดพลาด)</option>
              <option value="warning">Warning (คำเตือน)</option>
              <option value="info">Info (ข้อมูล)</option>
            </select>

            <select
              value={sourceFilter}
              onChange={(e) => setSourceFilter(e.target.value)}
              className="select select-bordered select-xs rounded-lg bg-base-100"
            >
              <option value="all">ทุกส่วนของระบบ</option>
              <option value="tts">เสียงพากย์ (TTS)</option>
              <option value="render">เรนเดอร์วิดีโอ</option>
              <option value="gemini">AI สคริปต์</option>
              <option value="import">นำเข้าลิงก์</option>
              <option value="ui">หน้าจอใช้งาน</option>
            </select>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={handleDownloadReport}
              disabled={isDownloading || history.length === 0}
              className="btn btn-outline btn-xs rounded-lg gap-1"
            >
              <Download className="w-3.5 h-3.5" />
              <span>ส่งออกรายงาน</span>
            </button>
            <button
              type="button"
              onClick={clearHistory}
              disabled={history.length === 0}
              className="btn btn-ghost btn-xs text-error rounded-lg gap-1"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>ล้างประวัติ</span>
            </button>
          </div>
        </div>

        {/* Error List */}
        <div className="flex-1 overflow-y-auto p-5 space-y-3">
          {filteredHistory.length === 0 ? (
            <div className="h-64 flex flex-col items-center justify-center text-center text-base-content/50">
              <CheckCircle2 className="w-10 h-10 text-success mb-2 opacity-80" />
              <p className="text-sm font-semibold text-base-content">ระบบทำงานปกติ ไม่มีข้อผิดพลาด</p>
              <p className="text-xs mt-1">หากเกิดปัญหาขึ้น AI จะแสดงคำแนะนำและปุ่มแก้ไขให้ที่นี่</p>
            </div>
          ) : (
            filteredHistory.map((item) => {
              const diag = getAiDiagnosisForError(item);
              const fixedMsg = fixedMap[item.id];
              return (
                <div
                  key={item.id}
                  className="bg-base-100 border border-base-300 rounded-2xl p-4 space-y-3 shadow-xs"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-start gap-2">
                      {item.severity === "error" || item.severity === "fatal" ? (
                        <AlertCircle className="w-4 h-4 text-error shrink-0 mt-0.5" />
                      ) : item.severity === "warning" ? (
                        <AlertTriangle className="w-4 h-4 text-warning shrink-0 mt-0.5" />
                      ) : (
                        <Info className="w-4 h-4 text-info shrink-0 mt-0.5" />
                      )}
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="badge badge-outline badge-xs font-mono font-bold">
                            {item.code}
                          </span>
                          <span className="text-[11px] text-base-content/50">
                            {new Date(item.timestamp).toLocaleTimeString("th-TH")}
                          </span>
                        </div>
                        <h4 className="text-xs font-bold text-base-content mt-1">
                          {item.messageTh}
                        </h4>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleCopyDetails(item)}
                      className="btn btn-ghost btn-xs rounded-lg gap-1 shrink-0"
                    >
                      {copiedId === item.id ? (
                        <>
                          <Check className="w-3 h-3 text-success" />
                          <span className="text-success">คัดลอกแล้ว</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3" />
                          <span>คัดลอก</span>
                        </>
                      )}
                    </button>
                  </div>

                  {/* AI Guidance Box */}
                  <div className="bg-primary/5 border border-primary/20 rounded-xl p-3 space-y-2 text-xs">
                    <div className="font-semibold text-primary flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>AI นำทางแก้ปัญหา:</span>
                    </div>
                    <p className="text-base-content/80 leading-relaxed">{diag.rootCauseTh}</p>
                    <ol className="list-decimal list-inside text-base-content/75 space-y-0.5">
                      {diag.stepsTh.map((st, idx) => (
                        <li key={idx}>{st}</li>
                      ))}
                    </ol>

                    {fixedMsg ? (
                      <div className="bg-success/15 text-success border border-success/30 rounded-lg p-2 font-semibold flex items-center gap-1.5">
                        <CheckCircle2 className="w-4 h-4 shrink-0" />
                        <span>{fixedMsg}</span>
                      </div>
                    ) : (
                      <button
                        type="button"
                        disabled={fixingId === item.id}
                        onClick={() => handleAutoFixItem(item)}
                        className="btn btn-primary btn-xs w-full rounded-lg gap-1.5 font-bold mt-1"
                      >
                        {fixingId === item.id ? (
                          <>
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            <span>AI กำลังแก้ไข...</span>
                          </>
                        ) : (
                          <>
                            <Wand2 className="w-3.5 h-3.5" />
                            <span>{diag.autoFixLabel}</span>
                          </>
                        )}
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
