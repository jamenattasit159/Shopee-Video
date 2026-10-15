"use client";

import React, { useEffect, useState } from "react";
import {
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  Info,
  Loader2,
  RotateCcw,
  Sparkles,
  Wand2,
  X,
  FileText,
} from "lucide-react";
import {
  DisplayToast,
  dismissToast,
  getAiDiagnosisForError,
  getErrorState,
  setDrawerOpen,
  subscribeErrorStore,
  triggerAiAutoFix,
} from "@/lib/errorStore";

export const ErrorToaster: React.FC = () => {
  const [toasts, setToasts] = useState<DisplayToast[]>([]);
  const [selectedToast, setSelectedToast] = useState<DisplayToast | null>(null);
  const [isAutoFixing, setIsAutoFixing] = useState<boolean>(false);
  const [autoFixFeedback, setAutoFixFeedback] = useState<{
    ok: boolean;
    message: string;
  } | null>(null);

  useEffect(() => {
    setToasts(getErrorState().toasts);
    const unsubscribe = subscribeErrorStore(() => {
      setToasts([...getErrorState().toasts]);
    });
    return unsubscribe;
  }, []);

  const handleRunAiAutoFix = async (targetToast: DisplayToast) => {
    setIsAutoFixing(true);
    setAutoFixFeedback(null);
    try {
      const res = await triggerAiAutoFix(targetToast);
      setAutoFixFeedback({ ok: res.ok, message: res.summaryTh });
      if (res.ok) {
        setTimeout(() => {
          dismissToast(targetToast.toastId);
          setSelectedToast(null);
          setAutoFixFeedback(null);
        }, 1800);
      }
    } finally {
      setIsAutoFixing(false);
    }
  };

  if (toasts.length === 0 && !selectedToast) {
    return null;
  }

  const fatalToast = toasts.find((t) => t.severity === "fatal");
  const regularToasts = toasts.filter((t) => t.severity !== "fatal");
  const selectedDiagnosis = selectedToast ? getAiDiagnosisForError(selectedToast) : null;

  return (
    <>
      {fatalToast && (
        <div
          role="alert"
          aria-live="assertive"
          className="fixed top-0 left-0 right-0 z-50 bg-error text-error-content px-6 py-3 shadow-2xl flex items-center justify-between border-b border-error-content/20 animate-in fade-in slide-in-from-top duration-200"
        >
          <div className="flex items-center gap-3">
            <AlertCircle className="w-6 h-6 shrink-0" />
            <div>
              <p className="font-bold text-sm">
                [ระบบหยุดทำงานฉุกเฉิน: {fatalToast.code}] {fatalToast.messageTh}
              </p>
              <p className="text-xs opacity-90">{fatalToast.hintTh}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => handleRunAiAutoFix(fatalToast)}
              disabled={isAutoFixing}
              className="btn btn-xs bg-white text-error hover:bg-white/90 border-0 rounded-lg font-bold gap-1"
            >
              <Wand2 className="w-3.5 h-3.5" />
              <span>ให้ AI แก้ให้อัตโนมัติ</span>
            </button>
            <button
              onClick={() => {
                setAutoFixFeedback(null);
                setSelectedToast(fatalToast);
              }}
              className="btn btn-xs bg-error-content/20 hover:bg-error-content/30 text-error-content border-0 rounded-lg"
            >
              ดูวิธีแก้
            </button>
            <button
              onClick={() => dismissToast(fatalToast.toastId)}
              className="btn btn-ghost btn-xs btn-circle text-error-content"
              aria-label="ปิดแจ้งเตือน"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Floating Toast Stack */}
      <div
        className="toast toast-top toast-end z-50 fixed p-4 space-y-2 pointer-events-none mt-12"
        role="region"
        aria-label="การแจ้งเตือนข้อผิดพลาด"
      >
        {regularToasts.map((toast) => {
          const isError = toast.severity === "error";
          const isWarning = toast.severity === "warning";
          const isInfo = toast.severity === "info";

          const alertClass = isError
            ? "alert-error text-error-content"
            : isWarning
            ? "alert-warning text-warning-content"
            : "alert-info text-info-content";

          return (
            <div
              key={toast.toastId}
              role="alert"
              aria-live="polite"
              className={`alert ${alertClass} shadow-lg rounded-2xl p-3.5 flex flex-col items-start gap-2 max-w-md pointer-events-auto border border-base-300/30 transition-all duration-200 animate-in fade-in slide-in-from-right`}
            >
              <div className="flex items-start justify-between w-full gap-2">
                <div className="flex items-start gap-2.5">
                  {isError && <AlertCircle className="w-5 h-5 shrink-0 mt-0.5 text-error-content" />}
                  {isWarning && <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5 text-warning-content" />}
                  {isInfo && <Info className="w-5 h-5 shrink-0 mt-0.5 text-info-content" />}
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-xs">{toast.messageTh}</span>
                      {toast.count > 1 && (
                        <span className="badge badge-sm font-bold bg-base-100/30 border-0">
                          ×{toast.count}
                        </span>
                      )}
                    </div>
                    {toast.hintTh && (
                      <p className="text-[11px] opacity-90 mt-0.5 leading-relaxed">
                        {toast.hintTh}
                      </p>
                    )}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => dismissToast(toast.toastId)}
                  className="btn btn-ghost btn-xs btn-circle shrink-0 opacity-70 hover:opacity-100"
                  aria-label="ปิดการแจ้งเตือน"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Action Buttons with Direct AI Auto-Fix */}
              <div className="flex items-center gap-2 self-end pt-1 flex-wrap">
                <button
                  type="button"
                  disabled={isAutoFixing}
                  onClick={() => handleRunAiAutoFix(toast)}
                  className="btn btn-xs bg-white text-neutral-900 hover:bg-white/90 border-0 rounded-lg gap-1 font-bold shadow-xs"
                >
                  {isAutoFixing ? (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  ) : (
                    <Wand2 className="w-3 h-3 text-primary" />
                  )}
                  <span>ให้ AI แก้ปัญหาให้เลย</span>
                </button>

                {toast.onRetry && toast.retryable && (
                  <button
                    type="button"
                    onClick={async () => {
                      dismissToast(toast.toastId);
                      if (toast.onRetry) await toast.onRetry();
                    }}
                    className="btn btn-xs bg-base-100/30 hover:bg-base-100/40 border-0 rounded-lg gap-1 font-semibold"
                  >
                    <RotateCcw className="w-3 h-3" />
                    ลองใหม่
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => {
                    setAutoFixFeedback(null);
                    setSelectedToast(toast);
                  }}
                  className="btn btn-xs bg-base-100/20 hover:bg-base-100/30 border-0 rounded-lg gap-1 text-[11px]"
                >
                  <FileText className="w-3 h-3" />
                  AI นำทางแก้ปัญหา
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Details & AI Troubleshooter Modal */}
      {selectedToast && selectedDiagnosis && (
        <div className="modal modal-open z-50">
          <div className="modal-box rounded-2xl max-w-xl p-6 bg-base-100 border border-base-300 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-base-300">
              <div className="flex items-center gap-2">
                <span className="badge badge-error badge-outline text-xs uppercase font-bold">
                  {selectedToast.code}
                </span>
                <span className="text-xs text-base-content/60">
                  {new Date(selectedToast.timestamp).toLocaleTimeString("th-TH")}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setSelectedToast(null)}
                className="btn btn-ghost btn-xs btn-circle"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <h4 className="font-bold text-base text-base-content">
                  {selectedToast.messageTh}
                </h4>
                <p className="text-xs text-base-content/80 mt-1 flex items-start gap-1.5">
                  <Info className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                  <span>
                    <strong>คำแนะนำเบื้องต้น:</strong> {selectedToast.hintTh}
                  </span>
                </p>
              </div>

              {/* AI Step-by-Step Guide & One-Click Auto-Fix Card */}
              <div className="bg-primary/5 border-2 border-primary/25 rounded-2xl p-4 space-y-3">
                <div className="flex items-center gap-2 text-primary font-bold text-sm">
                  <Sparkles className="w-4 h-4 shrink-0" />
                  <span>AI วิเคราะห์สาเหตุและนำทางแก้ปัญหา</span>
                </div>

                <p className="text-xs text-base-content/80 leading-relaxed">
                  <strong>สาเหตุที่ตรวจพบ:</strong> {selectedDiagnosis.rootCauseTh}
                </p>

                <div className="space-y-1.5">
                  <div className="text-xs font-semibold text-base-content">
                    สิ่งที่ AI จะดำเนินการแก้ไขให้อัตโนมัติ:
                  </div>
                  <ol className="list-decimal list-inside text-xs text-base-content/80 space-y-1">
                    {selectedDiagnosis.stepsTh.map((step, i) => (
                      <li key={i} className="leading-relaxed">
                        {step}
                      </li>
                    ))}
                  </ol>
                </div>

                {autoFixFeedback && (
                  <div
                    className={`p-3 rounded-xl text-xs font-semibold flex items-center gap-2 ${
                      autoFixFeedback.ok
                        ? "bg-success/15 text-success border border-success/30"
                        : "bg-warning/15 text-warning-content border border-warning/30"
                    }`}
                  >
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                    <span>{autoFixFeedback.message}</span>
                  </div>
                )}

                <button
                  type="button"
                  disabled={isAutoFixing}
                  onClick={() => handleRunAiAutoFix(selectedToast)}
                  className="btn btn-primary btn-sm w-full rounded-xl gap-2 shadow-sm font-bold"
                >
                  {isAutoFixing ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>AI กำลังแก้ไขปัญหาให้คุณ...</span>
                    </>
                  ) : (
                    <>
                      <Wand2 className="w-4 h-4" />
                      <span>{selectedDiagnosis.autoFixLabel}</span>
                    </>
                  )}
                </button>
              </div>

              {/* Collapsible Technical Log so it doesn't overwhelm the user */}
              <details className="collapse collapse-arrow bg-base-200/60 border border-base-300 rounded-xl text-xs">
                <summary className="collapse-title font-semibold text-base-content/70 py-2.5 min-h-0">
                  ดูรายละเอียดทางเทคนิคสำหรับนักพัฒนา (Technical Log)
                </summary>
                <div className="collapse-content space-y-2">
                  {selectedToast.context && (
                    <div>
                      <span className="font-semibold block text-base-content/70">บริบท (Context):</span>
                      <pre className="text-[11px] font-mono overflow-x-auto text-base-content/80">
                        {JSON.stringify(selectedToast.context, null, 2)}
                      </pre>
                    </div>
                  )}
                  {Boolean(selectedToast.details) && (
                    <div>
                      <span className="font-semibold block text-base-content/70">Stack / Log:</span>
                      <pre className="text-[11px] font-mono overflow-x-auto text-base-content/80 max-h-40">
                        {typeof selectedToast.details === "object"
                          ? JSON.stringify(selectedToast.details, null, 2)
                          : String(selectedToast.details)}
                      </pre>
                    </div>
                  )}
                </div>
              </details>
            </div>

            <div className="modal-action pt-2 border-t border-base-300 flex items-center justify-between">
              <button
                type="button"
                onClick={() => {
                  setSelectedToast(null);
                  setDrawerOpen(true);
                }}
                className="btn btn-ghost btn-sm rounded-xl text-xs"
              >
                เปิดศูนย์ประวัติข้อผิดพลาด
              </button>
              <button
                type="button"
                onClick={() => setSelectedToast(null)}
                className="btn btn-outline btn-sm rounded-xl px-4"
              >
                ปิดหน้าต่าง
              </button>
            </div>
          </div>
          <div className="modal-backdrop bg-black/40" onClick={() => setSelectedToast(null)} />
        </div>
      )}
    </>
  );
};
