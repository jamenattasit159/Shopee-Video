"use client";

import React, { useEffect, useState } from "react";
import {
  AlertCircle,
  AlertTriangle,
  Check,
  Copy,
  Download,
  Info,
  RefreshCw,
  Trash2,
  X,
  Filter,
} from "lucide-react";
import {
  clearHistory,
  getErrorState,
  setDrawerOpen,
  subscribeErrorStore,
} from "@/lib/errorStore";
import { AppError, Severity, Source } from "@/lib/errors";

export const ErrorCenterDrawer: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [history, setHistory] = useState<AppError[]>([]);
  const [severityFilter, setSeverityFilter] = useState<string>("all");
  const [sourceFilter, setSourceFilter] = useState<string>("all");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);

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

  const filteredHistory = history.filter((item) => {
    if (severityFilter !== "all" && item.severity !== severityFilter) return false;
    if (sourceFilter !== "all" && item.source !== sourceFilter) return false;
    return true;
  });

  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/40 backdrop-blur-xs transition-opacity animate-in fade-in duration-200">
      <div
        className="w-full max-w-md bg-base-100 h-full shadow-2xl flex flex-col border-l border-base-300 animate-in slide-in-from-right duration-200"
        role="dialog"
        aria-label="ศูนย์รวมประวัติข้อผิดพลาด"
      >
        {/* Drawer Header */}
        <div className="p-4 border-b border-base-300 flex items-center justify-between bg-base-200/50">
          <div className="flex items-center gap-2">
            <span className="w-8 h-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold">
              🚨
            </span>
            <div>
              <h3 className="font-bold text-sm text-base-content">
                ศูนย์รายงานข้อผิดพลาด (Error Center)
              </h3>
              <p className="text-[11px] text-base-content/60">
                ประวัติความผิดพลาดล่าสุด ({history.length} รายการ)
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="btn btn-ghost btn-sm btn-circle"
            aria-label="ปิดหน้ารายงาน"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Action Bar & Filters */}
        <div className="p-3 border-b border-base-300 space-y-2 bg-base-100">
          <div className="flex items-center gap-2">
            <select
              value={severityFilter}
              onChange={(e) => setSeverityFilter(e.target.value)}
              className="select select-bordered select-xs rounded-lg flex-1 text-xs"
            >
              <option value="all">ระดับความรุนแรงทั้งหมด</option>
              <option value="error">Error (ข้อผิดพลาด)</option>
              <option value="warning">Warning (คำเตือน)</option>
              <option value="fatal">Fatal (หยุดทำงาน)</option>
              <option value="info">Info (ข้อมูล)</option>
            </select>

            <select
              value={sourceFilter}
              onChange={(e) => setSourceFilter(e.target.value)}
              className="select select-bordered select-xs rounded-lg flex-1 text-xs"
            >
              <option value="all">แหล่งที่มาทั้งหมด</option>
              <option value="api">API</option>
              <option value="gemini">Gemini AI</option>
              <option value="tts">TTS</option>
              <option value="voice">Voice</option>
              <option value="render">Render</option>
              <option value="import">Import</option>
              <option value="ffmpeg">FFmpeg</option>
              <option value="storage">Storage</option>
            </select>
          </div>

          <div className="flex items-center justify-between pt-1">
            <button
              type="button"
              onClick={handleDownloadReport}
              disabled={isDownloading || history.length === 0}
              className="btn btn-outline btn-primary btn-xs rounded-lg gap-1"
            >
              <Download className="w-3 h-3" />
              {isDownloading ? "กำลังรวบรวม..." : "ดาวน์โหลดรายงาน JSON"}
            </button>

            {history.length > 0 && (
              <button
                type="button"
                onClick={clearHistory}
                className="btn btn-ghost btn-xs text-error rounded-lg gap-1"
              >
                <Trash2 className="w-3 h-3" />
                ล้างประวัติ
              </button>
            )}
          </div>
        </div>

        {/* History List */}
        <div className="flex-1 overflow-y-auto p-3 space-y-2.5">
          {filteredHistory.length === 0 ? (
            <div className="text-center py-16 text-base-content/50 space-y-2">
              <span className="text-3xl block">🎉</span>
              <p className="text-xs font-medium">ไม่พบประวัติข้อผิดพลาดในขณะนี้</p>
              <p className="text-[11px]">ระบบทำงานได้ตามปกติและราบรื่น</p>
            </div>
          ) : (
            filteredHistory.map((item) => {
              const isError = item.severity === "error" || item.severity === "fatal";
              const isWarning = item.severity === "warning";

              return (
                <div
                  key={item.id}
                  className="bg-base-200/50 hover:bg-base-200 border border-base-300 rounded-xl p-3 text-xs space-y-2 transition-all"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span
                        className={`badge badge-xs font-bold uppercase ${
                          item.severity === "fatal"
                            ? "badge-error text-white font-extrabold"
                            : isError
                            ? "badge-error"
                            : isWarning
                            ? "badge-warning"
                            : "badge-info"
                        }`}
                      >
                        {item.code}
                      </span>
                      <span className="badge badge-ghost badge-xs font-mono text-[10px]">
                        {item.source}
                      </span>
                    </div>
                    <span className="text-[10px] text-base-content/50">
                      {new Date(item.timestamp).toLocaleTimeString("th-TH")}
                    </span>
                  </div>

                  <div>
                    <h5 className="font-bold text-base-content text-[13px] leading-tight">
                      {item.messageTh}
                    </h5>
                    <p className="text-[11px] text-base-content/75 mt-1 leading-relaxed">
                      💡 {item.hintTh}
                    </p>
                  </div>

                  {Boolean(item.details) && (
                    <details className="bg-base-100 rounded-lg p-2 text-[10px] font-mono border border-base-300/60">
                      <summary className="cursor-pointer text-base-content/60 font-semibold select-none">
                        ดูข้อมูลทางเทคนิค (Redacted)
                      </summary>
                      <pre className="mt-1 overflow-x-auto text-base-content/80 max-h-32 whitespace-pre-wrap">
                        {typeof item.details === "object"
                          ? JSON.stringify(item.details, null, 2)
                          : String(item.details)}
                      </pre>
                    </details>
                  )}

                  <div className="flex items-center justify-end pt-1">
                    <button
                      type="button"
                      onClick={() => handleCopyDetails(item)}
                      className="btn btn-ghost btn-xs rounded-lg gap-1 text-[11px] text-base-content/70 hover:text-base-content"
                    >
                      {copiedId === item.id ? (
                        <>
                          <Check className="w-3 h-3 text-success" />
                          คัดลอกแล้ว!
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3" />
                          คัดลอกรายละเอียด
                        </>
                      )}
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
      <div className="flex-1" onClick={handleClose} />
    </div>
  );
};
