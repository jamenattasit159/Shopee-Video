import React from "react";
import { AbsoluteFill } from "remotion";
import { PALETTE } from "../lib/palette";
import { PackDefinition } from "./types";

export const notebookDoodlePack: PackDefinition = {
  id: "notebook-doodle",
  name: "Notebook Doodle",
  concept: "สมุดกริดคณิตศาสตร์ ปากกาเน้นข้อความ เส้นวาดมือลูกศรและวงกลม",
  tempo: "snappy",
  holdFrames: 3,
  defaultBg: "#FFF8EA",
  preferredTransitions: ["torn-wipe", "page-shuffle", "slap-strip"],
  renderBackground: ({ bg, overlayOpacity = 0.1 } = {}) => (
    <AbsoluteFill
      style={{
        backgroundColor: bg || "#FFF8EA",
        backgroundImage: `
          linear-gradient(to right, rgba(0, 0, 0, 0.08) 2px, transparent 2px),
          linear-gradient(to bottom, rgba(0, 0, 0, 0.08) 2px, transparent 2px)
        `,
        backgroundSize: "36px 36px",
      }}
    >
      {/* Red margin binder line on left */}
      <div
        style={{
          position: "absolute",
          top: 0,
          bottom: 0,
          left: "48px",
          width: "4px",
          backgroundColor: "rgba(239, 68, 68, 0.4)",
        }}
      />
    </AbsoluteFill>
  ),
  renderBadge: (text, color = PALETTE.markerYellow) => (
    <div
      style={{
        backgroundColor: color,
        color: PALETTE.ink,
        padding: "6px 20px",
        borderRadius: "6px",
        boxShadow: "3px 4px 0px rgba(0,0,0,0.3)",
        border: "2px solid #1B1B1B",
        transform: "rotate(1.5deg)",
        fontSize: "30px",
        fontWeight: 800,
      }}
    >
      ✏️ {text}
    </div>
  ),
};
