"use client";

import { AlertCircle, Check, Mic, RefreshCw, Settings2, UserRound } from "lucide-react";
import type { ReplicatedVoiceItem } from "../VoiceCloningModal";

interface ClonedVoicesSectionProps {
  voices: ReplicatedVoiceItem[];
  status: "loading" | "ready" | "error";
  /** Id of the cloned voice currently used for synthesis, if any. */
  selectedId: string | null;
  disabled?: boolean;
  onSelect: (voice: ReplicatedVoiceItem) => void;
  onRetry: () => void;
  onOpenCloning: () => void;
}

const formatDate = (iso?: string) => {
  if (!iso) return null;
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? null : d.toLocaleDateString("th-TH", { day: "numeric", month: "short", year: "2-digit" });
};

export function ClonedVoicesSection({
  voices,
  status,
  selectedId,
  disabled,
  onSelect,
  onRetry,
  onOpenCloning,
}: ClonedVoicesSectionProps) {
  return (
    <section className="rounded-2xl border border-base-300/60 bg-base-100 p-5" aria-labelledby="clones-heading">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h2 id="clones-heading" className="text-lg font-semibold">
            เสียงโคลนของฉัน
          </h2>
          <p className="text-xs opacity-60">พากย์ด้วยเสียงของคุณเอง ผ่าน Gemini AI</p>
        </div>
        {voices.length > 0 && (
          <button
            type="button"
            className="btn btn-ghost btn-xs rounded-lg opacity-60"
            onClick={onOpenCloning}
            disabled={disabled}
          >
            <Settings2 className="size-3.5" />
            จัดการ
          </button>
        )}
      </div>

      {status === "loading" ? (
        <div className="space-y-2">
          <div className="skeleton h-12 w-full rounded-xl" />
          <div className="skeleton h-12 w-full rounded-xl" />
        </div>
      ) : status === "error" ? (
        <div role="alert" className="alert alert-soft alert-warning rounded-xl text-sm">
          <AlertCircle className="size-4" />
          <span>โหลดรายการเสียงโคลนไม่สำเร็จ</span>
          <button type="button" className="btn btn-ghost btn-xs rounded-lg" onClick={onRetry}>
            <RefreshCw className="size-3.5" />
            ลองใหม่
          </button>
        </div>
      ) : voices.length === 0 ? (
        <div className="flex flex-col items-center rounded-xl border border-dashed border-base-300 px-4 py-6 text-center">
          <span className="grid size-10 place-items-center rounded-xl bg-base-200">
            <Mic className="size-5 opacity-60" />
          </span>
          <p className="mt-3 text-sm font-medium">ยังไม่มีเสียงโคลน</p>
          <p className="mt-1 text-xs opacity-60">อัดเสียงตัวอย่างประมาณ 10–30 วินาที แล้วใช้พากย์ได้ทันที</p>
        </div>
      ) : (
        <ul className="space-y-1" role="radiogroup" aria-label="เสียงโคลนของฉัน">
          {voices.map((v) => {
            const active = selectedId === v.id;
            const created = formatDate(v.createTime);
            return (
              <li key={v.id}>
                <button
                  type="button"
                  role="radio"
                  aria-checked={active}
                  disabled={disabled}
                  onClick={() => onSelect(v)}
                  className={`flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left transition duration-200 ease-out focus-visible:outline-2 focus-visible:outline-primary disabled:opacity-50 ${
                    active ? "bg-primary/5 ring-1 ring-primary" : "hover:bg-base-200/60"
                  }`}
                >
                  <span
                    className={`grid size-8 shrink-0 place-items-center rounded-lg ${
                      active ? "bg-primary text-primary-content" : "bg-base-200"
                    }`}
                    aria-hidden
                  >
                    {active ? <Check className="size-4" strokeWidth={3} /> : <UserRound className="size-4 opacity-60" />}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium">{v.displayName}</span>
                    <span className="block text-xs opacity-50">{created ? `สร้างเมื่อ ${created}` : "เสียงโคลน"}</span>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}

      <button
        type="button"
        className="btn btn-outline btn-block mt-4 rounded-xl"
        onClick={onOpenCloning}
        disabled={disabled}
      >
        <Mic className="size-4" />
        โคลนเสียงใหม่
      </button>
    </section>
  );
}
