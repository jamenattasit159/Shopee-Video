// src/components/ProductForm.tsx
"use client";

import {
  AlertTriangle,
  Camera,
  CheckCircle2,
  Dices,
  ExternalLink,
  FileText,
  HelpCircle,
  Loader2,
  Package,
  Palette,
  RotateCcw,
  Search,
  Sparkles,
  Tag,
  Trash2,
  Undo2,
  Upload,
  Wand2,
  Zap,
} from "lucide-react";
import React, { useRef, useState } from "react";
import { PackId, ProductRecord } from "../../remotion/types";
import { ALL_PACK_IDS, PACK_INFO, rerollClientStyleDNA } from "../lib/styleConstants";
import { FieldSource, FieldStatus, ProductDraft } from "../lib/types";
import { LinkImport } from "./LinkImport";
import { apiFetch } from "@/lib/apiFetch";

interface ProductFormProps {
  initialProduct?: ProductRecord | null;
  onProductCreated: (product: ProductRecord, keptStoryboard?: boolean) => void;
  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;
  onCancelNew?: () => void;
}

export const ProductForm: React.FC<ProductFormProps> = ({
  initialProduct,
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
  const [chosenPack, setChosenPack] = useState<PackId>("pro-minimal-luxury");
  const [aiProvider, setAiProvider] = useState<"claude" | "gemini">("claude");

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
  const [previewKinds, setPreviewKinds] = useState<Array<"image" | "video">>([]);
  const [useSampleImages, setUseSampleImages] = useState(false);
  const [keepStoryboardOnSave, setKeepStoryboardOnSave] = useState<boolean>(false);

  // Sync form fields when user selects an existing product to edit or add images/videos in Step 1
  React.useEffect(() => {
    if (initialProduct) {
      setActiveDraft(null);
      setName(initialProduct.name || "");
      setPrice(initialProduct.price || "");
      setHighlights(initialProduct.highlights || "");
      setTone(initialProduct.tone || "exciting");
      setCta(initialProduct.cta || "พิกัดในตะกร้าส้มซ้ายล่าง");
      if (initialProduct.styleDNA?.pack) {
        setChosenPack(initialProduct.styleDNA.pack);
      }
      const imgs = initialProduct.images || [];
      setPreviewUrls(imgs);
      setPreviewKinds(
        imgs.map((u) => (/\.(mp4|mov|webm|m4v)(\?|$)/i.test(u) ? "video" : "image"))
      );
      setSelectedFiles([]);
      setUseSampleImages(false);
      setFieldSources({ name: "user", price: "user" });
      setFieldStatuses({ name: "ok", price: "ok" });
      setChecklist({ nameOk: true, priceOk: true, imageOk: imgs.length > 0, claimsOk: true });
    }
  }, [initialProduct?.id]);

  // OCR Loading state
  const [isOcrLoading, setIsOcrLoading] = useState(false);

  // Humanizer state (blader/humanizer principles)
  const [isHumanizing, setIsHumanizing] = useState(false);
  const [humanizeHistory, setHumanizeHistory] = useState<{
    originalHighlights: string;
    originalName: string;
    explanation: string;
  } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const ocrInputRef = useRef<HTMLInputElement>(null);

  const handleHumanizeCopy = async () => {
    const textToClean = highlights.trim() || name.trim();
    if (!textToClean) {
      alert("กรุณากรอกหรือวางข้อความสินค้าที่ copy มาก่อนกดปรับคำครับ");
      return;
    }

    setIsHumanizing(true);
    try {
      const json = await apiFetch<any>("/api/humanize-text", {
        method: "POST",
        body: { rawText: textToClean },
      });

      if (json && json.success && json.data) {
        setHumanizeHistory({
          originalHighlights: highlights,
          originalName: name,
          explanation: json.data.explanation,
        });

        if (json.data.humanizedHighlights) {
          setHighlights(json.data.humanizedHighlights);
        }

        // Auto-fill or improve product title if empty or short
        if (!name.trim() || name.length < 6) {
          if (json.data.suggestedName) {
            setName(json.data.suggestedName);
            setFieldSources((p) => ({ ...p, name: "gemini" }));
            setFieldStatuses((p) => ({ ...p, name: "ok" }));
            setChecklist((p) => ({ ...p, nameOk: true }));
          }
        }
      }
    } catch (err: any) {
      console.error("Humanize error:", err);
    } finally {
      setIsHumanizing(false);
    }
  };

  const handleUndoHumanize = () => {
    if (humanizeHistory) {
      setHighlights(humanizeHistory.originalHighlights);
      if (humanizeHistory.originalName) {
        setName(humanizeHistory.originalName);
      }
      setHumanizeHistory(null);
    }
  };

  const getSourceLabel = (src: FieldSource | null): string => {
    switch (src) {
      case "share-text":
        return "ข้อความแชร์";
      case "redirect-url":
        return "ลิงก์ Shopee";
      case "affiliate-api":
        return "ข้อมูลจาก Shopee";
      case "gemini":
        return "วิเคราะห์ด้วย AI";
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
      const incoming = Array.from(e.target.files);
      const existingServerUrls = useSampleImages
        ? []
        : previewUrls.filter((u) => !u.startsWith("blob:"));
      const maxNewFiles = Math.max(0, 8 - existingServerUrls.length);
      const combinedNewFiles = (useSampleImages ? incoming : [...selectedFiles, ...incoming]).slice(
        0,
        maxNewFiles
      );
      setSelectedFiles(combinedNewFiles);
      setUseSampleImages(false);

      const newObjectUrls = combinedNewFiles.map((file) => URL.createObjectURL(file));
      const allUrls = [...existingServerUrls, ...newObjectUrls].slice(0, 8);
      const allKinds: Array<"image" | "video"> = [
        ...existingServerUrls.map((u) =>
          /\.(mp4|mov|webm|m4v)(\?|$)/i.test(u) ? ("video" as const) : ("image" as const)
        ),
        ...combinedNewFiles.map((file) =>
          file.type.startsWith("video/") || /\.(mp4|mov|webm|m4v)$/i.test(file.name)
            ? ("video" as const)
            : ("image" as const)
        ),
      ].slice(0, 8);

      setPreviewUrls(allUrls);
      setPreviewKinds(allKinds);
      setChecklist((p) => ({ ...p, imageOk: true }));
    }
  };

  const handleRemoveImage = (index: number) => {
    const targetUrl = previewUrls[index];
    const updatedPreviews = previewUrls.filter((_, i) => i !== index);
    const updatedKinds = previewKinds.filter((_, i) => i !== index);
    if (targetUrl && targetUrl.startsWith("blob:")) {
      const blobUrlsBefore = previewUrls.slice(0, index).filter((u) => u.startsWith("blob:")).length;
      setSelectedFiles((prev) => prev.filter((_, i) => i !== blobUrlsBefore));
    }
    setPreviewUrls(updatedPreviews);
    setPreviewKinds(updatedKinds);
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

      const data = await apiFetch<any>("/api/ocr-screenshot", {
        method: "POST",
        body: fd,
      });

      if (data && data.ok && data.data) {
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
      }
    } catch (err: any) {
      console.error("OCR error:", err);
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
      if (initialProduct?.id) {
        formData.append("id", initialProduct.id);
      }
      if (keepStoryboardOnSave && initialProduct) {
        formData.append("keepStoryboard", "true");
      }
      formData.append("name", name);
      formData.append("price", price || "฿199");
      formData.append("highlights", highlights || "สินค้าคุณภาพ คุ้มค่าเกินราคา");
      formData.append("tone", tone);
      formData.append("cta", cta || "พิกัดในตะกร้าส้มซ้ายล่าง");
      formData.append("aiProvider", aiProvider);
      formData.append("styleMode", styleMode);
      formData.append("chosenPack", chosenPack);

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

      const serverUrls = previewUrls.filter((u) => !u.startsWith("blob:"));
      if (serverUrls.length > 0) {
        formData.append("existingImages", JSON.stringify(serverUrls));
      } else if (selectedFiles.length === 0) {
        formData.append(
          "existingImages",
          JSON.stringify(["/samples/tumbler-1.svg", "/samples/tumbler-2.svg", "/samples/tumbler-3.svg"])
        );
      }
      selectedFiles.forEach((file) => {
        formData.append("files", file);
      });

      const data = await apiFetch<any>("/api/products", {
        method: "POST",
        body: formData,
      });

      if (data && data.success && data.product) {
        onProductCreated(data.product, keepStoryboardOnSave && !!initialProduct);
      }
    } catch (err: any) {
      console.error("Product submit error:", err);
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
      <div className="bg-base-100 border border-base-300 rounded-2xl p-6 shadow-xs space-y-6 relative">
        {/* Top Banner & Mode Controls */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-5 border-b border-base-300 gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-primary bg-primary/10 border border-primary/20 px-2.5 py-1 rounded-full uppercase tracking-wider">
                {activeDraft ? "Review & Confirm" : "Step 1: Input & Uploads"}
              </span>
              <span
                className={`text-xs font-semibold px-2.5 py-0.5 rounded-full flex items-center gap-1.5 ${
                  activeDraft
                    ? "text-warning bg-warning/10 border border-warning/20"
                    : "text-success bg-success/10 border border-success/20"
                }`}
              >
                <span
                  className={`w-1.5 h-1.5 rounded-full animate-pulse ${
                    activeDraft ? "bg-warning" : "bg-success"
                  }`}
                />
                {activeDraft ? "ตรวจสอบร่างข้อมูลก่อนสร้างคลิป" : "พร้อมสร้างสินค้าใหม่"}
              </span>
            </div>
            <h2 className="text-xl font-bold text-base-content mt-1.5 flex items-center gap-2">
              {activeDraft ? (
                <>
                  <Search className="w-5 h-5 text-primary" />
                  <span>ตรวจสอบและยืนยันข้อมูลสินค้า (Review Screen)</span>
                </>
              ) : (
                <>
                  <Package className="w-5 h-5 text-primary" />
                  <span>กรอกข้อมูลสินค้าเพื่อสร้างคลิปใหม่</span>
                </>
              )}
            </h2>
          </div>

          {/* Quick Action Buttons */}
          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={handleClearForm}
              className="btn btn-ghost btn-xs text-base-content/70 hover:text-base-content rounded-xl border border-base-300 gap-1.5"
              title="ล้างข้อความทั้งหมดในฟอร์มเพื่อกรอกใหม่"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>ล้างฟอร์มว่าง</span>
            </button>

            <button
              type="button"
              onClick={() => loadPreset("tumbler")}
              className="btn btn-outline btn-primary btn-xs rounded-xl gap-1.5"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>โหลดสินค้าตัวอย่าง</span>
            </button>
          </div>
        </div>

        {/* Review Screen Header Info (When activeDraft is present) */}
        {activeDraft && (
          <div className="bg-warning/5 border border-warning/20 rounded-xl p-4 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
              <div className="flex items-center gap-2 truncate">
                <span className="text-base-content/60 shrink-0">ลิงก์ต้นฉบับ:</span>
                <span className="text-base-content truncate font-mono">
                  {activeDraft.originalUrl}
                </span>
                <a
                  href={activeDraft.originalUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-ghost btn-xs text-primary hover:underline flex items-center gap-1 shrink-0"
                >
                  <span>เปิดดูหน้าสินค้าจริง</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
              <div className="text-base-content/60 shrink-0">
                ดึงข้อมูลเมื่อ:{" "}
                <span className="text-base-content font-medium">
                  {new Date(activeDraft.fetchedAt).toLocaleTimeString("th-TH")}
                </span>
              </div>
            </div>

            <div className="alert alert-warning py-2.5 px-3 text-xs rounded-xl flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>
                <strong>โปรดทราบ:</strong> ราคาและโปรโมชันอาจเปลี่ยนแปลงตามเวลา
                กรุณาตรวจสอบความถูกต้องก่อนกดยืนยันเรนเดอร์คลิป
              </span>
            </div>

            {/* Warnings list if any */}
            {activeDraft.warnings && activeDraft.warnings.length > 0 && (
              <div className="bg-warning/10 border border-warning/20 rounded-xl p-3 text-xs space-y-1">
                <div className="font-semibold text-warning-content flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  <span>ข้อสังเกตจากระบบ:</span>
                </div>
                <ul className="list-disc list-inside text-base-content/80 space-y-0.5">
                  {activeDraft.warnings.map((w, idx) => (
                    <li key={idx}>{w}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Tier 4: Screenshot OCR Fallback Button */}
            <div className="flex items-center justify-between pt-1 border-t border-base-300">
              <span className="text-xs text-base-content/60">
                หากช่องใดขาดข้อมูล สามารถให้ AI ช่วยอ่านจากรูปภาพหน้าจอได้:
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
                  className="btn btn-xs btn-outline rounded-lg gap-1.5"
                >
                  {isOcrLoading ? (
                    <>
                      <Loader2 className="w-3 h-3 animate-spin text-primary" />
                      <span>กำลังอ่านภาพ...</span>
                    </>
                  ) : (
                    <>
                      <Camera className="w-3 h-3 text-primary" />
                      <span>อัปโหลดภาพหน้าจอสินค้า (OCR)</span>
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
              <label className="text-sm font-semibold text-base-content flex items-center gap-2">
                <span>1. ชื่อสินค้า (Product Name)</span>
                <span className="text-error">*</span>
              </label>

              {/* Status Badge */}
              {activeDraft && (
                <span
                  className={`badge text-[10px] font-semibold ${
                    fieldStatuses.name === "ok"
                      ? "badge-success"
                      : fieldStatuses.name === "review"
                      ? "badge-warning"
                      : "badge-error"
                  }`}
                >
                  {fieldStatuses.name === "ok" && `ดึงได้ (${getSourceLabel(fieldSources.name)})`}
                  {fieldStatuses.name === "review" && `ควรตรวจ (${getSourceLabel(fieldSources.name)})`}
                  {fieldStatuses.name === "missing" && "ไม่พบ (ต้องกรอกเอง)"}
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
              className="input input-bordered w-full rounded-xl bg-base-100 text-base-content border-base-300 focus:border-primary text-sm shadow-xs"
              required
            />
          </div>

          {/* Price & Highlight Row */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-sm font-semibold text-base-content">
                  2. ราคาและโปรโมชั่น (Price & Deal) <span className="text-error">*</span>
                </label>

                {/* Price Status Badge */}
                {activeDraft && (
                  <span
                    className={`badge text-[10px] font-semibold ${
                      fieldStatuses.price === "ok"
                        ? "badge-success"
                        : fieldStatuses.price === "review"
                        ? "badge-warning"
                        : "badge-error"
                    }`}
                  >
                    {fieldStatuses.price === "ok" && `ดึงได้ (${getSourceLabel(fieldSources.price)})`}
                    {fieldStatuses.price === "review" && `ควรตรวจ (${getSourceLabel(fieldSources.price)})`}
                    {fieldStatuses.price === "missing" && "ไม่พบ (ต้องกรอกเอง)"}
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
                className="input input-bordered w-full rounded-xl bg-base-100 text-base-content border-base-300 focus:border-primary text-sm shadow-xs"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-base-content mb-1.5">
                3. สไตล์ / อารมณ์ของวิดีโอ (Video Tone)
              </label>
              <select
                value={tone}
                onChange={(e) => setTone(e.target.value)}
                className="select select-bordered w-full rounded-xl bg-base-100 text-base-content border-base-300 focus:border-primary text-sm shadow-xs"
              >
                <option value="exciting">สายป้ายยา ตื่นเต้น เร้าใจ (Viral Hook)</option>
                <option value="minimal">มินิมอล คลีนๆ สไตล์มูจิ (Minimal Aesthetic)</option>
                <option value="problem_solving">เน้นแก้ปัญหา ก่อน-หลัง (Pain Point / Before-After)</option>
                <option value="promo">จัดโปรโมชั่น Flash Sale ลดกระหน่ำ (Urgent Deal)</option>
              </select>
            </div>
          </div>

          {/* AI Creative Director Model Selection */}
          <div className="bg-base-200/50 border border-base-300 rounded-2xl p-4 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <label className="text-sm font-semibold text-base-content flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-primary" />
                <span>AI Creative Director (โมเดลคิดบท & สตอรี่บอร์ด)</span>
              </label>
              <span className="text-[11px] font-medium text-base-content/60 bg-base-100 border border-base-300 px-2 py-0.5 rounded-full">
                เสียงพากย์ใช้ระบบโคลนเสียง AI เสมอ
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => setAiProvider("claude")}
                className={`p-3 rounded-xl border text-left transition flex items-start gap-3 ${
                  aiProvider === "claude"
                    ? "bg-base-100 border-2 border-primary shadow-xs ring-2 ring-primary/20"
                    : "bg-base-100 border-base-300 hover:border-primary/40 text-base-content"
                }`}
              >
                <div className="w-8 h-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0 mt-0.5">
                  <Sparkles className="w-4 h-4 text-primary" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-base-content">AI บทสร้างสรรค์</span>
                    <span className="badge badge-primary badge-xs text-[10px]">แนะนำ ไวรัล</span>
                  </div>
                  <p className="text-[11px] text-base-content/60 mt-0.5 leading-snug">
                    ฮุคแรง หยุดดูใน 2 วินาที สคริปต์สไตล์ครีเอเตอร์สายป้ายยาตัวแม่
                  </p>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setAiProvider("gemini")}
                className={`p-3 rounded-xl border text-left transition flex items-start gap-3 ${
                  aiProvider === "gemini"
                    ? "bg-base-100 border-2 border-secondary shadow-xs ring-2 ring-secondary/20"
                    : "bg-base-100 border-base-300 hover:border-secondary/40 text-base-content"
                }`}
              >
                <div className="w-8 h-8 rounded-lg bg-secondary/10 border border-secondary/20 flex items-center justify-center shrink-0 mt-0.5">
                  <Zap className="w-4 h-4 text-secondary" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-base-content">AI บทรวดเร็ว</span>
                    <span className="badge badge-ghost badge-xs text-[10px]">รวดเร็ว</span>
                  </div>
                  <p className="text-[11px] text-base-content/60 mt-0.5 leading-snug">
                    ประมวลผลฉับไว โฟกัสจุดเด่นสินค้าครบถ้วน สื่อสารกระชับ
                  </p>
                </div>
              </button>
            </div>
          </div>

          {/* Video Style Selection (Anti-Repetition / Style Pack) */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-semibold text-base-content">
                สไตล์วิดีโอ (Video Style Pack)
              </label>
              <div className="join border border-base-300 bg-base-100 rounded-xl p-0.5">
                <button
                  type="button"
                  onClick={() => setStyleMode("auto")}
                  className={`join-item btn btn-xs gap-1.5 ${
                    styleMode === "auto"
                      ? "btn-primary font-semibold"
                      : "btn-ghost text-base-content/70"
                  }`}
                >
                  <Dices className="w-3.5 h-3.5" />
                  <span>สุ่มให้ (แนะนำ)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setStyleMode("custom")}
                  className={`join-item btn btn-xs gap-1.5 ${
                    styleMode === "custom"
                      ? "btn-primary font-semibold"
                      : "btn-ghost text-base-content/70"
                  }`}
                >
                  <Palette className="w-3.5 h-3.5" />
                  <span>เลือกเอง</span>
                </button>
              </div>
            </div>

            {styleMode === "auto" ? (
              <div className="bg-base-200/50 border border-base-300 rounded-xl p-3.5 text-xs text-base-content/70 flex items-center gap-3 shadow-xs">
                <Sparkles className="w-5 h-5 text-primary shrink-0" />
                <div>
                  <strong className="text-base-content font-semibold">
                    ระบบคัดสรรสไตล์อัตโนมัติ (Anti-Repetition Engine):
                  </strong>
                  <p className="mt-0.5 text-base-content/60">
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
                          ? "bg-primary/5 border-2 border-primary text-base-content shadow-xs ring-1 ring-primary/30"
                          : "bg-base-100 border-base-300 text-base-content/80 hover:border-base-content/30 hover:bg-base-200/50"
                      }`}
                    >
                      <div className="flex items-center gap-1.5 font-bold">
                        <span className="truncate">{info.name}</span>
                      </div>
                      <div className="text-[11px] text-base-content/60 line-clamp-2 leading-tight">
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
            <div className="flex flex-wrap items-center justify-between gap-2 mb-1.5">
              <label className="block text-sm font-semibold text-base-content">
                4. จุดเด่นสินค้า / สโลแกน / สรรพคุณ (Key Selling Points)
              </label>

              <div className="flex items-center gap-2">
                {humanizeHistory && (
                  <button
                    type="button"
                    onClick={handleUndoHumanize}
                    className="btn btn-ghost btn-xs text-base-content/60 hover:text-base-content gap-1 text-[11px]"
                    title="ย้อนกลับเป็นข้อความเดิมที่เคยก๊อปปี้มา"
                  >
                    <Undo2 className="w-3 h-3" />
                    <span>ย้อนกลับข้อความเดิม</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={handleHumanizeCopy}
                  disabled={isHumanizing || (!highlights.trim() && !name.trim())}
                  className="btn btn-xs btn-outline btn-secondary rounded-lg gap-1.5 font-medium transition disabled:opacity-50"
                  title="เกลาคำที่ copy มา (เช่น แปลจีน หรือ bullet แข็งๆ) ให้เป็นภาษาพูดรีวิวธรรมชาติสไตล์ Humanizer"
                >
                  {isHumanizing ? (
                    <>
                      <Loader2 className="w-3 h-3 animate-spin text-secondary" />
                      <span>กำลังเกลาสำนวน...</span>
                    </>
                  ) : (
                    <>
                      <Wand2 className="w-3 h-3 text-secondary" />
                      <span>ปรับคำให้เป็นธรรมชาติ (Humanize)</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            <textarea
              value={highlights}
              onChange={(e) => setHighlights(e.target.value)}
              rows={3}
              placeholder="วางข้อมูลสินค้าที่ copy มาได้เลย เช่น มือตบกล่อมนอน มีแบตในตัว ถอดซักได้... แล้วคลิก 'ปรับคำให้เป็นธรรมชาติ' ได้ทันที"
              className="textarea textarea-bordered w-full rounded-xl bg-base-100 text-base-content border-base-300 focus:border-primary resize-none text-sm leading-relaxed shadow-xs"
            />

            {humanizeHistory && (
              <div className="mt-1.5 flex items-center justify-between text-xs text-success bg-success/10 border border-success/20 rounded-lg px-2.5 py-1.5">
                <span className="flex items-center gap-1.5 truncate">
                  <CheckCircle2 className="w-3.5 h-3.5 text-success shrink-0" />
                  <span className="truncate">{humanizeHistory.explanation}</span>
                </span>
                <span className="text-[10px] text-success font-semibold uppercase tracking-wider shrink-0 ml-2">
                  Humanized
                </span>
              </div>
            )}
          </div>

          {/* Image & Video Clip Uploads */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-semibold text-base-content">
                5. รูปภาพและคลิปวิดีโอสินค้า (ใส่ผสมกันได้ 1 - 8 ไฟล์) <span className="text-error">*</span>
              </label>
              <span className="text-xs text-base-content/60 font-medium">
                {previewUrls.length} / 8 ไฟล์ที่เลือก
              </span>
            </div>

            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-base-300 hover:border-primary bg-base-200/40 hover:bg-base-200/70 rounded-2xl p-5 text-center cursor-pointer transition group shadow-xs"
            >
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                multiple
                accept="image/jpeg,image/png,image/webp,video/mp4,video/quicktime,video/webm,.mp4,.mov,.webm"
                className="hidden"
              />
              <div className="flex flex-col items-center justify-center gap-2">
                <div className="w-10 h-10 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center group-hover:scale-105 transition shadow-xs">
                  <Upload className="w-5 h-5 text-primary" />
                </div>
                <div className="text-sm font-semibold text-base-content">
                  คลิกเพื่ออัปโหลด รูปภาพสินค้า หรือ คลิปวิดีโอรีวิว (ใส่รวมกันได้เลย)
                </div>
                <div className="text-xs text-base-content/60">
                  รองรับรูปภาพ (JPG, PNG, WebP) และคลิปวิดีโอ (MP4, MOV, WebM) สามารถเลือกตัดช่วงคลิปใน Step 2 ได้
                </div>
              </div>
            </div>

            {/* Thumbnails list */}
            {previewUrls.length > 0 && (
              <div className="grid grid-cols-4 sm:grid-cols-4 md:grid-cols-8 gap-3 mt-3">
                {previewUrls.map((url, idx) => {
                  const isVid = previewKinds[idx] === "video" || /\.(mp4|mov|webm|m4v)(\?|$)/i.test(url);
                  return (
                  <div
                    key={idx}
                    className="relative group rounded-xl overflow-hidden border border-base-300 shadow-sm bg-base-200 aspect-square flex items-center justify-center transition-transform hover:-translate-y-0.5"
                  >
                    {isVid ? (
                      <video
                        src={url}
                        muted
                        loop
                        autoPlay
                        playsInline
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <img
                        src={url}
                        alt={`Preview ${idx + 1}`}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          console.warn(`Preview image load error for ${url}`);
                          (e.currentTarget as HTMLImageElement).src = "/samples/tumbler-1.svg";
                        }}
                      />
                    )}
                    <div className="absolute top-1 left-1 bg-neutral/85 text-[10px] font-bold text-neutral-content px-1.5 py-0.5 rounded shadow-xs flex items-center gap-1">
                      <span>#{idx + 1}</span>
                      {isVid && <span className="text-info">🎬 คลิป</span>}
                    </div>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRemoveImage(idx);
                      }}
                      className="absolute top-1 right-1 btn btn-circle btn-error btn-xs opacity-0 group-hover:opacity-100 transition shadow"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* CTA Text */}
          <div>
            <label className="block text-sm font-semibold text-base-content mb-1.5">
              6. ข้อความ Call To Action (ชวนสั่งซื้อ)
            </label>
            <input
              type="text"
              value={cta}
              onChange={(e) => setCta(e.target.value)}
              placeholder="เช่น พิกัดในตะกร้าส้มซ้ายล่าง, กดซื้อที่ลิงก์หน้าโปรไฟล์"
              className="input input-bordered w-full rounded-xl bg-base-100 text-base-content border-base-300 focus:border-primary text-sm shadow-xs"
            />
          </div>

          {/* Review Screen Checklist (Section 8.2) */}
          {activeDraft && (
            <div className="bg-base-200/50 border border-base-300 rounded-xl p-4 space-y-3 shadow-xs">
              <div className="text-xs font-semibold text-base-content flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-success" />
                <span>Checklist ตรวจสอบความถูกต้องก่อนสร้างสคริปต์ (จำเป็นต้องติ๊กให้ครบ):</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs text-base-content/80">
                <label className="flex items-center gap-2 cursor-pointer bg-base-100 p-2.5 rounded-xl border border-base-300 hover:border-base-content/30 shadow-xs">
                  <input
                    type="checkbox"
                    checked={checklist.nameOk}
                    onChange={(e) => setChecklist({ ...checklist, nameOk: e.target.checked })}
                    className="checkbox checkbox-primary checkbox-xs rounded"
                  />
                  <span>1. ชื่อสินค้าถูกต้อง</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer bg-base-100 p-2.5 rounded-xl border border-base-300 hover:border-base-content/30 shadow-xs">
                  <input
                    type="checkbox"
                    checked={checklist.priceOk}
                    onChange={(e) => setChecklist({ ...checklist, priceOk: e.target.checked })}
                    className="checkbox checkbox-primary checkbox-xs rounded"
                  />
                  <span>2. ราคาถูกต้องและเป็นราคาปัจจุบัน</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer bg-base-100 p-2.5 rounded-xl border border-base-300 hover:border-base-content/30 shadow-xs">
                  <input
                    type="checkbox"
                    checked={checklist.imageOk}
                    onChange={(e) => setChecklist({ ...checklist, imageOk: e.target.checked })}
                    className="checkbox checkbox-primary checkbox-xs rounded"
                  />
                  <span>3. รูปตรงกับสินค้าจริง</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer bg-base-100 p-2.5 rounded-xl border border-base-300 hover:border-base-content/30 shadow-xs">
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

          {/* Submit Buttons */}
          <div className="space-y-2.5">
            {initialProduct && !activeDraft && (
              <button
                type="submit"
                disabled={isLoading}
                onClick={() => setKeepStoryboardOnSave(true)}
                className="btn btn-success text-white w-full py-3.5 px-6 rounded-xl flex items-center justify-center gap-2 shadow-md text-base cursor-pointer font-bold"
              >
                <CheckCircle2 className="w-5 h-5" />
                <span>บันทึกการแก้ไขข้อมูล & รูป/คลิป (คงบทพากย์และสตอรี่บอร์ดเดิม)</span>
              </button>
            )}
            <button
              type="submit"
              onClick={() => setKeepStoryboardOnSave(false)}
              disabled={
                isLoading ||
                (activeDraft !== null &&
                  (!isChecklistComplete ||
                    !name.trim() ||
                    !price.trim() ||
                    previewUrls.length === 0))
              }
              className="btn btn-primary w-full py-3.5 px-6 rounded-xl flex items-center justify-center gap-2 shadow-md disabled:opacity-40 disabled:cursor-not-allowed text-base cursor-pointer"
            >
              {isLoading ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>กำลังวิเคราะห์และสร้างสตอรี่บอร์ดด้วย AI...</span>
                </>
              ) : (
                <>
                  <Wand2 className="w-5 h-5" />
                  <span>
                    {activeDraft
                      ? "ยืนยันข้อมูล & สร้าง AI Storyboard (ไป Step 2)"
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
                <p className="text-center text-xs text-warning font-medium">
                  * กรุณาตรวจข้อมูล ติ๊ก Checklist ให้ครบทั้ง 4 ข้อ และมีรูปสินค้าอย่างน้อย 1 ภาพก่อนกดยืนยัน
                </p>
              )}
          </div>
        </form>
      </div>
    </div>
  );
};
