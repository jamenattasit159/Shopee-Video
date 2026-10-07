// src/components/ProductForm.tsx
"use client";

import {
  AlertTriangle,
  Camera,
  CheckCircle2,
  ExternalLink,
  FileText,
  HelpCircle,
  Loader2,
  RotateCcw,
  Sparkles,
  Tag,
  Trash2,
  Upload,
  Wand2,
} from "lucide-react";
import React, { useRef, useState } from "react";
import { PackId, ProductRecord } from "../../remotion/types";
import { ALL_PACK_IDS, PACK_INFO, rerollClientStyleDNA } from "../lib/styleConstants";
import { FieldSource, FieldStatus, ProductDraft } from "../lib/types";
import { LinkImport } from "./LinkImport";

interface ProductFormProps {
  onProductCreated: (product: ProductRecord) => void;
  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;
  onCancelNew?: () => void;
}

export const ProductForm: React.FC<ProductFormProps> = ({
  onProductCreated,
  isLoading,
  setIsLoading,
  onCancelNew,
}) => {
  // Active draft from link import
  const [activeDraft, setActiveDraft] = useState<ProductDraft | null>(null);

  // Input fields
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [highlights, setHighlights] = useState("");
  const [tone, setTone] = useState("exciting");
  const [cta, setCta] = useState("พิกัดในตะกร้าส้มซ้ายล่าง รีบกดก่อนโค้ดหมด!");
  const [styleMode, setStyleMode] = useState<"auto" | "custom">("auto");
  const [chosenPack, setChosenPack] = useState<PackId>("kraft-scrapbook");

  // Field source & status tracking for Review Screen
  const [fieldSources, setFieldSources] = useState<{
    name: FieldSource | null;
    price: FieldSource | null;
  }>({ name: null, price: null });

  const [fieldStatuses, setFieldStatuses] = useState<{
    name: FieldStatus;
    price: FieldStatus;
  }>({ name: "missing", price: "missing" });

  // 4-item Review Checklist (Section 8.2)
  const [checklist, setChecklist] = useState({
    nameOk: false,
    priceOk: false,
    imageOk: false,
    claimsOk: false,
  });

  const isChecklistComplete =
    checklist.nameOk && checklist.priceOk && checklist.imageOk && checklist.claimsOk;

  // File uploads and previews
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);
  const [useSampleImages, setUseSampleImages] = useState(false);

  // OCR Loading state
  const [isOcrLoading, setIsOcrLoading] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const ocrInputRef = useRef<HTMLInputElement>(null);

  const getSourceLabel = (src: FieldSource | null): string => {
    switch (src) {
      case "share-text":
        return "ข้อความแชร์";
      case "redirect-url":
        return "ลิงก์ Shopee";
      case "affiliate-api":
        return "Shopee API";
      case "gemini":
        return "Gemini AI";
      case "screenshot":
        return "ภาพหน้าจอ";
      case "user":
        return "แก้ไขเอง";
      default:
        return "ดึงอัตโนมัติ";
    }
  };

  // Handle draft loaded from LinkImport component
  const handleDraftLoaded = (draft: ProductDraft) => {
    setActiveDraft(draft);

    const draftName = draft.name.value || "";
    const draftPrice = draft.price.value ? `฿${draft.price.value}` : "";

    setName(draftName);
    setPrice(draftPrice);

    // สร้าง highlights ตั้งต้นจาก facts ที่ Gemini ดึงมาได้
    const factsList: string[] = [];
    if (draft.facts?.brand) factsList.push(`แบรนด์ ${draft.facts.brand}`);
    if (draft.facts?.pack) factsList.push(draft.facts.pack);
    if (draft.facts?.count) factsList.push(draft.facts.count);
    if (draft.facts?.claimsInTitle && draft.facts.claimsInTitle.length > 0) {
      factsList.push(...draft.facts.claimsInTitle);
    }

    if (factsList.length > 0) {
      setHighlights(factsList.join(", "));
    } else {
      setHighlights("สินค้าคุณภาพ คุ้มค่าเกินราคา ตรงปก");
    }

    setFieldSources({
      name: draft.name.source,
      price: draft.price.source,
    });

    setFieldStatuses({
      name: draft.name.status,
      price: draft.price.status,
    });

    // Populate images if downloaded from API
    if (draft.images && draft.images.length > 0) {
      setPreviewUrls(draft.images.map((img) => img.path));
      setSelectedFiles([]);
      setUseSampleImages(false);
    } else {
      setPreviewUrls([]);
    }

    // Reset checklist to require review
    setChecklist({
      nameOk: !!draft.name.value,
      priceOk: !!draft.price.value,
      imageOk: draft.images.length > 0,
      claimsOk: false,
    });
  };

  // Quick preset templates for easy testing
  const loadPreset = (category: "tumbler" | "earbuds" | "skincare") => {
    setActiveDraft(null); // Clear draft mode when loading presets
    if (category === "tumbler") {
      setName("แก้วเก็บความเย็น Tyeso สแตนเลส 304 แท้");
      setPrice("฿259 (ลด 56%) จากปกติ ฿590");
      setHighlights(
        "เก็บความเย็น 24 ชั่วโมง น้ำแข็งไม่ละลาย, สแตนเลส 304 Food Grade ไม่เป็นสนิม, มีหูหิ้วพกพาสะดวก ไม่หกเลอะเทอะ"
      );
      setTone("exciting");
      setCta("พิกัดในตะกร้าส้มซ้ายล่าง รีบกดก่อนโค้ดลดหมด!");
      setPreviewUrls([
        "/samples/tumbler-1.svg",
        "/samples/tumbler-2.svg",
        "/samples/tumbler-3.svg",
      ]);
      setSelectedFiles([]);
      setUseSampleImages(true);
    } else if (category === "earbuds") {
      setName("หูฟังบลูทูธไร้สาย ANC ตัดเสียงรบกวน");
      setPrice("฿389 (โปรแฟลชเซลล์)");
      setHighlights(
        "ตัดเสียงรบกวนรอบข้างเงียบสนิท, แบตอึดฟังต่อเนื่อง 30 ชั่วโมง, เบสแน่น เสียงคมชัดระดับ Hi-Fi, กันน้ำกันเหงื่อใส่ออกกำลังกายได้"
      );
      setTone("problem_solving");
      setCta("จิ้มตะกร้าส้มซ้ายล่าง มีคูปองส่งฟรี!");
      setPreviewUrls([
        "/samples/tumbler-1.svg",
        "/samples/tumbler-2.svg",
      ]);
      setSelectedFiles([]);
      setUseSampleImages(true);
    } else if (category === "skincare") {
      setName("เซรั่มไฮยาหน้าใส กู้ผิวโทรมเร่งด่วน");
      setPrice("฿190 (ซื้อ 1 แถม 1)");
      setHighlights(
        "ผิวชุ่มชื้นอิ่มฟูใน 3 วัน, ลดรอยสิว รอยดำแลดูจางลง, อ่อนโยนผิวแพ้ง่ายใช้ได้ ไม่มีแอลกอฮอล์, ซึมไวไม่เหนียวเหนอะหนะ"
      );
      setTone("minimal");
      setCta("รีบกดที่ตะกร้าส้มก่อนโปร 1 แถม 1 จะหมด!");
      setPreviewUrls([
        "/samples/tumbler-2.svg",
        "/samples/tumbler-3.svg",
      ]);
      setSelectedFiles([]);
      setUseSampleImages(true);
    }

    setFieldSources({ name: "user", price: "user" });
    setFieldStatuses({ name: "ok", price: "ok" });
  };

  const handleClearForm = () => {
    setActiveDraft(null);
    setName("");
    setPrice("");
    setHighlights("");
    setTone("exciting");
    setCta("พิกัดในตะกร้าส้มซ้ายล่าง");
    setSelectedFiles([]);
    setPreviewUrls([]);
    setUseSampleImages(false);
    setFieldSources({ name: null, price: null });
    setFieldStatuses({ name: "missing", price: "missing" });
    setChecklist({ nameOk: false, priceOk: false, imageOk: false, claimsOk: false });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const filesArray = Array.from(e.target.files).slice(0, 5);
      setSelectedFiles(filesArray);
      setUseSampleImages(false);

      const objectUrls = filesArray.map((file) => URL.createObjectURL(file));
      setPreviewUrls(objectUrls);
      setChecklist((p) => ({ ...p, imageOk: true }));
    }
  };

  const handleRemoveImage = (index: number) => {
    const updatedPreviews = previewUrls.filter((_, i) => i !== index);
    const updatedFiles = selectedFiles.filter((_, i) => i !== index);
    setPreviewUrls(updatedPreviews);
    setSelectedFiles(updatedFiles);
    if (updatedPreviews.length === 0) {
      setUseSampleImages(false);
      setChecklist((p) => ({ ...p, imageOk: false }));
    }
  };

  // Tier 4: Gemini Vision OCR on screenshot upload
  const handleOcrUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsOcrLoading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);

      const res = await fetch("/api/ocr-screenshot", {
        method: "POST",
        body: fd,
      });

      const data = await res.json();
      if (data.ok && data.data) {
        if (!name.trim() && data.data.productName) {
          setName(data.data.productName);
          setFieldSources((p) => ({ ...p, name: "screenshot" }));
          setFieldStatuses((p) => ({ ...p, name: "review" }));
        }
        if ((!price.trim() || price === "฿199") && data.data.price) {
          setPrice(`฿${data.data.price}`);
          setFieldSources((p) => ({ ...p, price: "screenshot" }));
          setFieldStatuses((p) => ({ ...p, price: "review" }));
        }
        alert("✨ อ่านข้อมูลจากภาพหน้าจอเรียบร้อยแล้ว กรุณาตรวจสอบความถูกต้องในฟอร์มครับ");
      } else {
        alert(data.error || "ไม่สามารถอ่านข้อมูลจากภาพหน้าจอได้");
      }
    } catch (err: any) {
      console.error("OCR error:", err);
      alert("เกิดข้อผิดพลาดในการอ่านภาพหน้าจอ: " + err.message);
    } finally {
      setIsOcrLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return alert("กรุณาระบุชื่อสินค้า");

    // ถ้าอยู่ในโหมด Review Screen ต้องผ่านเกณฑ์ checklist ครบ
    if (activeDraft && !isChecklistComplete) {
      return alert("กรุณาตรวจสอบข้อมูลและติ๊ก Checklist ให้ครบทั้ง 4 ข้อก่อนกดยืนยันครับ");
    }

    if (previewUrls.length === 0) {
      const confirmUseSample = confirm(
        "คุณยังไม่ได้อัปโหลดรูปภาพสินค้า ต้องการให้ระบบใช้ภาพตัวอย่างแทนเพื่อสร้างคลิปเลยหรือไม่?"
      );
      if (confirmUseSample) {
        setPreviewUrls([
          "/samples/tumbler-1.svg",
          "/samples/tumbler-2.svg",
          "/samples/tumbler-3.svg",
        ]);
        setUseSampleImages(true);
      } else {
        return;
      }
    }

    setIsLoading(true);
    try {
      const formData = new FormData();
      formData.append("name", name);
      formData.append("price", price || "฿199");
      formData.append("highlights", highlights || "สินค้าคุณภาพ คุ้มค่าเกินราคา");
      formData.append("tone", tone);
      formData.append("cta", cta || "พิกัดในตะกร้าส้มซ้ายล่าง");

      // ส่ง optional metadata หากมาจาก link import
      if (activeDraft) {
        formData.append(
          "importMeta",
          JSON.stringify({
            originalUrl: activeDraft.originalUrl,
            shopId: activeDraft.shopId,
            itemId: activeDraft.itemId,
            fetchedAt: activeDraft.fetchedAt,
            confirmedAt: new Date().toISOString(),
          })
        );
        if (activeDraft.category) {
          formData.append("category", activeDraft.category);
        }
        if (activeDraft.promoTag?.value) {
          formData.append("promoTag", activeDraft.promoTag.value);
        }
        if (activeDraft.facts) {
          formData.append("facts", JSON.stringify(activeDraft.facts));
        }
      }

      if (useSampleImages || selectedFiles.length === 0) {
        const fallbackImgs =
          previewUrls.length > 0
            ? previewUrls
            : ["/samples/tumbler-1.svg", "/samples/tumbler-2.svg", "/samples/tumbler-3.svg"];
        formData.append("existingImages", JSON.stringify(fallbackImgs));
      } else {
        selectedFiles.forEach((file) => {
          formData.append("files", file);
        });
      }

      const res = await fetch("/api/products", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (data.success && data.product) {
        onProductCreated(data.product);
      } else {
        alert(data.error || "เกิดข้อผิดพลาดในการบันทึกข้อมูล");
      }
    } catch (err: any) {
      console.error(err);
      alert("เกิดข้อผิดพลาด: " + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. Shopee Link Import Bar (Section 8.1) */}
      <LinkImport
        onDraftLoaded={handleDraftLoaded}
        onLoadPreset={loadPreset}
        onSwitchToManual={() => {
          setActiveDraft(null);
          handleClearForm();
        }}
        isParentLoading={isLoading}
      />

      {/* 2. Main Form & Review Screen Container */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6">
        {/* Top Banner & Mode Controls */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-5 border-b border-slate-800 gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-orange-400 bg-orange-950/60 border border-orange-800/60 px-2.5 py-1 rounded-full uppercase tracking-wider">
                {activeDraft ? "Review & Confirm" : "Step 1: Input & Uploads"}
              </span>
              <span
                className={`text-xs font-semibold px-2 py-0.5 rounded-full flex items-center gap-1 ${
                  activeDraft
                    ? "text-amber-400 bg-amber-950/50 border border-amber-800/60"
                    : "text-emerald-400 bg-emerald-950/50 border border-emerald-800/60"
                }`}
              >
                <span
                  className={`w-1.5 h-1.5 rounded-full animate-pulse ${
                    activeDraft ? "bg-amber-400" : "bg-emerald-400"
                  }`}
                />
                {activeDraft ? "ตรวจสอบร่างข้อมูลก่อนสร้างคลิป" : "พร้อมสร้างสินค้าใหม่"}
              </span>
            </div>
            <h2 className="text-xl font-bold text-white mt-1.5 flex items-center gap-2">
              <span>
                {activeDraft
                  ? "🔍 ตรวจสอบและยืนยันข้อมูลสินค้า (Review Screen)"
                  : "📦 กรอกข้อมูลสินค้าเพื่อสร้างคลิปใหม่"}
              </span>
            </h2>
          </div>

          {/* Quick Action Buttons */}
          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={handleClearForm}
              className="text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white px-3 py-1.5 rounded-xl border border-slate-700 transition flex items-center gap-1.5"
              title="ล้างข้อความทั้งหมดในฟอร์มเพื่อกรอกใหม่"
            >
              <RotateCcw className="w-3.5 h-3.5 text-slate-400" />
              <span>ล้างฟอร์มว่าง</span>
            </button>

            <button
              type="button"
              onClick={() => loadPreset("tumbler")}
              className="text-xs bg-orange-950/50 hover:bg-orange-900/60 text-orange-300 hover:text-white px-3 py-1.5 rounded-xl border border-orange-800/60 transition flex items-center gap-1.5"
            >
              <Sparkles className="w-3.5 h-3.5 text-orange-400" />
              <span>โหลดสินค้าตัวอย่าง</span>
            </button>
          </div>
        </div>

        {/* Review Screen Header Info (When activeDraft is present) */}
        {activeDraft && (
          <div className="bg-slate-950/80 border border-amber-500/30 rounded-xl p-4 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
              <div className="flex items-center gap-2 truncate">
                <span className="text-slate-400 shrink-0">ลิงก์ต้นฉบับ:</span>
                <span className="text-slate-300 truncate font-mono">
                  {activeDraft.originalUrl}
                </span>
                <a
                  href={activeDraft.originalUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-ghost btn-xs text-orange-400 hover:text-orange-300 flex items-center gap-1 shrink-0"
                >
                  <span>เปิดดูหน้าสินค้าจริง</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
              <div className="text-slate-400 shrink-0">
                ดึงข้อมูลเมื่อ:{" "}
                <span className="text-slate-200">
                  {new Date(activeDraft.fetchedAt).toLocaleTimeString("th-TH")}
                </span>
              </div>
            </div>

            <div className="text-xs text-amber-300/90 bg-amber-950/40 border border-amber-800/40 rounded-lg p-2.5 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
              <span>
                <strong>โปรดทราบ:</strong> ราคาและโปรโมชันอาจเปลี่ยนแปลงตามเวลา
                กรุณาตรวจสอบความถูกต้องก่อนกดยืนยันเรนเดอร์คลิป
              </span>
            </div>

            {/* Warnings list if any */}
            {activeDraft.warnings && activeDraft.warnings.length > 0 && (
              <div className="bg-amber-950/60 border border-amber-600/50 rounded-xl p-3 text-xs space-y-1">
                <div className="font-semibold text-amber-300 flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  <span>ข้อสังเกตจากระบบ:</span>
                </div>
                <ul className="list-disc list-inside text-amber-200/80 space-y-0.5">
                  {activeDraft.warnings.map((w, idx) => (
                    <li key={idx}>{w}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Tier 4: Screenshot OCR Fallback Button */}
            <div className="flex items-center justify-between pt-1 border-t border-slate-800/80">
              <span className="text-xs text-slate-400">
                หากช่องใดขาดข้อมูล สามารถให้ Gemini Vision ช่วยอ่านจากรูปภาพหน้าจอได้:
              </span>
              <div>
                <input
                  type="file"
                  ref={ocrInputRef}
                  onChange={handleOcrUpload}
                  accept="image/*"
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => ocrInputRef.current?.click()}
                  disabled={isOcrLoading}
                  className="btn btn-xs btn-outline border-slate-700 hover:border-orange-500 text-slate-300 gap-1.5"
                >
                  {isOcrLoading ? (
                    <>
                      <Loader2 className="w-3 h-3 animate-spin text-orange-400" />
                      <span>กำลังอ่านภาพ...</span>
                    </>
                  ) : (
                    <>
                      <Camera className="w-3 h-3 text-orange-400" />
                      <span>📷 อัปโหลดภาพหน้าจอสินค้า (OCR)</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Product Name */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-sm font-semibold text-slate-200 flex items-center gap-2">
                <span>1. ชื่อสินค้า (Product Name)</span>
                <span className="text-orange-500">*</span>
              </label>

              {/* Status Badge */}
              {activeDraft && (
                <span
                  className={`badge text-[10px] font-medium ${
                    fieldStatuses.name === "ok"
                      ? "badge-success"
                      : fieldStatuses.name === "review"
                      ? "badge-warning"
                      : "badge-error"
                  }`}
                >
                  {fieldStatuses.name === "ok" && `✅ ดึงได้ (${getSourceLabel(fieldSources.name)})`}
                  {fieldStatuses.name === "review" && `⚠️ ควรตรวจ (${getSourceLabel(fieldSources.name)})`}
                  {fieldStatuses.name === "missing" && "❌ ไม่พบ (ต้องกรอกเอง)"}
                </span>
              )}
            </div>

            <input
              type="text"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                setFieldSources((p) => ({ ...p, name: "user" }));
                setFieldStatuses((p) => ({ ...p, name: "ok" }));
                setChecklist((p) => ({ ...p, nameOk: true }));
              }}
              placeholder="พิมพ์ชื่อสินค้าของคุณ เช่น ขาตั้งกล้องบลูทูธ, หม้อทอดไร้น้ำมัน, ลิปสติกแมทท์"
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition text-sm"
              required
            />
          </div>

          {/* Price & Highlight Row */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-sm font-semibold text-slate-200">
                  2. ราคาและโปรโมชั่น (Price & Deal) <span className="text-orange-500">*</span>
                </label>

                {/* Price Status Badge */}
                {activeDraft && (
                  <span
                    className={`badge text-[10px] font-medium ${
                      fieldStatuses.price === "ok"
                        ? "badge-success"
                        : fieldStatuses.price === "review"
                        ? "badge-warning"
                        : "badge-error"
                    }`}
                  >
                    {fieldStatuses.price === "ok" && `✅ ดึงได้ (${getSourceLabel(fieldSources.price)})`}
                    {fieldStatuses.price === "review" && `⚠️ ควรตรวจ (${getSourceLabel(fieldSources.price)})`}
                    {fieldStatuses.price === "missing" && "❌ ไม่พบ (ต้องกรอกเอง)"}
                  </span>
                )}
              </div>
              <input
                type="text"
                value={price}
                onChange={(e) => {
                  setPrice(e.target.value);
                  setFieldSources((p) => ({ ...p, price: "user" }));
                  setFieldStatuses((p) => ({ ...p, price: "ok" }));
                  setChecklist((p) => ({ ...p, priceOk: true }));
                }}
                placeholder="เช่น ฿199 (ลด 50%), ซื้อ 1 แถม 1"
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition text-sm"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-200 mb-1.5">
                3. สไตล์ / อารมณ์ของวิดีโอ (Video Tone)
              </label>
              <select
                value={tone}
                onChange={(e) => setTone(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition text-sm"
              >
                <option value="exciting">🔥 สายป้ายยา ตื่นเต้น เร้าใจ (Viral Hook)</option>
                <option value="minimal">🌿 มินิมอล คลีนๆ สไตล์มูจิ (Minimal Aesthetic)</option>
                <option value="problem_solving">💡 เน้นแก้ปัญหา ก่อน-หลัง (Pain Point / Before-After)</option>
                <option value="promo">⚡ จัดโปรโมชั่น Flash Sale ลดกระหน่ำ (Urgent Deal)</option>
              </select>
            </div>
          </div>

          {/* Video Style Selection (Anti-Repetition / Style Pack) */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-semibold text-slate-200">
                สไตล์วิดีโอ (Video Style Pack)
              </label>
              <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs">
                <button
                  type="button"
                  onClick={() => setStyleMode("auto")}
                  className={`px-3 py-1 rounded-lg transition font-medium ${
                    styleMode === "auto"
                      ? "bg-orange-600 text-white shadow-sm"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  🎲 สุ่มให้ (แนะนำ)
                </button>
                <button
                  type="button"
                  onClick={() => setStyleMode("custom")}
                  className={`px-3 py-1 rounded-lg transition font-medium ${
                    styleMode === "custom"
                      ? "bg-indigo-600 text-white shadow-sm"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  🎨 เลือกเอง
                </button>
              </div>
            </div>

            {styleMode === "auto" ? (
              <div className="bg-slate-950/70 border border-slate-800/80 rounded-xl p-3.5 text-xs text-slate-400 flex items-center gap-3">
                <div className="text-xl">✨</div>
                <div>
                  <strong className="text-slate-200">
                    ระบบคัดสรรสไตล์อัตโนมัติ (Anti-Repetition Engine):
                  </strong>
                  <p className="mt-0.5 text-slate-400">
                    ระบบจะสลับแพ็กและพาเลตสีให้ไม่ซ้ำกับคลิปก่อนหน้า เพื่อให้คลิปมีความหลากหลายสูงและสะกดสายตา
                  </p>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
                {ALL_PACK_IDS.map((pId) => {
                  const info = PACK_INFO[pId];
                  const isSelected = chosenPack === pId;
                  return (
                    <button
                      key={pId}
                      type="button"
                      onClick={() => setChosenPack(pId)}
                      className={`text-left p-2.5 rounded-xl border transition text-xs flex flex-col gap-1 ${
                        isSelected
                          ? "bg-indigo-950/90 border-indigo-500 text-white ring-1 ring-indigo-500"
                          : "bg-slate-950/60 border-slate-800 text-slate-300 hover:border-slate-700"
                      }`}
                    >
                      <div className="flex items-center gap-1.5 font-bold">
                        <span className="text-base">{info.emoji}</span>
                        <span className="truncate">{info.name}</span>
                      </div>
                      <div className="text-[11px] text-slate-400 line-clamp-2 leading-tight">
                        {info.desc}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Key Selling Points / Highlights */}
          <div>
            <label className="block text-sm font-semibold text-slate-200 mb-1.5">
              4. จุดเด่นสินค้า / สโลแกน / สรรพคุณ (Key Selling Points)
            </label>
            <textarea
              value={highlights}
              onChange={(e) => setHighlights(e.target.value)}
              rows={3}
              placeholder="ระบุจุดเด่น 2-4 ข้อ คั่นด้วยลูกน้ำ เช่น ขนาดกะทัดรัดพกง่าย, แบตเตอรี่อึดใช้งานได้ทั้งวัน, รับประกันศูนย์ 1 ปี"
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition resize-none text-sm leading-relaxed"
            />
          </div>

          {/* Image Uploads */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-semibold text-slate-200">
                5. รูปภาพสินค้า (1 - 5 รูป) <span className="text-orange-500">*</span>
              </label>
              <span className="text-xs text-slate-400">
                {previewUrls.length} / 5 ภาพที่เลือก
              </span>
            </div>

            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-slate-700 hover:border-orange-500 bg-slate-950/60 rounded-xl p-5 text-center cursor-pointer transition group"
            >
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                multiple
                accept="image/*"
                className="hidden"
              />
              <div className="flex flex-col items-center justify-center gap-2">
                <div className="w-10 h-10 rounded-full bg-orange-950/60 border border-orange-700/60 flex items-center justify-center group-hover:scale-110 transition">
                  <Upload className="w-5 h-5 text-orange-400" />
                </div>
                <div className="text-sm font-medium text-slate-300">
                  คลิกเพื่ออัปโหลดรูปภาพสินค้าจากเครื่องของคุณ
                </div>
                <div className="text-xs text-slate-500">
                  รองรับ JPG, PNG, WebP (ถอดรหัสและตรวจสอบความสมบูรณ์อัตโนมัติด้วย Sharp)
                </div>
              </div>
            </div>

            {/* Thumbnails list */}
            {previewUrls.length > 0 && (
              <div className="grid grid-cols-5 gap-3 mt-3">
                {previewUrls.map((url, idx) => (
                  <div
                    key={idx}
                    className="relative group rounded-lg overflow-hidden border border-slate-700 bg-slate-950 aspect-square flex items-center justify-center"
                  >
                    <img
                      src={url}
                      alt={`Preview ${idx + 1}`}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute top-1 left-1 bg-black/70 text-[10px] font-bold text-white px-1.5 py-0.5 rounded">
                      #{idx + 1}
                    </div>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRemoveImage(idx);
                      }}
                      className="absolute top-1 right-1 bg-red-600/90 hover:bg-red-600 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition shadow"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* CTA Text */}
          <div>
            <label className="block text-sm font-semibold text-slate-200 mb-1.5">
              6. ข้อความ Call To Action (ชวนสั่งซื้อ)
            </label>
            <input
              type="text"
              value={cta}
              onChange={(e) => setCta(e.target.value)}
              placeholder="เช่น พิกัดในตะกร้าส้มซ้ายล่าง, กดซื้อที่ลิงก์หน้าโปรไฟล์"
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition text-sm"
            />
          </div>

          {/* Review Screen Checklist (Section 8.2) */}
          {activeDraft && (
            <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-3">
              <div className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>Checklist ตรวจสอบความถูกต้องก่อนสร้างสคริปต์ (จำเป็นต้องติ๊กให้ครบ):</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs text-slate-300">
                <label className="flex items-center gap-2 cursor-pointer bg-slate-900/60 p-2 rounded-lg border border-slate-800 hover:border-slate-700">
                  <input
                    type="checkbox"
                    checked={checklist.nameOk}
                    onChange={(e) => setChecklist({ ...checklist, nameOk: e.target.checked })}
                    className="checkbox checkbox-primary checkbox-xs rounded"
                  />
                  <span>1. ชื่อสินค้าถูกต้อง</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer bg-slate-900/60 p-2 rounded-lg border border-slate-800 hover:border-slate-700">
                  <input
                    type="checkbox"
                    checked={checklist.priceOk}
                    onChange={(e) => setChecklist({ ...checklist, priceOk: e.target.checked })}
                    className="checkbox checkbox-primary checkbox-xs rounded"
                  />
                  <span>2. ราคาถูกต้องและเป็นราคาปัจจุบัน</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer bg-slate-900/60 p-2 rounded-lg border border-slate-800 hover:border-slate-700">
                  <input
                    type="checkbox"
                    checked={checklist.imageOk}
                    onChange={(e) => setChecklist({ ...checklist, imageOk: e.target.checked })}
                    className="checkbox checkbox-primary checkbox-xs rounded"
                  />
                  <span>3. รูปตรงกับสินค้าจริง</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer bg-slate-900/60 p-2 rounded-lg border border-slate-800 hover:border-slate-700">
                  <input
                    type="checkbox"
                    checked={checklist.claimsOk}
                    onChange={(e) => setChecklist({ ...checklist, claimsOk: e.target.checked })}
                    className="checkbox checkbox-primary checkbox-xs rounded"
                  />
                  <span>4. ข้อความโฆษณาไม่เกินจริง / ปลอดภัย</span>
                </label>
              </div>
            </div>
          )}

          {/* Submit Button */}
          <div className="space-y-1.5">
            <button
              type="submit"
              disabled={
                isLoading ||
                (activeDraft !== null &&
                  (!isChecklistComplete ||
                    !name.trim() ||
                    !price.trim() ||
                    previewUrls.length === 0))
              }
              className={`w-full text-white font-bold py-3.5 px-6 rounded-xl flex items-center justify-center gap-2 shadow-lg disabled:opacity-40 disabled:cursor-not-allowed text-base cursor-pointer transition ${
                activeDraft ? "btn btn-primary" : "shopee-gradient-btn"
              }`}
            >
              {isLoading ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>กำลังวิเคราะห์และสร้าง Storyboard ด้วย Gemini AI...</span>
                </>
              ) : (
                <>
                  <Wand2 className="w-5 h-5" />
                  <span>
                    {activeDraft
                      ? "✅ ยืนยันข้อมูล & สร้าง AI Storyboard (ไป Step 2)"
                      : "บันทึกสินค้า & สร้าง AI Script + Storyboard ทันที"}
                  </span>
                </>
              )}
            </button>

            {activeDraft &&
              (!isChecklistComplete ||
                !name.trim() ||
                !price.trim() ||
                previewUrls.length === 0) && (
                <p className="text-center text-xs text-amber-400/80">
                  * กรุณาตรวจข้อมูล ติ๊ก Checklist ให้ครบทั้ง 4 ข้อ และมีรูปสินค้าอย่างน้อย 1 ภาพก่อนกดยืนยัน
                </p>
              )}
          </div>
        </form>
      </div>
    </div>
  );
};
