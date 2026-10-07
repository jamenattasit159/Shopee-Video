import { ShoppingBag } from "lucide-react";
import React from "react";
import { FONTS, PALETTE } from "../lib/palette";
import { useBoil, useStepFrame } from "../lib/stopMotion";

interface CartCTAProps {
  productName?: string;
  price?: string;
  buttonText?: string;
  delay?: number;
}

export const CartCTA: React.FC<CartCTAProps> = ({
  productName,
  price,
  buttonText = "ช้อปเลยที่ Shopee",
  delay = 0,
}) => {
  const boil = useBoil("cart-cta", 3, { rot: 0.8, pos: 1.5, scale: 0.012 });
  const stepFrame = useStepFrame(3);

  // Stepped bounce rhythm for stop-motion effect
  const bounceCycle = Math.sin((stepFrame / 6) * Math.PI);
  const bounceY = Math.round(bounceCycle * 10);
  const pointerBounceX = Math.round(Math.cos((stepFrame / 6) * Math.PI) * 6);

  return (
    <div
      style={{
        position: "absolute",
        left: "48px",
        bottom: "80px", // Calibrated for Shopee Video mobile basket location
        zIndex: 50,
        display: "flex",
        flexDirection: "column",
        alignItems: "flex-start",
        gap: "14px",
        pointerEvents: "none",
        transform: `translate(${boil.x}px, ${boil.y + bounceY}px) rotate(${boil.rotate - 1}deg)`,
      }}
    >
      {/* 👆 Pointing Down-Left Arrow / Indicator Sticker */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "12px",
          background: PALETTE.sunnyYellow,
          color: PALETTE.ink,
          fontFamily: FONTS.heading,
          fontWeight: 800,
          fontSize: "32px",
          padding: "10px 22px",
          borderRadius: "14px",
          border: `3px solid ${PALETTE.white}`,
          boxShadow: "4px 6px 0px rgba(0,0,0,0.45)",
          transform: `translateX(${pointerBounceX}px) rotate(-3deg)`,
          filter: "url(#torn)",
        }}
      >
        <span style={{ fontSize: "36px", lineHeight: 1 }}>👇</span>
        <span>กดตรงนี้เลย ตะกร้าส้ม!</span>
      </div>

      {/* 🛒 Main Sticker Badge */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "18px",
          background: PALETTE.shopeeOrange,
          border: `5px solid ${PALETTE.white}`,
          borderRadius: "28px",
          padding: "18px 30px",
          boxShadow: "8px 12px 0px rgba(0, 0, 0, 0.45)",
          transformOrigin: "left bottom",
        }}
      >
        {/* White shopping bag icon sticker */}
        <div
          style={{
            width: "64px",
            height: "64px",
            backgroundColor: PALETTE.white,
            borderRadius: "18px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: "2px 4px 6px rgba(0,0,0,0.25)",
            transform: `rotate(${boil.rotate * 2}deg)`,
          }}
        >
          <ShoppingBag className="w-10 h-10" color={PALETTE.shopeeOrange} strokeWidth={2.8} />
        </div>

        {/* Text information (Expanded for legibility) */}
        <div style={{ display: "flex", flexDirection: "column" }}>
          {productName && (
            <div
              style={{
                fontFamily: FONTS.heading,
                fontWeight: 800,
                fontSize: "28px",
                color: PALETTE.white,
                maxWidth: "380px",
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
                WebkitTextStroke: "0.03em rgba(0,0,0,0.4)",
              }}
            >
              {productName}
            </div>
          )}

          <div style={{ display: "flex", alignItems: "center", gap: "12px", marginTop: "4px" }}>
            {price && (
              <span
                style={{
                  fontFamily: FONTS.heading,
                  fontWeight: 800,
                  fontSize: "36px",
                  color: PALETTE.sunnyYellow,
                  WebkitTextStroke: "0.04em rgba(0,0,0,0.6)",
                }}
              >
                {price}
              </span>
            )}
            <span
              style={{
                backgroundColor: PALETTE.white,
                color: PALETTE.shopeeOrange,
                fontFamily: FONTS.heading,
                fontWeight: 800,
                fontSize: "24px",
                padding: "4px 16px",
                borderRadius: "999px",
                boxShadow: "0 2px 5px rgba(0,0,0,0.2)",
              }}
            >
              {buttonText}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
