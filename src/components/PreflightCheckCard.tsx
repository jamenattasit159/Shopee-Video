"use client";

import React, { useState } from "react";
import {
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Info,
  ShieldCheck,
  RefreshCw,
  ArrowRight,
  Check,
} from "lucide-react";
import { CheckResult, PreflightSummary } from "@/lib/preflight";
import { apiFetch } from "@/lib/apiFetch";
import { ShopeeProductVideoProps } from "../../remotion/types";

interface PreflightCheckCardProps {
  projectProps: ShopeeProductVideoProps;
  productId?: string;
  onPreflightComplete?: (summary: PreflightSummary) => void;
  onNavigateToFix?: (where?: { sceneId?: string; field?: string }) => void;
  acknowledgedWarnings: string[];
  setAcknowledgedWarnings: React.Dispatch<React.SetStateAction<string[]>>;
}

export const PreflightCheckCard: React.FC<PreflightCheckCardProps> = ({
  projectProps,
  productId,
  onPreflightComplete,
  onNavigateToFix,
  acknowledgedWarnings,
  setAcknowledgedWarnings,
}) => {
  const [isRunning, setIsRunning] = useState(false);
  const [summary, setSummary] = useState<PreflightSummary | null>(null);
  const [filterMode, setFilterMode] = useState<"all" | "issues">("all");

  const runCheck = async () => {
    setIsRunning(true);
    try {
      const data = await apiFetch<any>("/api/preflight", {
        method: "POST",
        body: {
          project: projectProps,
          options: {
            acknowledgedWarnings,
            productRecord: { id: productId },
          },
        },
      });

      if (data && data.success && data.summary) {
        setSummary(data.summary);
        if (onPreflightComplete) {
          onPreflightComplete(data.summary);
        }
      }
    } catch (err) {
      console.error("Preflight check failed:", err);
    } finally {
      setIsRunning(false);
    }
  };

  const toggleAcknowledgeWarning = (warnId: string) => {
    setAcknowledgedWarnings((prev) =>
      prev.includes(warnId) ? prev.filter((id) => id !== warnId) : [...prev, warnId]
    );
  };

  const displayedResults = (summary?.results || []).filter((r) => {
    if (filterMode === "issues") return !r.pass;
    return true;
  });

  return (
    <div className="bg-base-100 border border-base-300/70 rounded-2xl p-5 shadow-xs space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-base-300/60">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-primary/10 text-primary">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-semibold text-base text-base-content flex items-center gap-2">
              <span>ด่านตรวจสอบความพร้อมก่อนเรนเดอร์ (Preflight Check)</span>
              {summary && (
                <span
                  className={`badge badge-sm font-semibold ${
                    summary.blockCount > 0
                      ? "badge-error"
                      : summary.warnCount > 0
                      ? "badge-warning"
                      : "badge-success"
                  }`}
                >
                  {summary.blockCount > 0
                    ? `บล็อก ${summary.blockCount} ข้อ`
                    : summary.warnCount > 0
                    ? `เตือน ${summary.warnCount} ข้อ`
                    : "ผ่านครบ 100%"}
                </span>
              )}
            </h3>
            <p className="text-xs text-base-content/60 mt-0.5">
              ตรวจจับข้อความล้น, ตัดคำ Part E, คำอวดอ้างต้องห้าม, ความยาวเสียง, ภาพ และขนาดดิสก์
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={runCheck}
          disabled={isRunning}
          className="btn btn-primary btn-sm rounded-xl gap-2 shadow-xs cursor-pointer"
        >
          {isRunning ? (
            <>
              <span className="loading loading-spinner loading-xs" />
              <span>กำลังตรวจ...</span>
            </>
          ) : (
            <>
              <RefreshCw className="w-3.5 h-3.5" />
              <span>{summary ? "ตรวจใหม่อีกครั้ง" : "ตรวจก่อนเรนเดอร์"}</span>
            </>
          )}
        </button>
      </div>

      {/* Initial state before checking */}
      {!summary && !isRunning && (
        <div className="bg-base-200/50 rounded-xl p-4 text-center text-xs text-base-content/70 flex flex-col items-center justify-center gap-2">
          <ShieldCheck className="w-6 h-6 text-primary/60" />
          <span>กดปุ่ม <strong>"ตรวจก่อนเรนเดอร์"</strong> เพื่อตรวจสอบคุณภาพและป้องกันข้อผิดพลาดก่อนสร้างคลิป</span>
        </div>
      )}

      {/* Summary Stats & Filter Controls */}
      {summary && (
        <div className="space-y-3">
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <span className="text-base-content/70">ผลการตรวจ:</span>
              <span className="badge badge-ghost badge-sm text-success font-semibold">
                ผ่าน {summary.passedCount}
              </span>
              {summary.warnCount > 0 && (
                <span className="badge badge-ghost badge-sm text-warning font-semibold">
                  เตือน {summary.warnCount}
                </span>
              )}
              {summary.blockCount > 0 && (
                <span className="badge badge-ghost badge-sm text-error font-semibold">
                  บล็อก {summary.blockCount}
                </span>
              )}
            </div>

            <div className="join">
              <button
                type="button"
                onClick={() => setFilterMode("all")}
                className={`join-item btn btn-xs ${filterMode === "all" ? "btn-active" : "btn-ghost"}`}
              >
                ทั้งหมด ({summary.totalChecks})
              </button>
              <button
                type="button"
                onClick={() => setFilterMode("issues")}
                className={`join-item btn btn-xs ${filterMode === "issues" ? "btn-active" : "btn-ghost"}`}
              >
                เฉพาะข้อที่ต้องดู ({summary.blockCount + summary.warnCount})
              </button>
            </div>
          </div>

          {/* Results List */}
          <div className="divide-y divide-base-300/50 border border-base-300/60 rounded-xl max-h-80 overflow-y-auto bg-base-100">
            {displayedResults.map((item) => {
              const isAcknowledged = acknowledgedWarnings.includes(item.id);
              return (
                <div
                  key={item.id}
                  className={`p-3 text-xs flex items-start justify-between gap-3 transition ${
                    !item.pass && item.severity === "block"
                      ? "bg-error/5"
                      : !item.pass && item.severity === "warn"
                      ? isAcknowledged
                        ? "bg-base-200/30 opacity-75"
                        : "bg-warning/5"
                      : "hover:bg-base-200/30"
                  }`}
                >
                  <div className="flex items-start gap-2.5 flex-1">
                    <div className="mt-0.5 shrink-0">
                      {item.pass ? (
                        <CheckCircle2 className="w-4 h-4 text-success" />
                      ) : item.severity === "block" ? (
                        <XCircle className="w-4 h-4 text-error" />
                      ) : item.severity === "warn" ? (
                        <AlertTriangle className="w-4 h-4 text-warning" />
                      ) : (
                        <Info className="w-4 h-4 text-info" />
                      )}
                    </div>
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-base-content">{item.messageTh}</span>
                        <code className="text-[10px] text-base-content/40 font-mono">[{item.id}]</code>
                      </div>
                      {item.hintTh && (
                        <p className="text-base-content/60 text-[11px]">{item.hintTh}</p>
                      )}
                    </div>
                  </div>

                  <div className="shrink-0 flex items-center gap-2">
                    {/* Go Fix Button */}
                    {!item.pass && onNavigateToFix && (
                      <button
                        type="button"
                        onClick={() => onNavigateToFix(item.where)}
                        className="btn btn-ghost btn-xs text-primary gap-1 cursor-pointer"
                      >
                        <span>ไปแก้</span>
                        <ArrowRight className="w-3 h-3" />
                      </button>
                    )}

                    {/* Acknowledge Warning Checkbox */}
                    {!item.pass && item.severity === "warn" && (
                      <button
                        type="button"
                        onClick={() => toggleAcknowledgeWarning(item.id)}
                        className={`btn btn-xs rounded-lg gap-1 cursor-pointer ${
                          isAcknowledged
                            ? "btn-success text-white"
                            : "btn-outline btn-warning"
                        }`}
                      >
                        {isAcknowledged ? (
                          <>
                            <Check className="w-3 h-3" />
                            <span>รับทราบแล้ว</span>
                          </>
                        ) : (
                          <span>รับทราบ</span>
                        )}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Block Alert Notice */}
          {summary.blockCount > 0 && (
            <div className="alert alert-error rounded-xl py-2 px-3 text-xs shadow-xs">
              <XCircle className="w-4 h-4 shrink-0" />
              <span>
                มีรายการข้อผิดพลาดระดับบล็อก <strong>{summary.blockCount} ข้อ</strong> จำเป็นต้องแก้ไขให้ผ่านก่อนเริ่มเรนเดอร์
              </span>
            </div>
          )}

          {/* Warn Only Notice */}
          {summary.blockCount === 0 && summary.warnCount > 0 && (
            <div className="alert alert-warning rounded-xl py-2 px-3 text-xs shadow-xs">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>
                ไม่มีข้อผิดพลาดระดับบล็อก คุณสามารถกด "รับทราบ" ข้อควรระวังด้านบนเพื่อเรนเดอร์วิดีโอต่อได้
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
