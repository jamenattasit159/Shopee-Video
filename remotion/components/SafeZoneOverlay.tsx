import React from "react";
import { redZoneRects, SAFE_ZONE } from "../lib/layoutGuard";

/** SVG viewBox scales the same 1080x1920 coordinates at every preview size. */
export const SafeZoneOverlay: React.FC<{ platform?: "shopee" | "tiktok" }> = () => {
  const zones = redZoneRects();
  return <svg viewBox="0 0 1080 1920" width="100%" height="100%" preserveAspectRatio="none" aria-label="ไกด์ Red Zone" style={{ position: "absolute", inset: 0, pointerEvents: "none", zIndex: 999 }}>
    {Object.entries(zones).map(([key, box]) => <rect key={key} {...box} fill="#ef4444" fillOpacity="0.28" stroke="#ef4444" strokeWidth="3" strokeDasharray="12 8" />)}
    <rect x={SAFE_ZONE.left} y={SAFE_ZONE.top} width={SAFE_ZONE.right - SAFE_ZONE.left} height={SAFE_ZONE.bottom - SAFE_ZONE.top} rx="20" fill="none" stroke="#10b981" strokeWidth="4" />
    <g fill="white" fontFamily="Tahoma, sans-serif" fontSize="28">
      <text x="540" y="100" textAnchor="middle">พื้นที่แถบด้านบน</text>
      <text x="540" y="1800" textAnchor="middle">พื้นที่แคปชั่นและปุ่มของแพลตฟอร์ม</text>
      <text x={SAFE_ZONE.left + 20} y={SAFE_ZONE.top + 42}>วางข้อความสำคัญภายในกรอบ</text>
    </g>
  </svg>;
};
