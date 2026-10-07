import React from "react";
import { AbsoluteFill } from "remotion";
import { PALETTE } from "../lib/palette";
import { PackDefinition } from "./types";

export const stickerBombPack: PackDefinition = {
  id: "sticker-bomb",
  name: "Sticker Bomb",
  concept: "สติกเกอร์ระเบิดสีสด Memphis รูปทรงเรขาคณิต ขอบหนาดำ ลอยทั่วจอ",
  tempo: "hyper",
  holdFrames: 2,
  defaultBg: "#70E4EF",
  preferredTransitions: ["slap-strip", "torn-wipe", "page-shuffle"],
  renderBackground: ({ bg } = {}) => (
    <AbsoluteFill
      style={{
        backgroundColor: bg || "#70E4EF",
        backgroundImage: `
          radial-gradient(#FF007A 16%, transparent 18%),
          radial-gradient(#FFE600 16%, transparent 18%)
        `,
        backgroundSize: "44px 44px",
        backgroundPosition: "0 0, 22px 22px",
      }}
    >
      {/* Decorative Memphis floating zigzag/plus marks */}
      <div
        style={{
          position: "absolute",
          top: "140px",
          right: "40px",
          fontSize: "40px",
          color: "#000000",
          fontWeight: 900,
          transform: "rotate(15deg)",
          userSelect: "none",
        }}
      >
        ✦ ✕ ▲
      </div>
      <div
        style={{
          position: "absolute",
          bottom: "160px",
          left: "40px",
          fontSize: "36px",
          color: "#000000",
          fontWeight: 900,
          transform: "rotate(-12deg)",
          userSelect: "none",
        }}
      >
        ● ■ ★
      </div>
    </AbsoluteFill>
  ),
  renderBadge: (text, color = "#FF007A") => (
    <div
      style={{
        backgroundColor: color,
        color: "#FFFFFF",
        padding: "8px 24px",
        borderRadius: "999px",
        border: "4px solid #000000",
        boxShadow: "5px 6px 0px #000000",
        transform: "rotate(-3deg)",
        fontSize: "30px",
        fontWeight: 900,
        letterSpacing: "0.5px",
      }}
    >
      ⚡ {text}
    </div>
  ),
};
