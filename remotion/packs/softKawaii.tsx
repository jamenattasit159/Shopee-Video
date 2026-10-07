import React from "react";
import { AbsoluteFill } from "remotion";
import { PALETTE } from "../lib/palette";
import { PackDefinition } from "./types";

export const softKawaiiPack: PackDefinition = {
  id: "soft-kawaii",
  name: "Soft Kawaii",
  concept: "พาสเทลนุ่ม เมฆ ดาว หัวใจ สติกเกอร์คิวท์โทนอ่อนหวาน สดใสน่ารัก",
  tempo: "chill",
  holdFrames: 4,
  defaultBg: "#FCE7F3",
  preferredTransitions: ["page-shuffle", "torn-wipe", "slap-strip"],
  renderBackground: ({ bg } = {}) => (
    <AbsoluteFill
      style={{
        backgroundColor: bg || "#FCE7F3",
        backgroundImage: `
          radial-gradient(#F472B6 14%, transparent 16%),
          radial-gradient(#A78BFA 14%, transparent 16%)
        `,
        backgroundSize: "36px 36px",
        backgroundPosition: "0 0, 18px 18px",
      }}
    >
      {/* Decorative cute sparkle elements */}
      <div
        style={{
          position: "absolute",
          top: "130px",
          right: "50px",
          fontSize: "42px",
          userSelect: "none",
          filter: "drop-shadow(2px 2px 4px rgba(244,114,182,0.4))",
        }}
      >
        ✨ 💖
      </div>
      <div
        style={{
          position: "absolute",
          bottom: "160px",
          left: "40px",
          fontSize: "38px",
          userSelect: "none",
          filter: "drop-shadow(2px 2px 4px rgba(167,139,250,0.4))",
        }}
      >
        ☁️ 🌸
      </div>
    </AbsoluteFill>
  ),
  renderBadge: (text, color = "#F472B6") => (
    <div
      style={{
        backgroundColor: color,
        color: "#FFFFFF",
        padding: "8px 24px",
        borderRadius: "999px",
        border: "3px solid #FFFFFF",
        boxShadow: "0 6px 14px rgba(244,114,182,0.4)",
        transform: "rotate(2deg)",
        fontSize: "30px",
        fontWeight: 800,
      }}
    >
      ✨ {text}
    </div>
  ),
};
