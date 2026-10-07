import React from "react";
import { FONTS, PALETTE } from "../lib/palette";
import { StickerText } from "../paper/StickerText";
import { TornStrip } from "../paper/TornStrip";
import { WashiTape } from "../paper/WashiTape";

interface AnimatedTextBadgeProps {
  badge?: string;
  title: string;
  subtitle?: string;
  primaryColor?: string;
  accentColor?: string;
  top?: string;
}

export const AnimatedTextBadge: React.FC<AnimatedTextBadgeProps> = ({
  badge,
  title,
  subtitle,
  primaryColor = PALETTE.shopeeOrange,
  accentColor = PALETTE.sunnyYellow,
  top = "210px",
}) => {
  return (
    <div
      style={{
        position: "absolute",
        top,
        left: "60px",
        right: "150px",
        display: "flex",
        flexDirection: "column",
        alignItems: "flex-start",
        zIndex: 25,
      }}
    >
      {badge && (
        <div style={{ position: "relative", marginBottom: "12px" }}>
          <WashiTape id="badge-tape" x={-15} y={-10} rotate={-4} width={90} />
          <div
            style={{
              backgroundColor: primaryColor,
              color: PALETTE.white,
              fontFamily: FONTS.heading,
              fontWeight: 900,
              fontSize: "24px",
              padding: "6px 16px",
              borderRadius: "6px",
              boxShadow: "3px 4px 0px rgba(0,0,0,0.3)",
              filter: "url(#torn)",
            }}
          >
            {badge}
          </div>
        </div>
      )}

      <TornStrip
        id="badge-title-strip"
        bg={accentColor}
        textColor={PALETTE.ink}
        fontSize={48}
        rotate={-1.5}
        padding="12px 28px"
      >
        {title}
      </TornStrip>

      {subtitle && (
        <div style={{ marginTop: "12px" }}>
          <StickerText
            id="badge-subtitle"
            text={subtitle}
            fontSize={32}
            color={PALETTE.white}
            strokeColor={PALETTE.ink}
            strokeWidth={4}
            rotate={1}
          />
        </div>
      )}
    </div>
  );
};
