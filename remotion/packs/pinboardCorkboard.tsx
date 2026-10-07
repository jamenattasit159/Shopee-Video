import React from "react";
import { AbsoluteFill } from "remotion";
import { PALETTE } from "../lib/palette";
import { PackDefinition } from "./types";

export const pinboardCorkboardPack: PackDefinition = {
  id: "pinboard-corkboard",
  name: "Pinboard Corkboard",
  concept: "บอร์ดไม้ก๊อก หมุดปัก โน้ตกระดาษเหลือง เชือกโยงข้อมูล",
  tempo: "chill",
  holdFrames: 4,
  defaultBg: "#B58450",
  preferredTransitions: ["page-shuffle", "torn-wipe", "slap-strip"],
  renderBackground: ({ bg } = {}) => (
    <AbsoluteFill
      style={{
        backgroundColor: bg || "#B58450",
        backgroundImage: `
          radial-gradient(rgba(70, 40, 15, 0.22) 12%, transparent 14%),
          radial-gradient(rgba(255, 230, 190, 0.15) 12%, transparent 14%)
        `,
        backgroundSize: "16px 16px",
        backgroundPosition: "0 0, 8px 8px",
      }}
    >
      {/* Decorative Red pushpin at top center */}
      <div
        style={{
          position: "absolute",
          top: "120px",
          left: "50%",
          transform: "translateX(-50%)",
          fontSize: "44px",
          filter: "drop-shadow(2px 4px 6px rgba(0,0,0,0.4))",
          userSelect: "none",
        }}
      >
        📌
      </div>
      {/* Subtle cork border frame */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          border: "16px solid #8C5E2E",
          pointerEvents: "none",
        }}
      />
    </AbsoluteFill>
  ),
  renderBadge: (text, color = "#FEF08A") => (
    <div
      style={{
        backgroundColor: color,
        color: PALETTE.ink,
        padding: "8px 22px",
        borderRadius: "4px",
        boxShadow: "4px 6px 12px rgba(0,0,0,0.35)",
        border: "1px solid rgba(0,0,0,0.1)",
        transform: "rotate(2deg)",
        fontSize: "30px",
        fontWeight: 800,
      }}
    >
      📌 {text}
    </div>
  ),
};
