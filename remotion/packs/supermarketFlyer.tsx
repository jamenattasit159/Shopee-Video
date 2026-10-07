import React from "react";
import { AbsoluteFill } from "remotion";
import { PALETTE } from "../lib/palette";
import { PackDefinition } from "./types";

export const supermarketFlyerPack: PackDefinition = {
  id: "supermarket-flyer",
  name: "Supermarket Flyer",
  concept: "ใบปลิวห้าง ป้ายราคาตลาดสีแดงเหลือง ดาวระเบิดลดแหลก ดีลเดือด",
  tempo: "hyper",
  holdFrames: 2,
  defaultBg: "#FFE500",
  preferredTransitions: ["slap-strip", "torn-wipe", "page-shuffle"],
  renderBackground: ({ bg } = {}) => (
    <AbsoluteFill
      style={{
        backgroundColor: bg || "#FFE500",
        backgroundImage: `
          repeating-linear-gradient(
            45deg,
            rgba(255, 0, 0, 0.08),
            rgba(255, 0, 0, 0.08) 20px,
            transparent 20px,
            transparent 40px
          )
        `,
      }}
    >
      {/* Top red SALE bar banner */}
      <div
        style={{
          position: "absolute",
          top: "120px",
          left: 0,
          right: 0,
          height: "48px",
          backgroundColor: "#D50000",
          color: "#FFFFFF",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-around",
          fontSize: "24px",
          fontWeight: 900,
          letterSpacing: "4px",
          boxShadow: "0 4px 8px rgba(0,0,0,0.25)",
        }}
      >
        <span>★ SALE ★</span>
        <span>★ ด่วนลดพิเศษ ★</span>
        <span>★ SALE ★</span>
      </div>
    </AbsoluteFill>
  ),
  renderBadge: (text, color = "#D50000") => (
    <div
      style={{
        backgroundColor: color,
        color: "#FFE500",
        padding: "8px 26px",
        borderRadius: "4px",
        border: "3px solid #FFE500",
        boxShadow: "5px 6px 0px rgba(0,0,0,0.6)",
        transform: "rotate(-2.5deg)",
        fontSize: "30px",
        fontWeight: 900,
        letterSpacing: "1px",
      }}
    >
      🔥 {text}
    </div>
  ),
};
