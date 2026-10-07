import React from "react";

export interface PaperFiltersProps {
  seed: number;
}

/**
 * Root SVG filters for paper collage style:
 * - #torn: fractal noise displacement for hand-torn paper edges
 * - #sticker: white outline dilation + hard drop shadow
 * - #grain: fine paper grain texture
 */
export const PaperFilters: React.FC<PaperFiltersProps> = ({ seed }) => {
  return (
    <svg
      width="0"
      height="0"
      style={{ position: "absolute", pointerEvents: "none", opacity: 0 }}
      aria-hidden="true"
    >
      <defs>
        {/* Hand-torn paper edge displacement */}
        <filter id="torn" x="-10%" y="-10%" width="120%" height="120%">
          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.035"
            numOctaves={2}
            seed={seed}
            result="noise"
          />
          <feDisplacementMap in="SourceGraphic" in2="noise" scale={12} />
        </filter>

        {/* Sticker cutout outline + offset hard shadow */}
        <filter id="sticker" x="-20%" y="-20%" width="140%" height="140%">
          <feMorphology
            in="SourceAlpha"
            operator="dilate"
            radius={10}
            result="dilated"
          />
          <feFlood floodColor="#FFFFFF" result="white" />
          <feComposite in="white" in2="dilated" operator="in" result="outline" />
          <feOffset in="dilated" dx={8} dy={10} result="shadowShape" />
          <feFlood floodColor="#000000" floodOpacity={0.35} result="shadowColor" />
          <feComposite
            in="shadowColor"
            in2="shadowShape"
            operator="in"
            result="shadow"
          />
          <feMerge>
            <feMergeNode in="shadow" />
            <feMergeNode in="outline" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>

        {/* Paper surface grain overlay */}
        <filter id="grain">
          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.8"
            numOctaves={2}
            seed={seed}
          />
          <feColorMatrix values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 0.5 0" />
        </filter>
      </defs>
    </svg>
  );
};
