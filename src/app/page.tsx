"use client";

import {
  Edit3,
  FolderOpen,
  Plus,
  ShoppingBag,
  Sparkles,
  Trash2,
  Video,
  X,
} from "lucide-react";
import React, { useEffect, useState } from "react";
import { defaultShopeeVideoProps } from "../../remotion/ShopeeProductVideo";
import {
  ProductRecord,
  ShopeeProductVideoProps,
  StoryboardPlan,
} from "../../remotion/types";
import { isVideoMedia } from "../../remotion/utils";
import { ProductForm } from "../components/ProductForm";
import { RenderExportModal } from "../components/RenderExportModal";
import { ScriptStoryboard } from "../components/ScriptStoryboard";
import { VideoPlayerPreview } from "../components/VideoPlayerPreview";
import { SystemStatusBar } from "../components/SystemStatusBar";
import { ErrorCenterButton } from "../components/ErrorCenterButton";
import { registerAiAutoFixHandler } from "@/lib/errorStore";
import { apiFetch } from "@/lib/apiFetch";

export default function DashboardPage() {
  const [products, setProducts] = useState<ProductRecord[]>([]);
  const [activeProduct, setActiveProduct] = useState<ProductRecord | null>(null);
  const [activeTab, setActiveTab] = useState<"create" | "storyboard" | "render">(
    "create"
  );
  const [formKey, setFormKey] = useState<number>(1);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isRegenerating, setIsRegenerating] = useState<boolean>(false);
  const [notification, setNotification] = useState<string | null>(null);
  const [showSafeZone, setShowSafeZone] = useState<boolean>(false);
  const [voiceoverUrl, setVoiceoverUrl] = useState<string | undefined>(undefined);
  const [voiceoverDurationSec, setVoiceoverDurationSec] = useState<number | undefined>(undefined);
  const [isManageModalOpen, setIsManageModalOpen] = useState<boolean>(false);

  const handleTabChange = (tab: "create" | "storyboard" | "render") => {
    setActiveTab(tab);
    try {
      localStorage.setItem("shopee_active_tab", tab);
    } catch {}
  };

  const showNotification = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 4000);
  };

  const fetchProducts = async () => {
    try {
      const data = await apiFetch<any>("/api/products", undefined, { silent: true });
      if (data && data.success && Array.isArray(data.products)) {
        setProducts(data.products);
        if (!activeProduct && data.products.length > 0) {
          let selected = data.products[0];
          try {
            const savedId = localStorage.getItem("shopee_active_product_id");
            if (savedId) {
              const matched = data.products.find((p: ProductRecord) => p.id === savedId);
              if (matched) selected = matched;
            }
          } catch {}
          setActiveProduct(selected);
          setVoiceoverUrl(selected?.voiceoverUrl || undefined);
          setVoiceoverDurationSec(selected?.voiceoverDurationSec || undefined);
        }
      }
    } catch (err) {
      console.error("Failed to fetch products:", err);
    }
  };

  useEffect(() => {
    try {
      const savedTab = localStorage.getItem("shopee_active_tab") as any;
      if (savedTab && ["create", "storyboard", "render"].includes(savedTab)) {
        setActiveTab(savedTab);
      }
    } catch {}
    fetchProducts();
  }, []);

  useEffect(() => {
    if (activeProduct?.id) {
      try {
        localStorage.setItem("shopee_active_product_id", activeProduct.id);
      } catch {}
    }
  }, [activeProduct?.id]);

  // Register global AI Auto-Fix handler so clicking "✨ ให้ AI แก้ปัญหาให้อัตโนมัติ" in any error toast/modal fixes the active product directly
  useEffect(() => {
    registerAiAutoFixHandler(async (action, err) => {
      if (action === "autofix-render" || err?.code?.includes("RENDER")) {
        showNotification("AI กำลังสร้างวิดีโอให้ใหม่ด้วยโหมดด่วนพิเศษ (Turbo Direct Engine)...");
        const renderRes = await fetch("/api/render-video", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            productId: activeProduct?.id || `prod_${Date.now()}`,
            renderMode: "turbo",
            resolutionScale: 1,
            props: currentVideoProps,
          }),
        });
        const renderData = await renderRes.json();
        if (renderData && renderData.success && renderData.videoUrl) {
          if (activeProduct) {
            const updated: ProductRecord = {
              ...activeProduct,
              renderedVideoUrl: renderData.videoUrl,
            };
            setActiveProduct(updated);
            setProducts((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
          }
          handleTabChange("render");
          const msg = "AI สร้างไฟล์วิดีโอ MP4 ให้เสร็จสมบูรณ์แล้วด้วยโหมด Turbo Direct! ดาวน์โหลดได้เลย";
          showNotification(msg);
          return msg;
        }
      }

      const res = await fetch("/api/ai-troubleshoot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          error: err,
          action,
          productName: activeProduct?.name,
          narrationText: activeProduct?.storyboard?.narrationScript,
        }),
      });
      const data = await res.json();
      if (data && data.ok) {
        if (data.audioUrl && activeProduct) {
          setVoiceoverUrl(data.audioUrl);
          setVoiceoverDurationSec(data.duration || undefined);
          const updated: ProductRecord = {
            ...activeProduct,
            voiceoverUrl: data.audioUrl,
            voiceoverDurationSec: data.duration || undefined,
          };
          setActiveProduct(updated);
          setProducts((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
        }
        showNotification(data.summaryTh || "AI แก้ไขปัญหาให้เรียบร้อยแล้ว!");
        return data.summaryTh;
      }
    });
    return () => registerAiAutoFixHandler(null);
  }, [activeProduct, voiceoverUrl, voiceoverDurationSec]);

  const handleStartNewProduct = () => {
    setActiveProduct(null);
    setVoiceoverUrl(undefined);
    setVoiceoverDurationSec(undefined);
    handleTabChange("create");
    setFormKey((prev) => prev + 1);
    showNotification("เปิดฟอร์มว่างพร้อมสร้างคลิปใหม่แล้ว! วางลิงก์หรืออัปโหลดรูป/คลิปได้เลย");
  };

  const handleDeleteProduct = async (targetId: string) => {
    try {
      const res = await apiFetch<any>(`/api/products?id=${encodeURIComponent(targetId)}`, {
        method: "DELETE",
      });
      if (res && res.success && Array.isArray(res.products)) {
        setProducts(res.products);
        if (activeProduct?.id === targetId) {
          const next = res.products[0] || null;
          setActiveProduct(next);
          setVoiceoverUrl(next?.voiceoverUrl || undefined);
          setVoiceoverDurationSec(next?.voiceoverDurationSec || undefined);
          if (!next) handleTabChange("create");
        }
        showNotification("ลบรายการสินค้าเรียบร้อยแล้ว!");
      }
    } catch (err) {
      console.error("Delete product error:", err);
    }
  };

  const handleDeduplicateProducts = async () => {
    try {
      const res = await apiFetch<any>("/api/products?mode=deduplicate", {
        method: "DELETE",
      });
      if (res && res.success && Array.isArray(res.products)) {
        setProducts(res.products);
        if (activeProduct && !res.products.some((p: ProductRecord) => p.id === activeProduct.id)) {
          const next = res.products[0] || null;
          setActiveProduct(next);
          setVoiceoverUrl(next?.voiceoverUrl || undefined);
          setVoiceoverDurationSec(next?.voiceoverDurationSec || undefined);
        }
        showNotification(res.message || "ลบรายการซ้ำเรียบร้อยแล้ว!");
      }
    } catch (err) {
      console.error("Deduplicate error:", err);
    }
  };

  const handleClearAllProducts = async () => {
    if (!confirm("ยืนยันการลบรายการสินค้าทั้งหมดออกจากรายการหรือไม่?")) return;
    try {
      const res = await apiFetch<any>("/api/products?mode=clear-all", {
        method: "DELETE",
      });
      if (res && res.success) {
        setProducts([]);
        setActiveProduct(null);
        setVoiceoverUrl(undefined);
        setVoiceoverDurationSec(undefined);
        handleTabChange("create");
        setIsManageModalOpen(false);
        showNotification("ล้างรายการสินค้าทั้งหมดเรียบร้อยแล้ว!");
      }
    } catch (err) {
      console.error("Clear all error:", err);
    }
  };

  const handleProductCreated = (newProduct: ProductRecord, keptStoryboard?: boolean) => {
    setProducts((prev) => [newProduct, ...prev.filter((p) => p.id !== newProduct.id)]);
    setActiveProduct(newProduct);
    setVoiceoverUrl(newProduct.voiceoverUrl || undefined);
    setVoiceoverDurationSec(newProduct.voiceoverDurationSec || undefined);
    handleTabChange("storyboard");

    if (keptStoryboard) {
      showNotification("อัปเดตข้อมูลและรูป/คลิปเรียบร้อยแล้ว (คงสตอรี่บอร์ดและเสียงพากย์เดิม)!");
      return;
    }

    showNotification("สร้าง AI Storyboard สำเร็จแล้ว! กำลังเตรียมเสียงพากย์ AI...");

    const script = newProduct.storyboard?.narrationScript;
    if (script && script.trim() && !newProduct.voiceoverUrl) {
      apiFetch<any>("/api/synthesize-voice", {
        method: "POST",
        body: {
          productName: newProduct.name,
          price: newProduct.price,
          customText: script,
          voiceType: "female",
          rate: "+15%",
        },
      })
        .then((data) => {
          if (data && data.success && data.audioUrl) {
            setVoiceoverUrl(data.audioUrl);
            setVoiceoverDurationSec(data.duration || undefined);
            const updated = {
              ...newProduct,
              voiceoverUrl: data.audioUrl,
              voiceoverDurationSec: data.duration || undefined,
            };
            setActiveProduct(updated);
            setProducts((prev) =>
              prev.map((p) => (p.id === updated.id ? updated : p))
            );
            showNotification("เสียงพากย์ AI สร้างเสร็จสมบูรณ์และเชื่อมกับคลิปแล้ว!");
          }
        })
        .catch((err) => console.error("Auto voiceover synthesis error:", err));
    }
  };

  const handleUpdateStoryboard = (updatedStoryboard: StoryboardPlan) => {
    if (!activeProduct) return;
    const updated: ProductRecord = {
      ...activeProduct,
      storyboard: updatedStoryboard,
      styleDNA: updatedStoryboard.styleDNA || activeProduct.styleDNA,
    };
    setActiveProduct(updated);
    setProducts((prev) =>
      prev.map((p) => (p.id === updated.id ? updated : p))
    );
  };

  const handleAppendMedia = async (files: FileList) => {
    if (!activeProduct) return;
    const formData = new FormData();
    formData.append("id", activeProduct.id);
    formData.append("name", activeProduct.name);
    formData.append("price", activeProduct.price);
    formData.append("highlights", activeProduct.highlights);
    formData.append("tone", activeProduct.tone);
    formData.append("cta", activeProduct.cta);
    formData.append("keepStoryboard", "true");
    formData.append("existingImages", JSON.stringify(activeProduct.images || []));
    formData.append("storyboard", JSON.stringify(activeProduct.storyboard));
    Array.from(files).forEach((f) => formData.append("files", f));

    const res = await apiFetch<any>("/api/products", {
      method: "POST",
      body: formData,
    });
    if (res && res.success && res.product) {
      setActiveProduct(res.product);
      setProducts((prev) =>
        prev.map((p) => (p.id === res.product.id ? res.product : p))
      );
      showNotification("เพิ่มไฟล์รูป/คลิปวิดีโอเข้าในโปรเจกต์เรียบร้อยแล้ว!");
    }
  };

  const handleRegenerateScript = async (provider: "claude" | "gemini" = "claude") => {
    if (!activeProduct) return;
    setIsRegenerating(true);
    try {
      const data = await apiFetch<any>("/api/generate-script", {
        method: "POST",
        body: {
          productName: activeProduct.name,
          price: activeProduct.price,
          highlights: activeProduct.highlights,
          tone: activeProduct.tone,
          imageCount: activeProduct.images.length,
          ctaText: activeProduct.cta,
          modelProvider: provider,
        },
      });
      if (data && data.success && data.storyboard) {
        handleUpdateStoryboard(data.storyboard);
        if (data.fallbackNotice) {
          showNotification(data.fallbackNotice);
        } else {
          showNotification(
            data.provider === "claude"
              ? "อัปเดตสคริปต์ใหม่ด้วย AI บทสร้างสรรค์เรียบร้อยแล้ว!"
              : "อัปเดตสคริปต์ใหม่ด้วย AI บทรวดเร็วเรียบร้อยแล้ว!"
          );
        }
      }
    } catch (err) {
      console.error(err);
      showNotification("ไม่สามารถสร้างสคริปต์ใหม่ได้ กรุณาลองอีกครั้ง");
    } finally {
      setIsRegenerating(false);
    }
  };

  const currentVideoProps: ShopeeProductVideoProps = activeProduct
    ? {
        productName: activeProduct.name,
        price: activeProduct.price,
        images: activeProduct.images,
        hook: activeProduct.storyboard.hook,
        scenes: activeProduct.storyboard.scenes,
        cta: activeProduct.storyboard.cta,
        theme: activeProduct.storyboard.theme,
        styleDNA: activeProduct.storyboard.styleDNA || activeProduct.styleDNA,
        captionSettings: activeProduct.storyboard.captionSettings,
        presentationStyle: activeProduct.storyboard.presentationStyle,
        mascotUrl: activeProduct.storyboard.mascotUrl,
        narrationScript: (activeProduct.storyboard as any)?.narrationScript,
        voiceoverUrl: voiceoverUrl || activeProduct.voiceoverUrl,
        voiceoverDurationSec: voiceoverDurationSec || activeProduct.voiceoverDurationSec,
        voiceLines: activeProduct.storyboard.voiceLines,
        bgmUrl: "/audio/bgm-upbeat.mp3",
        imageWarning: (activeProduct as any).imageWarning || undefined,
        originalUrl: activeProduct.import?.originalUrl,
      }
    : {
        ...defaultShopeeVideoProps,
      };

  const mediaStats = React.useMemo(() => {
    const list = activeProduct?.images || [];
    const videoCount = list.filter((u) => isVideoMedia(u)).length;
    const imageCount = list.length - videoCount;
    return { imageCount, videoCount };
  }, [activeProduct?.images]);

  return (
    <div className="min-h-screen bg-base-200 text-base-content flex flex-col font-sans">
      {notification && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-neutral text-neutral-content text-xs font-medium px-4 py-2.5 rounded-full shadow-lg flex items-center gap-2 transition-all duration-300 ease-out animate-in fade-in slide-in-from-top-2 border border-neutral-content/10">
          <Sparkles className="w-4 h-4 text-primary" />
          <span>{notification}</span>
        </div>
      )}

      {/* Top Navigation Bar */}
      <header className="border-b border-base-300 bg-base-100/80 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-2">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-primary text-primary-content flex items-center justify-center shadow-xs shrink-0">
              <ShoppingBag className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h1 className="font-bold text-base sm:text-lg text-base-content tracking-tight truncate">
                  Shopee Video Pro All-in-One
                </h1>
                <span className="badge badge-primary badge-outline badge-xs py-2 px-2 font-medium hidden md:inline-flex">
                  12 Themes • Video + Image
                </span>
              </div>
              <p className="text-xs text-base-content/60 hidden sm:block truncate">
                รับลิงก์ • ใส่รูปและคลิปวิดีโอ • สร้างสตอรี่ • พากย์เสียง • ใส่ซับ • เรนเดอร์ MP4 จบในหน้าเดียว
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            <SystemStatusBar />
            <ErrorCenterButton />

            {products.length > 0 && (
              <div className="flex items-center gap-1">
                <select
                  value={activeProduct?.id || "new"}
                  onChange={(e) => {
                    if (e.target.value === "new") {
                      handleStartNewProduct();
                    } else {
                      const found = products.find((p) => p.id === e.target.value);
                      if (found) {
                        setActiveProduct(found);
                        setVoiceoverUrl(found.voiceoverUrl || undefined);
                        setVoiceoverDurationSec(found.voiceoverDurationSec || undefined);
                      }
                    }
                  }}
                  className="select select-bordered select-sm rounded-xl text-xs max-w-[150px] sm:max-w-[210px] truncate bg-base-100 border-base-300 text-base-content"
                >
                  <option value="new">+ สร้างสินค้าใหม่...</option>
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>

                {/* Quick Delete Active Product Button */}
                {activeProduct && (
                  <button
                    type="button"
                    onClick={() => handleDeleteProduct(activeProduct.id)}
                    title="ลบรายการสินค้านี้ออกจากประวัติ"
                    className="btn btn-ghost btn-sm btn-square rounded-xl text-error hover:bg-error/10"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}

                {/* Open Manage / Clean Duplicates Modal */}
                <button
                  type="button"
                  onClick={() => setIsManageModalOpen(true)}
                  title="จัดการรายการสินค้า / ลบรายการที่ซ้ำกัน"
                  className="btn btn-outline btn-xs rounded-xl gap-1 hidden sm:inline-flex"
                >
                  <FolderOpen className="w-3.5 h-3.5" />
                  <span>จัดการ ({products.length})</span>
                </button>
              </div>
            )}

            <button
              type="button"
              onClick={handleStartNewProduct}
              className="btn btn-primary btn-sm rounded-xl gap-1.5 shadow-sm"
            >
              <Plus className="w-4 h-4" />
              <span>สร้างคลิปใหม่</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Dashboard */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left Column: Unified 3-Step Workflow (7 cols) */}
          <div className="lg:col-span-7 space-y-6">
            <div className="flex items-center gap-1.5 bg-base-100 p-1.5 rounded-2xl border border-base-300 shadow-xs text-xs font-semibold">
              <button
                type="button"
                onClick={() => handleTabChange("create")}
                className={`flex-1 py-2 px-3 rounded-xl transition flex items-center justify-center gap-1.5 ${
                  activeTab === "create"
                    ? "bg-primary text-primary-content shadow-xs"
                    : "text-base-content/70 hover:text-base-content hover:bg-base-200"
                }`}
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span>1. ข้อมูล & รูป/คลิป {activeProduct ? "(แก้ไขได้)" : ""}</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  if (!activeProduct) {
                    alert("กรุณากรอกข้อมูลสินค้าและกด 'บันทึกสินค้า' ในขั้นตอนที่ 1 ก่อนครับ");
                    return;
                  }
                  handleTabChange("storyboard");
                }}
                className={`flex-1 py-2 px-3 rounded-xl transition flex items-center justify-center gap-1.5 ${
                  activeTab === "storyboard"
                    ? "bg-primary text-primary-content shadow-xs"
                    : "text-base-content/70 hover:text-base-content hover:bg-base-200"
                }`}
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>2. สตอรี่บอร์ด • พากย์เสียง • ซับ</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  if (!activeProduct) {
                    alert("กรุณาสร้างสินค้าในขั้นตอนที่ 1 ก่อนครับ");
                    return;
                  }
                  handleTabChange("render");
                }}
                className={`flex-1 py-2 px-3 rounded-xl transition flex items-center justify-center gap-1.5 ${
                  activeTab === "render"
                    ? "bg-primary text-primary-content shadow-xs"
                    : "text-base-content/70 hover:text-base-content hover:bg-base-200"
                }`}
              >
                <Video className="w-3.5 h-3.5" />
                <span>3. เรนเดอร์ MP4 & แคปชั่น</span>
              </button>
            </div>

            <div className={activeTab === "create" ? "space-y-6" : "hidden"}>
              <ProductForm
                key={activeProduct ? `edit_${activeProduct.id}` : `new_${formKey}`}
                initialProduct={activeProduct}
                onProductCreated={handleProductCreated}
                isLoading={isLoading}
                setIsLoading={setIsLoading}
              />
            </div>

            {activeProduct && (
              <div className={activeTab === "storyboard" ? "space-y-6" : "hidden"}>
                <ScriptStoryboard
                  productName={activeProduct.name}
                  price={activeProduct.price}
                  highlights={activeProduct.highlights}
                  images={activeProduct.images}
                  storyboard={activeProduct.storyboard}
                  onUpdateStoryboard={handleUpdateStoryboard}
                  onRegenerate={handleRegenerateScript}
                  isRegenerating={isRegenerating}
                  voiceoverUrl={voiceoverUrl}
                  onAppendMedia={handleAppendMedia}
                  onNavigateToStep1={() => handleTabChange("create")}
                  onVoiceoverGenerated={(url, duration) => {
                    setVoiceoverUrl(url);
                    setVoiceoverDurationSec(duration);
                    if (activeProduct) {
                      const updated = {
                        ...activeProduct,
                        voiceoverUrl: url,
                        voiceoverDurationSec: duration,
                      };
                      setActiveProduct(updated);
                      setProducts((prev) =>
                        prev.map((p) => (p.id === updated.id ? updated : p))
                      );
                    }
                    showNotification("เสียงพากย์ AI ถูกเชื่อมต่อเข้าสู่วิดีโอแล้ว!");
                  }}
                />

                <div className="bg-base-100 border border-base-300 rounded-2xl p-5 flex items-center justify-between shadow-xs">
                  <div>
                    <h4 className="font-bold text-sm text-base-content">
                      พอใจกับสตอรี่บอร์ด เสียงพากย์ และซับไตเติลแล้วใช่ไหม?
                    </h4>
                    <p className="text-xs text-base-content/60">
                      ไปที่ขั้นตอนเรนเดอร์เพื่อสร้างไฟล์ MP4 พร้อมเสียง และรับแพ็กเกจแคปชั่นสำหรับโพสต์ขาย
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleTabChange("render")}
                    className="btn btn-primary btn-sm rounded-xl gap-2 shadow-xs"
                  >
                    <Video className="w-4 h-4" />
                    <span>ไปหน้าเรนเดอร์ MP4</span>
                  </button>
                </div>
              </div>
            )}

            <div className={activeTab === "render" ? "space-y-6" : "hidden"}>
              <RenderExportModal
                productId={activeProduct?.id}
                productName={activeProduct?.name}
                price={activeProduct?.price}
                highlights={activeProduct?.highlights}
                videoProps={currentVideoProps}
                initialVideoUrl={activeProduct?.renderedVideoUrl}
                onNavigateToTab={handleTabChange}
                onVideoRendered={(url) => {
                  if (activeProduct) {
                    const updated = { ...activeProduct, renderedVideoUrl: url };
                    setActiveProduct(updated);
                    setProducts((prev) =>
                      prev.map((p) => (p.id === updated.id ? updated : p))
                    );
                  }
                }}
              />
            </div>
          </div>

          {/* Right Column: Live Video Player Preview (5 cols, sticky) */}
          <div className="lg:col-span-5 sticky top-24">
            <VideoPlayerPreview
              props={currentVideoProps}
              showSafeZone={showSafeZone}
              onToggleSafeZone={setShowSafeZone}
            />

            {activeProduct ? (
              <div className="mt-4 bg-base-100 border border-base-300 rounded-2xl p-4 text-xs text-base-content/80 shadow-xs space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-base-content">
                    สินค้าที่เลือกอยู่:
                  </span>
                  <span className="text-primary font-bold">
                    {activeProduct.price}
                  </span>
                </div>
                <div className="text-base-content font-medium truncate">
                  {activeProduct.name}
                </div>
                <div className="text-[11px] text-base-content/60 flex items-center justify-between pt-2 border-t border-base-300">
                  <span>
                    สื่อ: รูป {mediaStats.imageCount} • คลิปวิดีโอ {mediaStats.videoCount}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleTabChange("create")}
                    className="text-primary font-semibold hover:underline"
                  >
                    + แก้ไขข้อมูล / เพิ่มรูปและคลิป
                  </button>
                </div>
              </div>
            ) : (
              <div className="mt-4 bg-base-100 border border-dashed border-base-300 rounded-2xl p-4 text-center text-xs text-base-content/60">
                <span>วางลิงก์ Shopee หรืออัปโหลดรูป/คลิปทางซ้ายมือ แล้วกด </span>
                <span className="text-primary font-semibold">"บันทึกสินค้า & สร้าง AI Script"</span>
                <span> เพื่อเริ่มสร้างคลิป</span>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Manage & Clean Duplicate Products Modal */}
      {isManageModalOpen && (
        <div className="modal modal-open z-50">
          <div className="modal-box rounded-2xl max-w-xl p-6 bg-base-100 border border-base-300 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-base-300">
              <div>
                <h3 className="font-bold text-base text-base-content">
                  จัดการรายการสินค้า ({products.length} รายการ)
                </h3>
                <p className="text-xs text-base-content/60 mt-0.5">
                  เลือกรายการเพื่อแก้ไข ลบรายการที่ไม่ต้องการ หรือล้างรายการที่ซ้ำกันในคลิกเดียว
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsManageModalOpen(false)}
                className="btn btn-ghost btn-xs btn-circle"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 bg-base-200/60 p-3 rounded-xl border border-base-300">
              <button
                type="button"
                onClick={handleDeduplicateProducts}
                className="btn btn-primary btn-xs rounded-lg gap-1.5 font-bold"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>ลบรายการที่ชื่อซ้ำกันอัตโนมัติ</span>
              </button>

              <button
                type="button"
                onClick={handleClearAllProducts}
                className="btn btn-outline btn-error btn-xs rounded-lg gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>ล้างรายการทั้งหมด</span>
              </button>
            </div>

            <div className="max-h-80 overflow-y-auto space-y-2 pr-1">
              {products.map((item) => {
                const isSelected = activeProduct?.id === item.id;
                return (
                  <div
                    key={item.id}
                    className={`flex items-center justify-between gap-3 p-3 rounded-xl border text-xs ${
                      isSelected
                        ? "border-primary bg-primary/5"
                        : "border-base-300 bg-base-100"
                    }`}
                  >
                    <div
                      onClick={() => {
                        setActiveProduct(item);
                        setVoiceoverUrl(item.voiceoverUrl || undefined);
                        setVoiceoverDurationSec(item.voiceoverDurationSec || undefined);
                        setIsManageModalOpen(false);
                      }}
                      className="min-w-0 flex-1 cursor-pointer"
                    >
                      <div className="font-bold text-base-content truncate">{item.name}</div>
                      <div className="text-[11px] text-base-content/60 mt-0.5">
                        ราคา: {item.price} • สื่อ: {item.images?.length || 0} ไฟล์
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => {
                          setActiveProduct(item);
                          setVoiceoverUrl(item.voiceoverUrl || undefined);
                          setVoiceoverDurationSec(item.voiceoverDurationSec || undefined);
                          handleTabChange("create");
                          setIsManageModalOpen(false);
                        }}
                        className="btn btn-outline btn-xs rounded-lg gap-1"
                      >
                        <Edit3 className="w-3 h-3" />
                        <span>แก้รูป/คลิป</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteProduct(item.id)}
                        className="btn btn-ghost btn-xs text-error rounded-lg"
                        title="ลบรายการนี้"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="modal-action pt-2 border-t border-base-300">
              <button
                type="button"
                onClick={() => setIsManageModalOpen(false)}
                className="btn btn-sm rounded-xl"
              >
                ปิดหน้าต่าง
              </button>
            </div>
          </div>
          <div className="modal-backdrop bg-black/40" onClick={() => setIsManageModalOpen(false)} />
        </div>
      )}

      <footer className="border-t border-base-300 py-6 mt-12 bg-base-100/50 text-center text-xs text-base-content/60">
        Shopee Video Pro Generator • รับลิงก์ สร้างสตอรี่ พากย์เสียง ใส่ซับ เรนเดอร์คลิปขายของครบจบในหน้าเดียว
      </footer>
    </div>
  );
}
