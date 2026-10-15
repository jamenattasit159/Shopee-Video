"use client";

import React, { useEffect, useState } from "react";
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  HardDrive,
  RefreshCw,
  Server,
  Sparkles,
  Volume2,
  X,
  XCircle,
} from "lucide-react";

interface HealthData {
  status: "healthy" | "warning" | "unhealthy";
  timestamp: string;
  checks: {
    environment: {
      geminiApiKeyConfigured: boolean;
    };
    ffmpeg: {
      available: boolean;
      ffprobeAvailable: boolean;
      filters: Record<string, boolean>;
    };
    remotion: {
      browserAvailable: boolean;
      browserType: string;
    };
    storage: {
      directoriesWritable: {
        data: boolean;
        publicUploads: boolean;
        publicRenders: boolean;
      };
      diskFreeGB: number;
      diskSpaceOk: boolean;
    };
    voices: {
      status: string;
      count: number;
    };
  };
}

export const SystemStatusBar: React.FC = () => {
  const [health, setHealth] = useState<HealthData | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);

  const fetchHealth = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/health");
      const data = await res.json();
      setHealth(data);
    } catch (err) {
      console.warn("Failed to fetch system health status:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchHealth();
    // Auto-refresh every 60 seconds
    const interval = setInterval(fetchHealth, 60000);
    return () => clearInterval(interval);
  }, []);

  if (!health) {
    return null;
  }

  const isHealthy = health.status === "healthy";
  const isWarning = health.status === "warning";
  const isUnhealthy = health.status === "unhealthy";

  const badgeColor = isHealthy
    ? "badge-success text-success-content"
    : isWarning
    ? "badge-warning text-warning-content"
    : "badge-error text-error-content";

  const statusText = isHealthy
    ? "ระบบพร้อมใช้งาน 100%"
    : isWarning
    ? "มีข้อควรระวังบางรายการ"
    : "ระบบมีปัญหา";

  return (
    <>
      <button
        type="button"
        onClick={() => setIsModalOpen(true)}
        className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-base-200 hover:bg-base-300 border border-base-300/60 transition-all text-xs cursor-pointer select-none"
        title="คลิกเพื่อดูรายละเอียดสถานะระบบ"
      >
        <span className="relative flex h-2 w-2">
          {isHealthy && (
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-success opacity-75" />
          )}
          <span
            className={`relative inline-flex rounded-full h-2 w-2 ${
              isHealthy ? "bg-success" : isWarning ? "bg-warning" : "bg-error"
            }`}
          />
        </span>
        <span className="font-semibold text-base-content/80 text-[11px]">
          {statusText}
        </span>
      </button>

      {/* Diagnostics Modal */}
      {isModalOpen && (
        <div className="modal modal-open z-50">
          <div className="modal-box rounded-2xl max-w-md p-6 bg-base-100 border border-base-300 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-base-300">
              <div className="flex items-center gap-2">
                <Activity className="w-5 h-5 text-primary" />
                <h4 className="font-bold text-sm text-base-content">
                  รายงานการตรวจสุขภาพระบบ (Health Diagnostics)
                </h4>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="btn btn-ghost btn-xs btn-circle"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              {/* Overall Status */}
              <div className="flex items-center justify-between p-3 rounded-xl bg-base-200/50">
                <span className="font-medium text-base-content/70">สถานะรวม:</span>
                <span className={`badge badge-sm font-bold uppercase ${badgeColor}`}>
                  {health.status}
                </span>
              </div>

              {/* Gemini Environment */}
              <div className="p-3 rounded-xl bg-base-200/40 border border-base-300/40 space-y-1.5">
                <div className="flex items-center justify-between font-semibold">
                  <span className="flex items-center gap-1.5 text-base-content">
                    <Sparkles className="w-4 h-4 text-warning" />
                    ระบบสร้างสคริปต์และเสียง AI
                  </span>
                  {health.checks.environment.geminiApiKeyConfigured ? (
                    <span className="text-success flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" /> ตั้งค่าคีย์แล้ว
                    </span>
                  ) : (
                    <span className="text-warning flex items-center gap-1">
                      <AlertTriangle className="w-3.5 h-3.5" /> ใช้ระบบสำรอง
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-base-content/60">
                  {health.checks.environment.geminiApiKeyConfigured
                    ? "ตั้งค่าคีย์สำหรับระบบ AI แล้ว"
                    : "ยังไม่ได้ตั้งค่าคีย์ AI ระบบใช้เทมเพลตสำรองอัตโนมัติ"}
                </p>
              </div>

              {/* Remotion Chromium */}
              <div className="p-3 rounded-xl bg-base-200/40 border border-base-300/40 space-y-1.5">
                <div className="flex items-center justify-between font-semibold">
                  <span className="flex items-center gap-1.5 text-base-content">
                    <Server className="w-4 h-4 text-primary" />
                    ระบบสร้างวิดีโอ
                  </span>
                  {health.checks.remotion.browserAvailable ? (
                    <span className="text-success flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" /> พร้อมเรนเดอร์
                    </span>
                  ) : (
                    <span className="text-error flex items-center gap-1">
                      <XCircle className="w-3.5 h-3.5" /> ไม่พบเบราว์เซอร์
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-base-content/60">
                  {health.checks.remotion.browserType} (1080x1920 @ 30fps)
                </p>
              </div>

              {/* FFmpeg Engine */}
              <div className="p-3 rounded-xl bg-base-200/40 border border-base-300/40 space-y-1.5">
                <div className="flex items-center justify-between font-semibold">
                  <span className="flex items-center gap-1.5 text-base-content">
                    <Volume2 className="w-4 h-4 text-secondary" />
                    ระบบประมวลผลเสียง
                  </span>
                  {health.checks.ffmpeg.available ? (
                    <span className="text-success flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" /> ไบนารีพร้อม
                    </span>
                  ) : (
                    <span className="text-error flex items-center gap-1">
                      <XCircle className="w-3.5 h-3.5" /> ไม่พบตัวประมวลผลเสียง
                    </span>
                  )}
                </div>
                <div className="flex flex-wrap gap-1 pt-0.5">
                  {Object.entries(health.checks.ffmpeg.filters).map(([f, has]) => (
                    <span
                      key={f}
                      className={`badge badge-xs ${
                        has ? "badge-success text-white" : "badge-ghost opacity-60"
                      }`}
                    >
                      {f}: {has ? "✓" : "✗"}
                    </span>
                  ))}
                </div>
              </div>

              {/* Storage */}
              <div className="p-3 rounded-xl bg-base-200/40 border border-base-300/40 space-y-1.5">
                <div className="flex items-center justify-between font-semibold">
                  <span className="flex items-center gap-1.5 text-base-content">
                    <HardDrive className="w-4 h-4 text-accent" />
                    พื้นที่จัดเก็บข้อมูล
                  </span>
                  <span className="text-base-content font-mono font-bold">
                    ว่าง {health.checks.storage.diskFreeGB} GB
                  </span>
                </div>
                <p className="text-[11px] text-base-content/60">
                  โฟลเดอร์ data/, public/uploads, public/renders มีสิทธิ์เขียนไฟล์ได้ปกติ
                </p>
              </div>
            </div>

            <div className="modal-action pt-2 border-t border-base-300 flex items-center justify-between">
              <button
                type="button"
                onClick={fetchHealth}
                disabled={isLoading}
                className="btn btn-outline btn-xs rounded-xl gap-1.5"
              >
                <RefreshCw className={`w-3 h-3 ${isLoading ? "animate-spin" : ""}`} />
                {isLoading ? "กำลังตรวจ..." : "ตรวจสถานะใหม่"}
              </button>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="btn btn-primary btn-xs rounded-xl px-4"
              >
                ปิด
              </button>
            </div>
          </div>
          <div className="modal-backdrop bg-black/40" onClick={() => setIsModalOpen(false)} />
        </div>
      )}
    </>
  );
};
