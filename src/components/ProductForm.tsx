"use client";

import {
  FileText,
  HelpCircle,
  RotateCcw,
  Sparkles,
  Tag,
  Trash2,
  Upload,
  Wand2,
} from "lucide-react";
import React, { useRef, useState } from "react";
import { ProductRecord } from "../../remotion/types";

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
  // Input fields
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [highlights, setHighlights] = useState("");
  const [tone, setTone] = useState("exciting");
  const [cta, setCta] = useState("พิกัดในตะกร้าส้มซ้ายล่าง รีบกดก่อนโค้ดหมด!");

  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);
  const [useSampleImages, setUseSampleImages] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Quick preset templates for easy testing
  const loadPreset = (category: "tumbler" | "earbuds" | "skincare") => {
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
  };

  const handleClearForm = () => {
    setName("");
    setPrice("");
    setHighlights("");
    setTone("exciting");
    setCta("พิกัดในตะกร้าส้มซ้ายล่าง");
    setSelectedFiles([]);
    setPreviewUrls([]);
    setUseSampleImages(false);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const filesArray = Array.from(e.target.files).slice(0, 5);
      setSelectedFiles(filesArray);
      setUseSampleImages(false);

      const objectUrls = filesArray.map((file) => URL.createObjectURL(file));
      setPreviewUrls(objectUrls);
    }
  };

  const handleRemoveImage = (index: number) => {
    const updatedPreviews = previewUrls.filter((_, i) => i !== index);
    const updatedFiles = selectedFiles.filter((_, i) => i !== index);
    setPreviewUrls(updatedPreviews);
    setSelectedFiles(updatedFiles);
    if (updatedPreviews.length === 0) {
      setUseSampleImages(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return alert("กรุณาระบุชื่อสินค้า");
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
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6">
      {/* Top Banner & Mode Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-5 border-b border-slate-800 gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-orange-400 bg-orange-950/60 border border-orange-800/60 px-2.5 py-1 rounded-full uppercase tracking-wider">
              Step 1: Input & Uploads
            </span>
            <span className="text-xs font-semibold text-emerald-400 bg-emerald-950/50 border border-emerald-800/60 px-2 py-0.5 rounded-full flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              พร้อมสร้างสินค้าใหม่
            </span>
          </div>
          <h2 className="text-xl font-bold text-white mt-1.5 flex items-center gap-2">
            <span>📦 กรอกข้อมูลสินค้าเพื่อสร้างคลิปใหม่</span>
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

      {/* Preset Category Shortcuts */}
      <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
        <span className="text-slate-400 font-medium flex items-center gap-1.5">
          <Tag className="w-3.5 h-3.5 text-orange-400" />
          <span>หรือเลือกเทมเพลตสำเร็จรูปด่วน:</span>
        </span>
        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={() => loadPreset("tumbler")}
            className="bg-slate-900 hover:bg-slate-800 text-slate-300 px-2.5 py-1 rounded-lg border border-slate-700 transition"
          >
            🥤 แก้วเก็บความเย็น
          </button>
          <button
            type="button"
            onClick={() => loadPreset("earbuds")}
            className="bg-slate-900 hover:bg-slate-800 text-slate-300 px-2.5 py-1 rounded-lg border border-slate-700 transition"
          >
            🎧 หูฟังบลูทูธ
          </button>
          <button
            type="button"
            onClick={() => loadPreset("skincare")}
            className="bg-slate-900 hover:bg-slate-800 text-slate-300 px-2.5 py-1 rounded-lg border border-slate-700 transition"
          >
            ✨ สกินแคร์เซรั่ม
          </button>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Product Name */}
        <div>
          <label className="block text-sm font-semibold text-slate-200 mb-1.5">
            1. ชื่อสินค้า (Product Name) <span className="text-orange-500">*</span>
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="พิมพ์ชื่อสินค้าของคุณ เช่น ขาตั้งกล้องบลูทูธ, หม้อทอดไร้น้ำมัน, ลิปสติกแมทท์"
            className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition text-sm"
            required
          />
        </div>

        {/* Price & Highlight Row */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-semibold text-slate-200 mb-1.5">
              2. ราคาและโปรโมชั่น (Price & Deal)
            </label>
            <input
              type="text"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              placeholder="เช่น ฿199 (ลด 50%), ซื้อ 1 แถม 1"
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition text-sm"
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
                รองรับ JPG, PNG, WebP (หากไม่มีรูป สามารถกด "โหลดสินค้าตัวอย่าง" ด้านบนได้)
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

        {/* Submit Button */}
        <button
          type="submit"
          disabled={isLoading}
          className="w-full shopee-gradient-btn text-white font-bold py-3.5 px-6 rounded-xl flex items-center justify-center gap-2 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed text-base cursor-pointer"
        >
          {isLoading ? (
            <>
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              <span>กำลังวิเคราะห์และสร้าง Storyboard ด้วย Gemini AI...</span>
            </>
          ) : (
            <>
              <Wand2 className="w-5 h-5" />
              <span>บันทึกสินค้า & สร้าง AI Script + Storyboard ทันที</span>
            </>
          )}
        </button>
      </form>
    </div>
  );
};
