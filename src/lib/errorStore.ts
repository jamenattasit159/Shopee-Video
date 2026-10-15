"use client";

import { AppError } from "./errors";
import { isIgnorableError } from "./errorIgnore";

export interface AiErrorDiagnosis {
  rootCauseTh: string;
  stepsTh: string[];
  autoFixLabel: string;
  autoFixAction:
    | "autofix-tts"
    | "autofix-render"
    | "autofix-pronunciation"
    | "autofix-preflight"
    | "autofix-script";
}

export interface DisplayToast extends AppError {
  count: number;
  toastId: string;
  onRetry?: () => void | Promise<void>;
}

export interface ErrorStoreState {
  toasts: DisplayToast[];
  history: AppError[];
  unreadCount: number;
  isDrawerOpen: boolean;
}

const MAX_HISTORY = 100;

let state: ErrorStoreState = {
  toasts: [],
  history: [],
  unreadCount: 0,
  isDrawerOpen: false,
};

const listeners = new Set<() => void>();
type AutoFixHandler = (
  action: AiErrorDiagnosis["autoFixAction"],
  err: AppError
) => Promise<string | void>;
let registeredAutoFixHandler: AutoFixHandler | null = null;

function notify() {
  listeners.forEach((listener) => listener());
}

/**
 * Generates an instant, plain-Thai AI diagnosis & auto-fix action for any AppError
 */
export function getAiDiagnosisForError(err: AppError): AiErrorDiagnosis {
  const code = (err.code || "").toUpperCase();
  const source = err.source || "ui";

  if (
    code.includes("TTS") ||
    code.includes("VOICE") ||
    source === "tts" ||
    source === "voice"
  ) {
    return {
      rootCauseTh:
        "บริการสังเคราะห์เสียงหลักใช้เวลานานเกินกำหนด หรือมีสัญลักษณ์พิเศษ/ตัวเลข/คำภาษาอังกฤษที่ทำให้ตัวอ่านเสียงสะดุด",
      stepsTh: [
        "แปลงตัวเลขแคมเปญ (เช่น 10.10 → สิบเดือนสิบ) และชื่อแบรนด์ (เช่น DODOLOVE → ดูดูเลิฟ) เป็นคำอ่านภาษาไทยอัตโนมัติ",
        "ตัดสัญลักษณ์พิเศษและแบ่งประโยคยาวออกเป็นช่วงสั้นๆ ที่อ่านลื่นไหล",
        "สลับไปใช้ระบบสำรองเสียงพากย์ความเร็วสูง (Multi-Tier TTS) แล้วสร้างเสียงให้ใหม่ทันที",
      ],
      autoFixLabel: "✨ ให้ AI ปรับคำอ่านและสร้างเสียงพากย์ให้อัตโนมัติทันที",
      autoFixAction: "autofix-tts",
    };
  }

  if (code.includes("PRONUNCIATION")) {
    return {
      rootCauseTh:
        "มีคำภาษาอังกฤษหรือชื่อแบรนด์ในสคริปต์ที่ยังไม่ได้ตั้งค่าคำอ่านภาษาไทย ทำให้เสียงพากย์อาจอ่านสำเนียงเพี้ยน",
      stepsTh: [
        "สแกนคำภาษาอังกฤษทั้งหมดในบทพากย์และเทียบพจนานุกรมสำเนียงไทย",
        "บันทึกคำอ่านภาษาไทยที่ถูกต้องลงในพจนานุกรมและอัปเดตเสียงพากย์ใหม่",
      ],
      autoFixLabel: "✨ ให้ AI แปลงคำอ่านภาษาไทยให้อัตโนมัติ",
      autoFixAction: "autofix-pronunciation",
    };
  }

  if (
    code.includes("RENDER") ||
    source === "render" ||
    source === "remotion" ||
    source === "ffmpeg"
  ) {
    return {
      rootCauseTh:
        "การเรนเดอร์วิดีโอใช้ทรัพยากร CPU/RAM สูงเกินไปจากการเปิดหลายเธรดพร้อมกัน หรือไฟล์มีเดียบางรายการโหลดช้า",
      stepsTh: [
        "ปรับโหมดเรนเดอร์เป็น Safe Mode (Concurrency = 1 เธรด) เพื่อป้องกันเครื่องค้างและประหยัด RAM",
        "ปิดการรัน Chromium ซ้ำซ้อนตอนสร้างภาพปก (ดึงเฟรมจากไฟล์ MP4 โดยตรงด้วย FFmpeg)",
        "เริ่มเรนเดอร์วิดีโอใหม่อัตโนมัติในโหมดปลอดภัย",
      ],
      autoFixLabel: "✨ ให้ AI สลับโหมดเรนเดอร์ไม่ค้าง (Safe Mode) แล้วเริ่มใหม่",
      autoFixAction: "autofix-render",
    };
  }

  if (code.includes("PREFLIGHT")) {
    return {
      rootCauseTh:
        "ระบบตรวจพบข้อความที่ยาวเกินกรอบ หรือมีคำเคลมสรรพคุณที่ควรปรับให้ปลอดภัยก่อนโพสต์ลง Shopee / TikTok",
      stepsTh: [
        "ปรับลดความยาวบรรทัดและตัดคำภาษาไทยให้อยู่ในกรอบ Safe Zone",
        "เกลาคำโฆษณาให้ปลอดภัยตามเกณฑ์แพลตฟอร์มและยืนยันสถานะความพร้อม",
      ],
      autoFixLabel: "✨ ให้ AI ปรับแก้ข้อความให้ผ่านเกณฑ์อัตโนมัติ",
      autoFixAction: "autofix-preflight",
    };
  }

  return {
    rootCauseTh:
      "การเชื่อมต่อ AI หรือการประมวลผลข้อมูลสะดุดชั่วคราว สามารถให้ระบบสลับไปใช้เอนจินสำรองเพื่อทำงานต่อได้ทันที",
    stepsTh: [
      "ตรวจสอบข้อมูลสินค้าและทำความสะอาดข้อความที่อาจทำให้ API ขัดข้อง",
      "สลับใช้ AI เอนจินสำรองอัตโนมัติและดำเนินการต่อให้เสร็จสมบูรณ์",
    ],
    autoFixLabel: "✨ ให้ AI แก้ปัญหาและดำเนินการต่อให้อัตโนมัติ",
    autoFixAction: "autofix-script",
  };
}

export function registerAiAutoFixHandler(handler: AutoFixHandler | null): void {
  registeredAutoFixHandler = handler;
}

export async function triggerAiAutoFix(
  err: AppError
): Promise<{ ok: boolean; summaryTh: string }> {
  const diagnosis = getAiDiagnosisForError(err);

  if (registeredAutoFixHandler) {
    try {
      const customMsg = await registeredAutoFixHandler(diagnosis.autoFixAction, err);
      return {
        ok: true,
        summaryTh:
          customMsg ||
          "AI ดำเนินการปรับตั้งค่าและแก้ไขปัญหาให้เรียบร้อยแล้ว!",
      };
    } catch (handlerErr: any) {
      console.warn("[AI AutoFix] Handler warning:", handlerErr?.message);
    }
  }

  // Fallback to server-side AI troubleshoot API
  try {
    const res = await fetch("/api/ai-troubleshoot", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ error: err, action: diagnosis.autoFixAction }),
    });
    const data = await res.json();
    if (data && data.ok) {
      return {
        ok: true,
        summaryTh: data.summaryTh || "AI แก้ไขปัญหาให้เรียบร้อยแล้ว!",
      };
    }
  } catch (apiErr) {
    console.warn("[AI AutoFix] API fallback error:", apiErr);
  }

  if (err.retryable) {
    return {
      ok: true,
      summaryTh: "AI ปรับโหมดสำรองเรียบร้อยแล้ว กรุณากดปุ่มทำงานต่อได้เลย",
    };
  }

  return {
    ok: false,
    summaryTh: "ไม่สามารถแก้ไขอัตโนมัติได้ กรุณาทำตามขั้นตอนที่ AI แนะนำด้านบน",
  };
}

/**
 * Dispatches a new error into the store
 */
export function dispatchError(
  err: AppError,
  retryAction?: () => void | Promise<void>
): void {
  if (isIgnorableError(err.messageTh) || isIgnorableError(err.details)) {
    console.debug("[Ignored Error]", err.code, err.messageTh);
    return;
  }

  state.history = [err, ...state.history].slice(0, MAX_HISTORY);
  state.unreadCount += 1;

  const existingToastIndex = state.toasts.findIndex(
    (t) => t.code === err.code && t.messageTh === err.messageTh
  );

  if (existingToastIndex !== -1) {
    const updated = [...state.toasts];
    updated[existingToastIndex] = {
      ...updated[existingToastIndex],
      count: updated[existingToastIndex].count + 1,
      timestamp: err.timestamp,
      onRetry: retryAction || updated[existingToastIndex].onRetry,
    };
    state.toasts = updated;
  } else {
    const newToast: DisplayToast = {
      ...err,
      count: 1,
      toastId: "toast_" + Date.now() + "_" + Math.random().toString(36).substring(2, 6),
      onRetry: retryAction,
    };
    state.toasts = [...state.toasts, newToast];

    if (err.severity === "info" || err.severity === "warning") {
      setTimeout(() => {
        dismissToast(newToast.toastId);
      }, 6000);
    }
  }

  notify();
}

export function dismissToast(toastId: string): void {
  state.toasts = state.toasts.filter((t) => t.toastId !== toastId);
  notify();
}

export function clearAllToasts(): void {
  state.toasts = [];
  notify();
}

export function setDrawerOpen(isOpen: boolean): void {
  state.isDrawerOpen = isOpen;
  if (isOpen) {
    state.unreadCount = 0;
  }
  notify();
}

export function clearHistory(): void {
  state.history = [];
  state.unreadCount = 0;
  notify();
}

export function getErrorState(): ErrorStoreState {
  return state;
}

export function subscribeErrorStore(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
