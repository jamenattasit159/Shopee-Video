"use client";

import {
  CheckCircle,
  FolderOpen,
  Plus,
  RefreshCw,
  ShoppingBag,
  Sparkles,
  Video,
} from "lucide-react";
import React, { useEffect, useState } from "react";
import { defaultShopeeVideoProps } from "../../remotion/ShopeeProductVideo";
import {
  ProductRecord,
  ShopeeProductVideoProps,
  StoryboardPlan,
} from "../../remotion/types";
import { ProductForm } from "../components/ProductForm";
import { RenderExportModal } from "../components/RenderExportModal";
import { ScriptStoryboard } from "../components/ScriptStoryboard";
import { VideoPlayerPreview } from "../components/VideoPlayerPreview";

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

  // Fetch saved products on mount
  const fetchProducts = async () => {
    try {
      const res = await fetch("/api/products");
      const data = await res.json();
      if (data.success && Array.isArray(data.products) && data.products.length > 0) {
        setProducts(data.products);
        if (!activeProduct) {
          setActiveProduct(data.products[0]);
          setVoiceoverUrl(data.products[0]?.voiceoverUrl || undefined);
        }
      }
    } catch (err) {
      console.error("Failed to fetch products:", err);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  const showNotification = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 4000);
  };

  // Start a fresh new product
  const handleStartNewProduct = () => {
    setActiveProduct(null);
    setVoiceoverUrl(undefined);
    setActiveTab("create");
    setFormKey((prev) => prev + 1);
    showNotification("✨ เปิดฟอร์มว่างพร้อมสร้างคลิปใหม่แล้ว! กรอกข้อมูลสินค้าได้เลย");
  };

  const handleProductCreated = (newProduct: ProductRecord) => {
    setProducts((prev) => [newProduct, ...prev.filter((p) => p.id !== newProduct.id)]);
    setActiveProduct(newProduct);
    setVoiceoverUrl(newProduct.voiceoverUrl || undefined);
    setActiveTab("storyboard");
    showNotification("🎉 สร้าง AI Storyboard สำเร็จแล้ว! กำลังเตรียมเสียงพากย์ AI...");

    // Auto-synthesize voiceover in background so video is never silent
    const script = newProduct.storyboard?.narrationScript;
    if (script && script.trim() && !newProduct.voiceoverUrl) {
      fetch("/api/synthesize-voice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productName: newProduct.name,
          price: newProduct.price,
          customText: script,
          voiceType: "female",
        }),
      })
        .then((r) => r.json())
        .then((data) => {
          if (data.success && data.audioUrl) {
            setVoiceoverUrl(data.audioUrl);
            const updatedStoryboard = data.timeline
              ? {
                  ...newProduct.storyboard,
                  hook: {
                    ...newProduct.storyboard.hook,
                    durationSec: data.timeline.hookDurationSec,
                  },
                  scenes: (newProduct.storyboard.scenes || []).map((s, idx) => ({
                    ...s,
                    durationSec: data.timeline.scenesDurationSec[idx] ?? s.durationSec ?? 4,
                  })),
                  cta: {
                    ...newProduct.storyboard.cta,
                    durationSec: data.timeline.ctaDurationSec,
                  },
                }
              : newProduct.storyboard;

            const updated: ProductRecord = {
              ...newProduct,
              voiceoverUrl: data.audioUrl,
              storyboard: updatedStoryboard,
              audioDurationSec: data.durationSec,
              actualDurationFrames: data.timeline?.totalDurationFrames,
            } as any;

            setActiveProduct(updated);
            setProducts((prev) =>
              prev.map((p) => (p.id === updated.id ? updated : p))
            );

            // Persist to storage
            fetch("/api/products", {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                id: updated.id,
                voiceoverUrl: data.audioUrl,
                storyboard: updatedStoryboard,
                audioDurationSec: data.durationSec,
                actualDurationFrames: data.timeline?.totalDurationFrames,
              }),
            }).catch(() => {});

            showNotification("🎙️ เสียงพากย์ AI สร้างเสร็จสมบูรณ์และเชื่อมกับคลิปแล้ว!");
          }
        })
        .catch((err) => console.error("Auto voiceover synthesis error:", err));
    }
  };

  const handleUpdateStoryboard = (updatedStoryboard: StoryboardPlan) => {
    if (!activeProduct) return;
    const updated = {
      ...activeProduct,
      storyboard: updatedStoryboard,
    };
    setActiveProduct(updated);
    setProducts((prev) =>
      prev.map((p) => (p.id === updated.id ? updated : p))
    );
    fetch("/api/products", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: updated.id,
        storyboard: updatedStoryboard,
      }),
    }).catch(() => {});
  };

  const handleRegenerateScript = async () => {
    if (!activeProduct) return;
    setIsRegenerating(true);
    try {
      const res = await fetch("/api/generate-script", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productName: activeProduct.name,
          price: activeProduct.price,
          highlights: activeProduct.highlights,
          tone: activeProduct.tone,
          imageCount: activeProduct.images.length,
          ctaText: activeProduct.cta,
        }),
      });
      const data = await res.json();
      if (data.success && data.storyboard) {
        handleUpdateStoryboard(data.storyboard);
        showNotification("✨ อัปเดตสคริปต์ใหม่ด้วย Gemini AI เรียบร้อยแล้ว!");
      }
    } catch (err) {
      console.error(err);
      alert("Failed to regenerate script");
    } finally {
      setIsRegenerating(false);
    }
  };

  // Convert active product into Remotion video props
  const currentVideoProps: ShopeeProductVideoProps = activeProduct
    ? {
        productName: activeProduct.name,
        price: activeProduct.price,
        images: activeProduct.images,
        hook: activeProduct.storyboard.hook,
        scenes: activeProduct.storyboard.scenes,
        cta: activeProduct.storyboard.cta,
        theme: activeProduct.storyboard.theme,
        styleDNA: activeProduct.storyboard.styleDNA,
        voiceoverUrl: voiceoverUrl || activeProduct.voiceoverUrl,
        audioDurationSec: (activeProduct as any).audioDurationSec,
        actualDurationFrames: (activeProduct as any).actualDurationFrames,
        tailBufferSec: 0.8,
        bgmUrl: "/audio/bgm-upbeat.mp3",
        imageWarning: (activeProduct as any).imageWarning || undefined,
        originalUrl: activeProduct.import?.originalUrl,
      }
    : {
        ...defaultShopeeVideoProps,
      };

  return (
    <div className="min-h-screen bg-transparent text-stone-800 flex flex-col font-sans">
      {/* Top Notification Toast */}
      {notification && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-stone-900 text-white text-xs font-bold px-4 py-2.5 rounded-full shadow-[3px_3px_0px_#ea580c] flex items-center gap-2 transition-all duration-300 ease-out animate-in fade-in slide-in-from-top-2 border border-stone-800">
          <Sparkles className="w-4 h-4 text-amber-300" />
          <span>{notification}</span>
        </div>
      )}

      {/* Top Navigation Bar */}
      <header className="border-b border-stone-200/90 bg-white/85 backdrop-blur-md sticky top-0 z-40 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#EE4D2D] to-[#FF6533] flex items-center justify-center shadow-md shadow-orange-500/20 border border-orange-500/30">
              <ShoppingBag className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-extrabold text-base sm:text-lg text-stone-900 tracking-tight">
                  Shopee Video Generator
                </h1>
                <span className="text-[10px] font-bold bg-orange-100 text-orange-800 border border-orange-300 px-2 py-0.5 rounded-full shadow-xs">
                  AI Voice & Paper Collage Pro
                </span>
              </div>
              <p className="text-xs text-stone-500 hidden sm:block">
                ระบบสร้างคลิปป้ายยาอัตโนมัติ (Next.js + Remotion + Gemini AI + Edge TTS)
              </p>
            </div>
          </div>

          {/* Product Switcher & New Button */}
          <div className="flex items-center gap-3">
            {products.length > 0 && (
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
                      setActiveTab("storyboard");
                    }
                  }
                }}
                className="bg-white border border-stone-300 text-xs text-stone-800 rounded-xl px-3 py-2 shadow-xs focus:outline-none focus:border-orange-500 max-w-[180px] sm:max-w-[240px] truncate"
              >
                <option value="new">+ สร้างสินค้าใหม่...</option>
                {products.map((p) => (
                  <option key={p.id} value={p.id}>
                    📦 {p.name}
                  </option>
                ))}
              </select>
            )}

            {/* Click to start new product */}
            <button
              type="button"
              onClick={handleStartNewProduct}
              className="shopee-gradient-btn text-white text-xs font-bold px-3.5 py-2 rounded-xl flex items-center gap-1.5 shadow-sm transition cursor-pointer"
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
          {/* Left Column: Form & Storyboard Workflow (7 cols) */}
          <div className="lg:col-span-7 space-y-6">
            {/* Step Tabs */}
            <div className="flex items-center gap-2 bg-stone-100/90 p-1.5 rounded-2xl border border-stone-300/80 shadow-xs text-xs font-semibold">
              <button
                type="button"
                onClick={() => setActiveTab("create")}
                className={`flex-1 py-2 px-3 rounded-xl transition flex items-center justify-center gap-1.5 ${
                  activeTab === "create"
                    ? "bg-orange-600 text-white shadow-sm"
                    : "text-stone-600 hover:text-stone-900 hover:bg-white/80"
                }`}
              >
                <span>1. ข้อมูล & ภาพ</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  if (!activeProduct) {
                    alert("กรุณากรอกข้อมูลสินค้าและกด 'บันทึกสินค้า' ในขั้นตอนที่ 1 ก่อนครับ");
                    return;
                  }
                  setActiveTab("storyboard");
                }}
                className={`flex-1 py-2 px-3 rounded-xl transition flex items-center justify-center gap-1.5 ${
                  activeTab === "storyboard"
                    ? "bg-amber-600 text-white shadow-sm"
                    : "text-stone-600 hover:text-stone-900 hover:bg-white/80"
                }`}
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>2. Storyboard & เสียงพากย์</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  if (!activeProduct) {
                    alert("กรุณาสร้างสินค้าในขั้นตอนที่ 1 ก่อนครับ");
                    return;
                  }
                  setActiveTab("render");
                }}
                className={`flex-1 py-2 px-3 rounded-xl transition flex items-center justify-center gap-1.5 ${
                  activeTab === "render"
                    ? "bg-emerald-600 text-white shadow-sm"
                    : "text-stone-600 hover:text-stone-900 hover:bg-white/80"
                }`}
              >
                <Video className="w-3.5 h-3.5" />
                <span>3. เรนเดอร์ & แคปชั่น</span>
              </button>
            </div>

            {/* Tab 1: Product Form */}
            {activeTab === "create" && (
              <ProductForm
                key={formKey}
                onProductCreated={handleProductCreated}
                isLoading={isLoading}
                setIsLoading={setIsLoading}
              />
            )}

            {/* Tab 2: Storyboard & AI Voice Editor */}
            {activeTab === "storyboard" && activeProduct && (
              <ScriptStoryboard
                productName={activeProduct.name}
                price={activeProduct.price}
                highlights={activeProduct.highlights}
                storyboard={activeProduct.storyboard}
                onUpdateStoryboard={handleUpdateStoryboard}
                onRegenerate={handleRegenerateScript}
                isRegenerating={isRegenerating}
                voiceoverUrl={voiceoverUrl}
                onVoiceoverGenerated={(url, durSec, timeline) => {
                  setVoiceoverUrl(url);
                  setActiveProduct((prev) => {
                    if (!prev) return prev;
                    const updatedStoryboard = timeline
                      ? {
                          ...prev.storyboard,
                          hook: {
                            ...prev.storyboard.hook,
                            durationSec: timeline.hookDurationSec,
                          },
                          scenes: (prev.storyboard.scenes || []).map((s, idx) => ({
                            ...s,
                            durationSec: timeline.scenesDurationSec[idx] ?? s.durationSec ?? 4,
                          })),
                          cta: {
                            ...prev.storyboard.cta,
                            durationSec: timeline.ctaDurationSec,
                          },
                        }
                      : prev.storyboard;

                    const updated: ProductRecord = {
                      ...prev,
                      voiceoverUrl: url,
                      storyboard: updatedStoryboard,
                      audioDurationSec: durSec,
                      actualDurationFrames: timeline?.totalDurationFrames,
                    } as any;

                    setProducts((pList) =>
                      pList.map((p) => (p.id === updated.id ? updated : p))
                    );

                    fetch("/api/products", {
                      method: "PATCH",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({
                        id: updated.id,
                        voiceoverUrl: url,
                        storyboard: updatedStoryboard,
                        audioDurationSec: durSec,
                        actualDurationFrames: timeline?.totalDurationFrames,
                      }),
                    }).catch(() => {});

                    return updated;
                  });
                  showNotification("🎙️ เสียงพากย์ AI ถูกเชื่อมต่อเข้าสู่วิดีโอแล้ว!");
                }}
              />
            )}

            {/* Tab 3: Render, Audio & Captions Export */}
            {activeTab === "render" && (
              <RenderExportModal
                productId={activeProduct?.id}
                productName={activeProduct?.name}
                price={activeProduct?.price}
                highlights={activeProduct?.highlights}
                videoProps={currentVideoProps}
                initialVideoUrl={activeProduct?.renderedVideoUrl}
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
            )}

            {/* Always show Render trigger at bottom of Storyboard view */}
            {activeTab === "storyboard" && (
              <div className="bg-white border border-stone-200/90 rounded-2xl p-5 flex items-center justify-between shadow-sm">
                <div>
                  <h4 className="font-bold text-sm text-stone-900">
                    พอใจกับสคริปต์และเสียงพากย์แล้วใช่ไหม?
                  </h4>
                  <p className="text-xs text-stone-500">
                    ไปที่ขั้นตอนเรนเดอร์เพื่อสร้างไฟล์ MP4 พร้อมเสียง และรับแคปชั่นสำหรับโพสต์
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveTab("render")}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs py-2.5 px-5 rounded-xl flex items-center gap-2 shadow-sm transition"
                >
                  <Video className="w-4 h-4" />
                  <span>ไปหน้าเรนเดอร์ MP4</span>
                </button>
              </div>
            )}
          </div>

          {/* Right Column: Live Video Player Preview (5 cols, sticky) */}
          <div className="lg:col-span-5 sticky top-24">
            <VideoPlayerPreview
              props={currentVideoProps}
              showSafeZone={showSafeZone}
              onToggleSafeZone={setShowSafeZone}
            />

            {/* Active Product Quick Info Card */}
            {activeProduct ? (
              <div className="mt-4 bg-white border border-stone-200/90 rounded-xl p-4 text-xs text-stone-600 shadow-sm space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-stone-800">
                    สินค้าที่เลือกอยู่:
                  </span>
                  <span className="text-orange-600 font-bold">
                    {activeProduct.price}
                  </span>
                </div>
                <div className="text-stone-900 font-medium truncate">
                  {activeProduct.name}
                </div>
                <div className="text-[11px] text-stone-500 flex items-center justify-between pt-1 border-t border-stone-200">
                  <span>รูปภาพ: {activeProduct.images.length} ภาพ</span>
                  <span>
                    เสียง: {voiceoverUrl ? "🔊 พากย์ AI + BGM" : "🎵 เพลง BGM"}
                  </span>
                </div>
              </div>
            ) : (
              <div className="mt-4 bg-stone-100/70 border border-dashed border-stone-300 rounded-xl p-4 text-center text-xs text-stone-500">
                <span>กรอกข้อมูลและอัปโหลดรูปทางซ้ายมือ แล้วกด </span>
                <span className="text-orange-600 font-semibold">"บันทึกสินค้า & สร้าง AI Script"</span>
                <span> เพื่อเริ่มสร้างคลิป</span>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-stone-200/80 py-6 mt-12 bg-white/60 text-center text-xs text-stone-500">
        Shopee Affiliate Video Production System • Powered by Next.js, Remotion, Google Gemini & Edge TTS
      </footer>
    </div>
  );
}
