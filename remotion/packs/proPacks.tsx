import React from "react";
import { AbsoluteFill } from "remotion";
import { PackDefinition } from "./types";

/**
 * 4 Pro Commercial Studio Packs for high-converting Shopee / TikTok videos:
 * 1. pro-minimal-luxury: Clean Editorial Studio (warm alabaster, soft ambient orbs, glass badge)
 * 2. pro-flash-sale: Urgent Commercial Deal (vibrant Shopee orange-crimson gradient, diagonal speed lines, gold badge)
 * 3. pro-ugc-creator: Authentic Creator Reel (soft dark vignette + floating glass pill badge, ideal for video clips)
 * 4. pro-cyber-slate: Modern Tech Slate (deep slate-950 + indigo glow + fine grid)
 */

export const proMinimalLuxuryPack: PackDefinition = {
  id: "pro-minimal-luxury",
  name: "Pro Minimal Studio",
  concept: "สตูดิโอคลีนหรูหรา แสงนุ่มละมุน กรอบกระจก Glassmorphism เหมาะกับสกินแคร์ บิวตี้ และของแต่งบ้าน",
  tempo: "chill",
  holdFrames: 4,
  defaultBg: "#F8F5F0",
  preferredTransitions: ["page-shuffle", "slap-strip"],
  renderBackground: ({ bg = "#F8F5F0" } = {}) => (
    <AbsoluteFill
      style={{
        background: `radial-gradient(circle at 20% 20%, #FFFFFF 0%, ${bg} 55%, #EDE5DA 100%)`,
        overflow: "hidden",
      }}
    >
      <div
        style={{
          position: "absolute",
          top: "-180px",
          right: "-160px",
          width: "760px",
          height: "760px",
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(212, 163, 115, 0.22) 0%, transparent 70%)",
        }}
      />
      <div
        style={{
          position: "absolute",
          bottom: "120px",
          left: "-180px",
          width: "680px",
          height: "680px",
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(181, 131, 141, 0.16) 0%, transparent 70%)",
        }}
      />
      {/* Subtle architectural frame line */}
      <div
        style={{
          position: "absolute",
          inset: "36px",
          border: "1.5px solid rgba(28, 25, 23, 0.08)",
          borderRadius: "36px",
          pointerEvents: "none",
        }}
      />
    </AbsoluteFill>
  ),
  renderBadge: (text, color = "#9A3412") => (
    <div
      style={{
        backgroundColor: "rgba(255, 255, 255, 0.92)",
        color: "#1C1917",
        border: `2px solid ${color}`,
        padding: "10px 28px",
        borderRadius: "999px",
        boxShadow: "0 12px 28px rgba(28, 25, 23, 0.1)",
        fontSize: "30px",
        fontWeight: 700,
        letterSpacing: "0.5px",
      }}
    >
      {text}
    </div>
  ),
};

export const proFlashSalePack: PackDefinition = {
  id: "pro-flash-sale",
  name: "Pro Flash Deal",
  concept: "ดีลเดือดพาณิชย์มือโปร โทนส้ม-แดง-ทอง พลังงานสูง กระตุ้นการกดตะกร้าทันที",
  tempo: "hyper",
  holdFrames: 2,
  defaultBg: "#1A0805",
  preferredTransitions: ["slap-strip", "torn-wipe"],
  renderBackground: ({ bg = "#1A0805" } = {}) => (
    <AbsoluteFill
      style={{
        background: `linear-gradient(155deg, #2A0905 0%, ${bg} 45%, #431407 100%)`,
        overflow: "hidden",
      }}
    >
      <div
        style={{
          position: "absolute",
          left: "50%",
          top: "48%",
          width: "1000px",
          height: "1000px",
          transform: "translate(-50%, -50%)",
          background: "radial-gradient(circle, rgba(238, 77, 45, 0.42) 0%, rgba(251, 191, 36, 0.12) 45%, transparent 72%)",
        }}
      />
      {/* Diagonal commercial stripes */}
      <AbsoluteFill
        style={{
          opacity: 0.12,
          backgroundImage:
            "repeating-linear-gradient(-45deg, rgba(255,255,255,0.22) 0px, rgba(255,255,255,0.22) 2px, transparent 2px, transparent 28px)",
        }}
      />
    </AbsoluteFill>
  ),
  renderBadge: (text, color = "#EE4D2D") => (
    <div
      style={{
        background: `linear-gradient(90deg, ${color} 0%, #F59E0B 100%)`,
        color: "#FFFFFF",
        border: "3px solid #FEF08A",
        padding: "10px 28px",
        borderRadius: "16px",
        boxShadow: "0 12px 32px rgba(238, 77, 45, 0.55)",
        fontSize: "32px",
        fontWeight: 800,
        transform: "skewX(-6deg)",
      }}
    >
      {text}
    </div>
  ),
};

export const proUgcCreatorPack: PackDefinition = {
  id: "pro-ugc-creator",
  name: "Pro UGC Reel",
  concept: "สไตล์ครีเอเตอร์รีวิวของจริง เน้นโชว์คลิป/ภาพชัดเต็มตา พร้อมป้ายแคปซูลโปร่งแสง",
  tempo: "snappy",
  holdFrames: 3,
  defaultBg: "#0F1419",
  preferredTransitions: ["page-shuffle", "slap-strip"],
  renderBackground: ({ bg = "#0F1419" } = {}) => (
    <AbsoluteFill
      style={{
        background: `radial-gradient(circle at 50% 45%, #1E293B 0%, ${bg} 70%, #090D12 100%)`,
        overflow: "hidden",
      }}
    >
      <div
        style={{
          position: "absolute",
          left: "50%",
          top: "52%",
          width: "880px",
          height: "880px",
          transform: "translate(-50%, -50%)",
          background: "radial-gradient(circle, rgba(16, 185, 129, 0.22) 0%, rgba(56, 189, 248, 0.12) 45%, transparent 70%)",
        }}
      />
    </AbsoluteFill>
  ),
  renderBadge: (text, color = "#10B981") => (
    <div
      style={{
        backgroundColor: "rgba(15, 23, 42, 0.88)",
        color: "#F8FAFC",
        border: `2px solid ${color}`,
        padding: "10px 26px",
        borderRadius: "999px",
        boxShadow: "0 10px 28px rgba(0,0,0,0.45)",
        fontSize: "30px",
        fontWeight: 700,
      }}
    >
      {text}
    </div>
  ),
};

export const proCyberSlatePack: PackDefinition = {
  id: "pro-cyber-slate",
  name: "Pro Tech Slate",
  concept: "โทนมืดพรีเมียม Slate & Indigo กริดดิจิทัลและแสง Glow สำหรับแกดเจ็ตและของใช้ทันสมัย",
  tempo: "snappy",
  holdFrames: 3,
  defaultBg: "#020617",
  preferredTransitions: ["slap-strip", "page-shuffle"],
  renderBackground: ({ bg = "#020617" } = {}) => (
    <AbsoluteFill style={{ backgroundColor: bg, overflow: "hidden" }}>
      <AbsoluteFill
        style={{
          background: "radial-gradient(circle at 50% 54%, rgba(99, 102, 241, 0.26) 0%, transparent 58%)",
        }}
      />
      <AbsoluteFill
        style={{
          opacity: 0.35,
          backgroundImage: "radial-gradient(#1e293b 1.5px, transparent 1.5px)",
          backgroundSize: "36px 36px",
        }}
      />
    </AbsoluteFill>
  ),
  renderBadge: (text, color = "#6366f1") => (
    <div
      style={{
        backgroundColor: "#1e293b",
        color: "#a5b4fc",
        border: `2px solid ${color}`,
        padding: "8px 24px",
        borderRadius: "999px",
        boxShadow: "0 10px 24px rgba(2, 6, 23, 0.5)",
        fontSize: "30px",
        fontWeight: 700,
      }}
    >
      {text}
    </div>
  ),
};
