import React from "react";
import { AbsoluteFill } from "remotion";
import { PALETTE } from "../lib/palette";
import { PaperBackground } from "../paper/PaperBackground";
import { PackDefinition } from "./types";

export const kraftScrapbookPack: PackDefinition = {
  id: "kraft-scrapbook",
  name: "Kraft Scrapbook",
  concept: "กระดาษคราฟต์ โพลารอยด์ เทปกาว โทนอุ่นแบบสมุดบันทึก",
  tempo: "snappy",
  holdFrames: 3,
  defaultBg: "#DDB88C",
  preferredTransitions: ["slap-strip", "torn-wipe", "page-shuffle"],
  renderBackground: ({ bg, overlayOpacity = 0.12 } = {}) => (
    <PaperBackground theme="kraft" overlayOpacity={overlayOpacity} />
  ),
  renderBadge: (text, color = PALETTE.shopeeOrange) => (
    <div
      style={{
        backgroundColor: color,
        color: PALETTE.white,
        padding: "8px 22px",
        borderRadius: "8px",
        boxShadow: "4px 6px 0px rgba(0,0,0,0.35)",
        filter: "url(#torn)",
        transform: "rotate(-2deg)",
        fontSize: "30px",
        fontWeight: 800,
      }}
    >
      {text}
    </div>
  ),
};
