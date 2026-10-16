"use client";

import React, { useEffect, useRef, useState } from "react";
import { RotateCcw, Upload } from "lucide-react";
import type { MascotAnimation } from "../../remotion/lib/mascotAnimation";

interface MascotSelection { mascotUrl?: string; mascotAnimation?: MascotAnimation; }
export function MascotUpload({ productId, value, onChange }: {
  productId: string; value: MascotSelection; onChange: (value: MascotSelection) => void;
}) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const input = useRef<HTMLInputElement>(null);
  const pending = useRef<AbortController | null>(null);
  const callback = useRef(onChange);
  const currentProduct = useRef(productId);
  callback.current = onChange;
  currentProduct.current = productId;
  useEffect(() => {
    setError(null);
    setUploading(false);
    return () => pending.current?.abort();
  }, [productId]);

  const save = async (file?: File) => {
    if (file && (!file.size || file.size > 10 * 1024 * 1024)) {
      setError("กรุณาเลือกไฟล์ขนาดไม่เกิน 10 MB");
      return;
    }
    pending.current?.abort();
    const controller = new AbortController();
    pending.current = controller;
    setUploading(true);
    setError(null);
    try {
      const form = new FormData();
      form.set("productId", productId);
      if (file) form.set("file", file); else form.set("reset", "true");
      const response = await fetch("/api/mascot", { method: "POST", body: form, signal: controller.signal });
      const result = await response.json();
      if (!response.ok) throw new Error(typeof result.error === "string" ? result.error : "อัปโหลดมาสคอตไม่สำเร็จ");
      if (!controller.signal.aborted && currentProduct.current === productId) callback.current({ mascotUrl: result.mascot.mascotUrl, mascotAnimation: result.mascot.mascotAnimation });
    } catch (err) {
      if (!controller.signal.aborted) setError(err instanceof Error ? err.message : "อัปโหลดมาสคอตไม่สำเร็จ");
    } finally {
      if (!controller.signal.aborted) setUploading(false);
      if (input.current) input.current.value = "";
    }
  };

  return <section className="space-y-3" aria-labelledby="mascot-upload-title" aria-busy={uploading}>
    <div className="flex items-center justify-between gap-3">
      <h3 id="mascot-upload-title" className="text-sm font-semibold">มาสคอตของคลิปนี้</h3>
      <span className="badge badge-outline badge-sm">{value.mascotAnimation ? "ภาพเคลื่อนไหว" : value.mascotUrl ? "ภาพที่อัปโหลด" : "ตัวละครเริ่มต้น"}</span>
    </div>
    <div className="flex items-center gap-4">
      <div className="flex h-28 w-24 shrink-0 items-center justify-center rounded-xl bg-base-200 p-2">
        <img src={value.mascotUrl || "/mascot/presenter.png"} alt="มาสคอตที่เลือก" className="h-full w-full object-contain" />
      </div>
      <div className="min-w-0 flex-1 space-y-2">
        <label htmlFor="mascot-file" className="flex items-center gap-2 text-sm font-medium"><Upload className="size-4" aria-hidden="true" />อัปโหลดหรือเปลี่ยนตัวละคร</label>
        <input id="mascot-file" ref={input} type="file" accept="image/png,image/jpeg,image/webp,image/gif" disabled={uploading}
          className="file-input file-input-bordered w-full rounded-xl" aria-describedby="mascot-file-help"
          onChange={(event) => { const file = event.target.files?.[0]; if (file) void save(file); }} />
        <p id="mascot-file-help" className="text-xs text-base-content/65">PNG, JPG, WebP หรือ GIF ไม่เกิน 10 MB / 120 เฟรม แนะนำพื้นหลังโปร่งใส บันทึกแยกตามสินค้า</p>
      </div>
    </div>
    <div className="flex flex-wrap items-center gap-3">
      <button type="button" className="btn btn-ghost btn-sm rounded-xl" disabled={uploading || !value.mascotUrl} onClick={() => void save()}>
        <RotateCcw className="size-4" aria-hidden="true" />ใช้มาสคอตเริ่มต้น
      </button>
      {uploading && <span role="status" className="flex items-center gap-2 text-sm text-base-content/65"><span className="loading loading-spinner loading-xs" />กำลังเตรียมมาสคอต...</span>}
    </div>
    {error && <p role="alert" className="alert alert-error rounded-xl text-sm">{error}</p>}
  </section>;
}
