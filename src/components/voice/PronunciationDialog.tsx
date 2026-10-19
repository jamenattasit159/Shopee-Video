"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { BookA, Plus, Search, Trash2, X } from "lucide-react";
import { apiFetch } from "@/lib/apiFetch";

interface PronunciationDialogProps {
  open: boolean;
  onClose: () => void;
}

export function PronunciationDialog({ open, onClose }: PronunciationDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [map, setMap] = useState<Record<string, string>>({});
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [query, setQuery] = useState("");
  const [term, setTerm] = useState("");
  const [reading, setReading] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  useEffect(() => {
    if (!open) return;
    setStatus("loading");
    apiFetch<{ map: Record<string, string> }>("/api/pronunciation-map", undefined, { silent: true })
      .then((res) => {
        setMap(res.map || {});
        setStatus("ready");
      })
      .catch(() => setStatus("error"));
  }, [open]);

  const entries = useMemo(() => {
    const q = query.trim().toLowerCase();
    return Object.entries(map)
      .filter(([k, v]) => !q || k.toLowerCase().includes(q) || v.includes(q))
      .sort(([a], [b]) => a.localeCompare(b));
  }, [map, query]);

  const add = async (e: FormEvent) => {
    e.preventDefault();
    if (!term.trim() || !reading.trim()) return;
    setSaving(true);
    try {
      const res = await apiFetch<{ map: Record<string, string> }>("/api/pronunciation-map", {
        method: "POST",
        body: { map: { [term.trim()]: reading.trim() } },
      });
      setMap(res.map || {});
      setTerm("");
      setReading("");
    } catch {
      // apiFetch already surfaces the error toast
    } finally {
      setSaving(false);
    }
  };

  const remove = async (key: string) => {
    try {
      const res = await apiFetch<{ map: Record<string, string> }>(
        `/api/pronunciation-map?term=${encodeURIComponent(key)}`,
        { method: "DELETE" }
      );
      setMap(res.map || {});
    } catch {
      // surfaced by apiFetch
    }
  };

  return (
    <dialog ref={dialogRef} className="modal modal-bottom sm:modal-middle" onClose={onClose}>
      <div className="modal-box flex max-h-[85vh] flex-col gap-4 rounded-t-2xl p-0 sm:max-w-xl sm:rounded-2xl">
        <header className="flex items-start gap-3 px-6 pt-6">
          <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-base-200">
            <BookA className="size-4" />
          </span>
          <div className="min-w-0 flex-1">
            <h2 className="text-lg font-semibold">พจนานุกรมการออกเสียง</h2>
            <p className="text-sm opacity-60">กำหนดคำอ่านภาษาไทยให้ชื่อแบรนด์หรือคำภาษาอังกฤษ</p>
          </div>
          <button type="button" className="btn btn-ghost btn-sm btn-square rounded-xl" aria-label="ปิด" onClick={onClose}>
            <X className="size-4" />
          </button>
        </header>

        <form onSubmit={add} className="grid grid-cols-1 gap-2 px-6 sm:grid-cols-[1fr_1fr_auto]">
          <label className="sr-only" htmlFor="pron-term">คำต้นฉบับ</label>
          <input
            id="pron-term"
            className="input w-full rounded-xl"
            placeholder="คำต้นฉบับ เช่น MamyPoko"
            value={term}
            onChange={(e) => setTerm(e.target.value)}
          />
          <label className="sr-only" htmlFor="pron-reading">คำอ่าน</label>
          <input
            id="pron-reading"
            className="input w-full rounded-xl"
            placeholder="คำอ่าน เช่น มามี่โพโค"
            value={reading}
            onChange={(e) => setReading(e.target.value)}
          />
          <button type="submit" className="btn btn-primary rounded-xl" disabled={!term.trim() || !reading.trim() || saving}>
            {saving ? <span className="loading loading-spinner loading-xs" /> : <Plus className="size-4" />}
            เพิ่ม
          </button>
        </form>

        <div className="px-6">
          <label className="input input-sm w-full rounded-xl">
            <Search className="size-4 opacity-50" />
            <input
              type="search"
              placeholder={`ค้นหาใน ${Object.keys(map).length} คำ`}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              aria-label="ค้นหาคำ"
            />
          </label>
        </div>

        <div className="min-h-40 flex-1 overflow-y-auto px-3 pb-4">
          {status === "loading" && (
            <div className="space-y-2 px-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="skeleton h-9 w-full rounded-xl" />
              ))}
            </div>
          )}
          {status === "error" && (
            <p className="px-3 py-8 text-center text-sm text-error">โหลดพจนานุกรมไม่สำเร็จ ลองเปิดใหม่อีกครั้ง</p>
          )}
          {status === "ready" && entries.length === 0 && (
            <p className="px-3 py-8 text-center text-sm opacity-60">
              {query ? "ไม่พบคำที่ค้นหา" : "ยังไม่มีคำในพจนานุกรม"}
            </p>
          )}
          {status === "ready" && entries.length > 0 && (
            <ul className="divide-y divide-base-300/50">
              {entries.map(([k, v]) => (
                <li key={k} className="group flex items-center gap-3 rounded-xl px-3 py-2 hover:bg-base-200/60">
                  <span className="min-w-0 flex-1 truncate font-mono text-sm">{k}</span>
                  <span className="min-w-0 flex-1 truncate text-sm opacity-80">{v}</span>
                  <button
                    type="button"
                    className="btn btn-ghost btn-xs btn-square rounded-lg opacity-60 hover:text-error group-hover:opacity-100"
                    aria-label={`ลบคำ ${k}`}
                    onClick={() => remove(k)}
                  >
                    <Trash2 className="size-3.5" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
      <form method="dialog" className="modal-backdrop">
        <button aria-label="ปิด">close</button>
      </form>
    </dialog>
  );
}
