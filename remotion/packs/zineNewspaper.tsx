import React from "react";
import { AbsoluteFill } from "remotion";
import { PALETTE } from "../lib/palette";
import { PackDefinition } from "./types";

export const zineNewspaperPack: PackDefinition = {
  id: "zine-newspaper",
  name: "Zine Newspaper",
  concept: "หนังสือพิมพ์ทำมือ สไตล์ตัดแปะ ขาวดำ ตัดขอบหยาบ พาดหัวข่าวเด่น",
  tempo: "hyper",
  holdFrames: 2,
  defaultBg: "#EDE8DF",
  preferredTransitions: ["page-shuffle", "slap-strip", "torn-wipe"],
  renderBackground: ({ bg } = {}) => (
    <AbsoluteFill
      style={{
        backgroundColor: bg || "#EDE8DF",
        backgroundImage: `
          radial-gradient(#1B1B1B 0.8px, transparent 0.8px),
          radial-gradient(#1B1B1B 0.8px, #EDE8DF 0.8px)
        `,
        backgroundSize: "20px 20px",
        backgroundPosition: "0 0, 10px 10px",
        opacity: 0.95,
      }}
    >
      {/* Newspaper headline top bar banner */}
      <div
        style={{
          position: "absolute",
          top: "120px",
          left: "40px",
          right: "40px",
          height: "6px",
          backgroundColor: "#1B1B1B",
        }}
      />
    </AbsoluteFill>
  ),
  renderBadge: (text) => (
    <div
      style={{
        backgroundColor: "#1B1B1B",
        color: "#FFFFFF",
        padding: "6px 20px",
        borderRadius: "0px",
        boxShadow: "5px 5px 0px rgba(0,0,0,0.5)",
        transform: "rotate(-1deg)",
        fontSize: "30px",
        fontWeight: 900,
        letterSpacing: "1px",
      }}
    >
      📰 {text}
    </div>
  ),
};
