import React from "react";
import { AbsoluteFill } from "remotion";
import { PALETTE } from "../lib/palette";
import { PackDefinition } from "./types";

export const comicPopartPack: PackDefinition = {
  id: "comic-popart",
  name: "Comic Pop-Art",
  concept: "การ์ตูนป๊อปอาร์ต จุดฮาล์ฟโทนใหญ่ กรอบเส้นดำหนา บอลลูนคำพูด BAM!",
  tempo: "hyper",
  holdFrames: 2,
  defaultBg: "#FFEB3B",
  preferredTransitions: ["slap-strip", "torn-wipe", "page-shuffle"],
  renderBackground: ({ bg } = {}) => (
    <AbsoluteFill
      style={{
        backgroundColor: bg || "#FFEB3B",
        backgroundImage: `radial-gradient(#1B1B1B 20%, transparent 22%)`,
        backgroundSize: "28px 28px",
      }}
    >
      {/* Black comic frame border */}
      <div
        style={{
          position: "absolute",
          inset: "24px",
          border: "12px solid #1B1B1B",
          pointerEvents: "none",
        }}
      />
      {/* Decorative comic action star text */}
      <div
        style={{
          position: "absolute",
          top: "120px",
          right: "50px",
          backgroundColor: "#FF1744",
          color: "#FFFFFF",
          padding: "6px 18px",
          fontWeight: 900,
          fontSize: "28px",
          border: "4px solid #1B1B1B",
          transform: "rotate(12deg)",
          boxShadow: "5px 5px 0px #1B1B1B",
        }}
      >
        POW!
      </div>
    </AbsoluteFill>
  ),
  renderBadge: (text, color = "#FF1744") => (
    <div
      style={{
        backgroundColor: color,
        color: "#FFFFFF",
        padding: "8px 24px",
        borderRadius: "0px",
        border: "5px solid #1B1B1B",
        boxShadow: "6px 6px 0px #1B1B1B",
        transform: "rotate(-3deg)",
        fontSize: "30px",
        fontWeight: 900,
        letterSpacing: "0.5px",
      }}
    >
      💥 {text}
    </div>
  ),
};
