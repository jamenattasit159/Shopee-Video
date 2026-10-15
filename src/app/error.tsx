"use client";

import { useEffect } from "react";
import { AlertTriangle, RotateCcw, Home, Info } from "lucide-react";
import { toAppError } from "@/lib/errors";

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[App ErrorBoundary]", error);
  }, [error]);

  const appErr = toAppError(error);

  return (
    <div className="min-h-[70vh] flex items-center justify-center p-6 bg-base-100 text-base-content">
      <div className="max-w-md w-full bg-base-200/50 border border-base-300 rounded-3xl p-8 text-center space-y-5 shadow-lg">
        <div className="w-14 h-14 rounded-2xl bg-error/10 text-error flex items-center justify-center mx-auto">
          <AlertTriangle className="w-8 h-8" />
        </div>

        <div className="space-y-2">
          <span className="badge badge-error badge-sm font-bold uppercase">
            {appErr.code}
          </span>
          <h2 className="text-xl font-bold text-base-content">
            {appErr.messageTh || "เกิดข้อผิดพลาดในการโหลดหน้านี้"}
          </h2>
          <p className="text-xs text-base-content/70 leading-relaxed flex items-center justify-center gap-1">
            <Info className="w-3.5 h-3.5 text-primary shrink-0" />
            <span>{appErr.hintTh || "กรุณากดปุ่มลองใหม่อีกครั้ง หรือกลับสู่หน้าหลัก"}</span>
          </p>
        </div>

        <div className="flex items-center justify-center gap-3 pt-2">
          <button
            type="button"
            onClick={() => reset()}
            className="btn btn-primary btn-sm rounded-xl gap-2 font-medium"
          >
            <RotateCcw className="w-4 h-4" />
            ลองใหม่อีกครั้ง
          </button>
          <a
            href="/"
            className="btn btn-ghost btn-sm rounded-xl gap-2"
          >
            <Home className="w-4 h-4" />
            กลับหน้าแรก
          </a>
        </div>
      </div>
    </div>
  );
}
