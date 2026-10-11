"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  Copy,
  ExternalLink,
  Flame,
  Layers,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  Terminal,
  Volume2,
} from "lucide-react";
import { ERROR_CATALOG, CatalogEntry } from "@/lib/errorCatalog";
import { dispatchError, clearHistory, setDrawerOpen, getErrorState } from "@/lib/errorStore";
import { toAppError, redact } from "@/lib/errors";

export default function ErrorDevTestPage() {
  const [testRedactInput, setTestRedactInput] = useState(
    'Error at C:\\Users\\Jame\\shopeevido: AIzaSyD1234567890abcdef failed with token=secret_token_abc and url https://shopee.co.th/item?aff_sub=my_secret_sub_id&token=xyz'
  );
  const [redactedResult, setRedactedResult] = useState("");

  const handleTriggerError = (entry: CatalogEntry) => {
    // Dispatch simulated error with synthetic sensitive data to test redaction
    const simulatedError = toAppError(
      new Error(`Simulated failure for [${entry.code}]`),
      entry.code,
      {
        simulatedPath: "C:\\Users\\Jame\\AppData\\Local\\Temp\\render_dump.log",
        secretKey: "AIzaSyDSimulatedSecretKey99999",
        affiliateLink: "https://shopee.co.th/product-i.123.456?af_id=merchant99&sub_id=topsecret",
        clientTimestamp: new Date().toISOString(),
      }
    );
    dispatchError(simulatedError);
  };

  const handleTestDedupe = () => {
    // Trigger the same error 5 times rapidly
    for (let i = 0; i < 5; i++) {
      const err = toAppError(
        new Error("Network connection dropped repeatedly"),
        "NETWORK_OFFLINE",
        { attempt: i + 1 }
      );
      dispatchError(err);
    }
  };

  const handleTestFatal = () => {
    dispatchError({
      id: "fatal_" + Date.now(),
      code: "DISK_FULL",
      severity: "fatal",
      source: "storage",
      messageTh: "พื้นที่ฮาร์ดดิสก์เต็ม ไม่สามารถบันทึกหรือเรนเดอร์งานได้",
      hintTh: "กรุณาเคลียร์พื้นที่ในไดรฟ์อย่างน้อย 2 GB แล้วรีสตาร์ตระบบ",
      details: { freeBytes: 0, requiredBytes: 2147483648 },
      timestamp: new Date().toISOString(),
    });
  };

  const handleTestExtensionNoise = () => {
    // Simulate extension noise to verify it is filtered out
    window.dispatchEvent(
      new ErrorEvent("error", {
        message: "A listener indicated an asynchronous response by returning true, but the message channel closed before a response was received",
        filename: "chrome-extension://abcdefghijklm/content.js",
      })
    );
  };

  const handleRunRedactTest = () => {
    const res = redact(testRedactInput);
    setRedactedResult(typeof res === "string" ? res : JSON.stringify(res, null, 2));
  };

  // Group catalog entries by source/category
  const catalogList = Object.values(ERROR_CATALOG);
  const groups: Record<string, CatalogEntry[]> = {
    "รูปภาพ (Image)": catalogList.filter((c) => c.source === "ui" && c.code.includes("IMAGE") || c.code.includes("UPLOAD")),
    "Gemini AI": catalogList.filter((c) => c.source === "gemini"),
    "เสียง & เสียงพากย์ (Voice / TTS)": catalogList.filter((c) => c.source === "voice" || c.source === "tts"),
    "FFmpeg Engine": catalogList.filter((c) => c.source === "ffmpeg"),
    "Remotion Video Render": catalogList.filter((c) => c.source === "render" || c.source === "remotion"),
    "พื้นที่จัดเก็บ (Storage / Disk)": catalogList.filter((c) => c.source === "storage"),
    "Shopee Link Import": catalogList.filter((c) => c.source === "import"),
    "การตรวจสอบข้อความ (Validation)": catalogList.filter((c) => c.code.includes("TEXT") || c.code.includes("LINE_BREAK")),
    "ระบบ & เครือข่าย (System / Network)": catalogList.filter((c) => c.code.includes("NETWORK") || c.code === "UNKNOWN"),
  };

  return (
    <div className="min-h-screen bg-base-100 text-base-content p-4 sm:p-8 max-w-6xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-base-300 pb-6">
        <div>
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-xs text-primary hover:underline mb-2 font-medium"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>กลับหน้าหลัก Dashboard</span>
          </Link>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight flex items-center gap-3">
            <span>🛠️ Developer Error Alert Test Suite</span>
            <span className="badge badge-warning badge-sm font-mono">DEV ONLY</span>
          </h1>
          <p className="text-sm opacity-70 mt-1">
            เครื่องมือจำลองรหัสข้อผิดพลาดทั้งหมดในแคตตาล็อก ตรวจสอบ Toast, Error Center Drawer, Deduplication (×N) และ Data Redaction
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setDrawerOpen(true)}
            className="btn btn-sm btn-outline gap-1.5"
          >
            <Layers className="w-4 h-4" />
            <span>เปิด Error Center</span>
          </button>
          <button
            type="button"
            onClick={clearHistory}
            className="btn btn-sm btn-ghost text-error"
          >
            ล้างประวัติ
          </button>
        </div>
      </div>

      {/* Special Quick Stress & Filter Tests */}
      <div className="card bg-base-200 border border-base-300 rounded-2xl p-5 shadow-xs space-y-4">
        <h2 className="text-base font-bold flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-warning" />
          <span>การทดสอบกรณีพิเศษ (Edge Cases & Filtering)</span>
        </h2>
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={handleTestDedupe}
            className="btn btn-sm btn-warning gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            <span>ทดสอบ Dedupe ซ้ำ 5 ครั้ง (×5)</span>
          </button>
          <button
            type="button"
            onClick={handleTestFatal}
            className="btn btn-sm btn-error gap-2 text-white"
          >
            <Flame className="w-4 h-4" />
            <span>ทดสอบ Fatal Banner (พื้นที่ดิสก์เต็ม)</span>
          </button>
          <button
            type="button"
            onClick={handleTestExtensionNoise}
            className="btn btn-sm btn-neutral gap-2"
          >
            <ShieldCheck className="w-4 h-4" />
            <span>จำลอง Chrome Extension Noise (ต้องไม่เด้ง Toast)</span>
          </button>
        </div>
      </div>

      {/* Redaction Live Sandbox */}
      <div className="card bg-base-200 border border-base-300 rounded-2xl p-5 shadow-xs space-y-4">
        <h2 className="text-base font-bold flex items-center gap-2">
          <Terminal className="w-5 h-5 text-primary" />
          <span>ทดสอบฟังก์ชัน Redact (การลบข้อมูลลับและชื่อโฟลเดอร์ผู้ใช้)</span>
        </h2>
        <div className="space-y-2">
          <label className="text-xs font-semibold opacity-80">
            ข้อความทดสอบที่มี API Key, Token, Query String, และ Windows User Path:
          </label>
          <textarea
            value={testRedactInput}
            onChange={(e) => setTestRedactInput(e.target.value)}
            rows={2}
            className="textarea textarea-bordered w-full font-mono text-xs"
          />
          <button
            type="button"
            onClick={handleRunRedactTest}
            className="btn btn-sm btn-primary"
          >
            ทดสอบ Redact ข้อความ
          </button>
        </div>
        {redactedResult && (
          <div className="mt-2 p-3 bg-base-300 rounded-xl text-xs font-mono break-all border border-base-content/10">
            <span className="text-success font-bold block mb-1">ผลลัพธ์หลัง Redact:</span>
            {redactedResult}
          </div>
        )}
      </div>

      {/* Error Catalog Grid Grouped */}
      <div className="space-y-6">
        <h2 className="text-lg font-bold">
          จำลองรหัสใน Error Catalog ({catalogList.length} รหัสทั้งหมด)
        </h2>

        {Object.entries(groups).map(([groupTitle, entries]) => {
          if (entries.length === 0) return null;
          return (
            <div
              key={groupTitle}
              className="card bg-base-100 border border-base-300 rounded-2xl p-5 shadow-xs space-y-3"
            >
              <h3 className="text-sm font-bold opacity-80 uppercase tracking-wider">
                {groupTitle} ({entries.length})
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                {entries.map((entry) => {
                  const badgeColor =
                    entry.severity === "fatal"
                      ? "badge-error text-white font-bold"
                      : entry.severity === "error"
                      ? "badge-error"
                      : entry.severity === "warning"
                      ? "badge-warning"
                      : "badge-info";

                  return (
                    <button
                      key={entry.code}
                      type="button"
                      onClick={() => handleTriggerError(entry)}
                      className="p-3 rounded-xl border border-base-300 bg-base-200/50 hover:bg-base-200 hover:border-primary text-left transition flex flex-col justify-between gap-2 shadow-2xs group cursor-pointer"
                    >
                      <div>
                        <div className="flex items-center justify-between gap-1 mb-1">
                          <span className="font-mono text-xs font-bold group-hover:text-primary transition truncate">
                            {entry.code}
                          </span>
                          <span className={`badge badge-xs ${badgeColor} text-[10px]`}>
                            {entry.severity}
                          </span>
                        </div>
                        <p className="text-xs text-base-content/80 line-clamp-2">
                          {entry.messageTh}
                        </p>
                      </div>
                      <span className="text-[10px] text-primary font-medium flex items-center gap-1 opacity-0 group-hover:opacity-100 transition">
                        <span>คลิกเพื่อจำลอง Toast</span>
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
