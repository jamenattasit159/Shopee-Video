"use client";

import { useEffect } from "react";
import { AlertTriangle, RotateCcw } from "lucide-react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[Global Error]", error);
  }, [error]);

  return (
    <html lang="th">
      <body className="min-h-screen bg-slate-900 text-white flex items-center justify-center p-6 font-sans">
        <div className="max-w-md w-full bg-slate-800 border border-slate-700 rounded-3xl p-8 text-center space-y-5 shadow-2xl">
          <div className="w-14 h-14 rounded-2xl bg-red-500/20 text-red-400 flex items-center justify-center mx-auto">
            <AlertTriangle className="w-8 h-8" />
          </div>

          <div className="space-y-2">
            <span className="inline-block px-2.5 py-0.5 rounded-full text-xs font-bold bg-red-500/20 text-red-400 uppercase">
              ระบบเกิดข้อผิดพลาดร้ายแรง
            </span>
            <h1 className="text-xl font-bold">
              เกิดข้อผิดพลาดที่ไม่สามารถทำงานต่อได้
            </h1>
            <p className="text-xs text-slate-400 leading-relaxed">
              ขออภัยในความไม่สะดวก กรุณากดปุ่มลองใหม่อีกครั้งเพื่อรีเฟรชระบบ
            </p>
          </div>

          <div className="pt-2">
            <button
              type="button"
              onClick={() => reset()}
              className="px-5 py-2.5 rounded-xl bg-orange-600 hover:bg-orange-500 text-white font-medium text-sm transition-all inline-flex items-center gap-2"
            >
              <RotateCcw className="w-4 h-4" />
              ลองใหม่อีกครั้ง
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
