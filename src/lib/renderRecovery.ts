import type { ExportBundleResult } from "./exportBundle";

export interface RenderAttempt { productId?: string; requestId?: string; }
export interface RenderProgress extends RenderAttempt {
  status: string;
  updatedAt?: number;
  percent?: number;
  message?: string;
  videoUrl?: string;
  exportBundle?: ExportBundleResult | null;
}

/** The worker status is authoritative even when the long POST response is lost. */
export function recoverRenderProgress(progress: RenderProgress | undefined, expected: RenderAttempt, now = Date.now()) {
  if (!progress || (expected.productId && progress.productId !== expected.productId) ||
      (expected.requestId && progress.requestId !== expected.requestId)) return null;
  const running = ["starting", "bundling", "rendering", "finalizing"].includes(progress.status);
  if (running && (!progress.updatedAt || now - progress.updatedAt > 600000)) {
    return { isRendering: false, error: "ไม่ได้รับความคืบหน้าของงานเรนเดอร์เกิน 10 นาที กรุณาตรวจสอบเซิร์ฟเวอร์ก่อนเริ่มใหม่", message: "รอยืนยันผลเรนเดอร์", percent: progress.percent || 0, videoUrl: undefined, exportBundle: undefined };
  }
  if (!running && progress.status !== "error" && !(progress.status === "complete" && progress.videoUrl)) return null;
  return {
    isRendering: running,
    error: progress.status === "error" ? progress.message || "เกิดข้อผิดพลาดในการเรนเดอร์" : null,
    message: progress.message || (running ? "กำลังเรนเดอร์วิดีโอ..." : "เรนเดอร์วิดีโอสำเร็จ"),
    percent: progress.percent ?? (running ? 5 : 100),
    videoUrl: progress.status === "complete" ? progress.videoUrl : undefined,
    exportBundle: progress.status === "complete" ? progress.exportBundle : undefined,
  };
}
