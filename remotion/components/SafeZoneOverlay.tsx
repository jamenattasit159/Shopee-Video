import React from "react";
import { AbsoluteFill } from "./AbsoluteFill";

interface SafeZoneOverlayProps {
  platform?: "shopee" | "tiktok";
}

export const SafeZoneOverlay: React.FC<SafeZoneOverlayProps> = ({
  platform = "shopee",
}) => {
  return (
    <AbsoluteFill
      style={{
        pointerEvents: "none",
        zIndex: 999,
      }}
    >
      {/* 1. TOP RED ZONE (Top Bar / Navigation) */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: "180px",
          backgroundColor: "rgba(239, 68, 68, 0.28)",
          borderBottom: "2px dashed #EF4444",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          color: "#FFFFFF",
          fontSize: "20px",
          fontWeight: 800,
          textShadow: "0 2px 4px rgba(0,0,0,0.8)",
        }}
      >
        <span style={{ background: "#EF4444", padding: "4px 14px", borderRadius: "8px" }}>
          🚨 TOP RED ZONE (แถบสถานะ & ค้นหาของแอพ)
        </span>
        <div
          style={{
            display: "flex",
            gap: "24px",
            fontSize: "24px",
            marginTop: "8px",
            opacity: 0.8,
          }}
        >
          <span>ติดตาม</span>
          <span style={{ borderBottom: "3px solid #FFF", fontWeight: 900 }}>สำหรับคุณ</span>
        </div>
      </div>

      {/* 2. RIGHT RED ZONE (Action Buttons: Profile, Like, Comment, Bookmark, Share) */}
      <div
        style={{
          position: "absolute",
          top: "600px",
          right: 0,
          width: "160px",
          bottom: "380px",
          backgroundColor: "rgba(239, 68, 68, 0.32)",
          borderLeft: "2px dashed #EF4444",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "space-evenly",
          color: "#FFFFFF",
          padding: "10px 0",
        }}
      >
        <div style={{ textAlign: "center" }}>
          <div
            style={{
              width: "56px",
              height: "56px",
              borderRadius: "50%",
              background: "#3B82F6",
              border: "3px solid #FFF",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "26px",
              margin: "0 auto",
            }}
          >
            👤
          </div>
          <span style={{ fontSize: "16px", fontWeight: 800 }}>โปรไฟล์</span>
        </div>

        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: "36px" }}>❤️</div>
          <span style={{ fontSize: "16px", fontWeight: 800 }}>24.8K</span>
        </div>

        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: "36px" }}>💬</div>
          <span style={{ fontSize: "16px", fontWeight: 800 }}>820</span>
        </div>

        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: "36px" }}>⭐</div>
          <span style={{ fontSize: "16px", fontWeight: 800 }}>3.4K</span>
        </div>

        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: "36px" }}>↗️</div>
          <span style={{ fontSize: "16px", fontWeight: 800 }}>แชร์</span>
        </div>

        <div
          style={{
            width: "50px",
            height: "50px",
            borderRadius: "50%",
            background: "#111827",
            border: "3px solid #E5E7EB",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "20px",
          }}
        >
          🎵
        </div>
      </div>

      {/* 3. BOTTOM RED ZONE (Caption, Music, Tab Bar & Platform Basket) */}
      <div
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          height: "360px",
          backgroundColor: "rgba(239, 68, 68, 0.28)",
          borderTop: "2px dashed #EF4444",
          padding: "20px 40px",
          color: "#FFFFFF",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
        }}
      >
        <div>
          <span
            style={{
              background: "#EF4444",
              padding: "4px 14px",
              borderRadius: "8px",
              fontSize: "20px",
              fontWeight: 800,
            }}
          >
            🚨 BOTTOM RED ZONE (แคปชั่น, เสียงเพลง, แถบแท็บด้านล่าง)
          </span>

          <div style={{ marginTop: "12px", opacity: 0.9 }}>
            <div style={{ fontSize: "24px", fontWeight: 800 }}>@shopee_affiliate_official</div>
            <div style={{ fontSize: "20px", marginTop: "4px", color: "#E5E7EB" }}>
              ป้ายยาไอเทมเด็ดวันนี้ คุ้มมากกก #Shopeeป้ายยา #รีวิวช้อปปี้... ดูเพิ่มเติม
            </div>
            <div style={{ fontSize: "18px", marginTop: "8px", opacity: 0.8 }}>
              🎵 เสียงต้นฉบับ - Shopee Official Viral Beat
            </div>
          </div>
        </div>

        {/* Fake bottom navigation bar */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-around",
            borderTop: "1px solid rgba(255,255,255,0.2)",
            paddingTop: "10px",
            fontSize: "20px",
            fontWeight: 700,
            opacity: 0.75,
          }}
        >
          <span>หน้าแรก</span>
          <span>เพื่อน</span>
          <span style={{ fontSize: "28px" }}>➕</span>
          <span>กล่องข้อความ</span>
          <span>ฉัน</span>
        </div>
      </div>

      {/* 4. GREEN SAFE ZONE BOX */}
      <div
        style={{
          position: "absolute",
          top: "190px",
          left: "50px",
          right: "170px",
          bottom: "370px",
          border: "3px solid #10B981",
          borderRadius: "24px",
          boxShadow: "0 0 25px rgba(16, 185, 129, 0.35)",
        }}
      >
        <div
          style={{
            position: "absolute",
            top: "12px",
            left: "14px",
            background: "#10B981",
            color: "#FFFFFF",
            fontSize: "16px",
            fontWeight: 800,
            padding: "4px 12px",
            borderRadius: "6px",
          }}
        >
          ✅ SAFE ZONE (พื้นที่ปลอดภัย 100% สำหรับข้อความ/จุดเด่นสินค้า)
        </div>
      </div>
    </AbsoluteFill>
  );
};
