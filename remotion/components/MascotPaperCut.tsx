import React from "react";
import { Img } from "remotion";

const PAPER_SHADOW = "#CFC6B4";

/**
 * Mascot as a scissor-cut paper sticker: a white border grown from the image alpha, roughened with
 * noise, and re-cut every few frames so it boils like stop-motion while the pose itself holds still.
 */
export const MascotPaperCut: React.FC<{
  id: string;
  src: string;
  frame: number;
  style: React.CSSProperties;
  recutEvery?: number;
}> = ({ id, src, frame, style, recutEvery = 4 }) => {
  const step = Math.floor(frame / recutEvery);
  const filterId = `mascot-cut-${id}`;
  const tilt = Math.sin(step * 1.7) * 0.8;
  return (
    <>
      <svg width={0} height={0} style={{ position: "absolute" }} aria-hidden>
        <defs>
          <filter id={filterId} x="-12%" y="-8%" width="124%" height="116%" colorInterpolationFilters="sRGB">
            <feMorphology in="SourceAlpha" operator="dilate" radius={9} result="grow" />
            <feTurbulence type="fractalNoise" baseFrequency={0.035} numOctaves={2} seed={step % 97} result="noise" />
            <feDisplacementMap in="grow" in2="noise" scale={16} xChannelSelector="R" yChannelSelector="G" result="rough" />
            <feComponentTransfer in="rough" result="cut">
              <feFuncA type="discrete" tableValues="0 1" />
            </feComponentTransfer>
            <feFlood floodColor="#FFFFFF" result="white" />
            <feComposite in="white" in2="cut" operator="in" result="paper" />
            <feFlood floodColor={PAPER_SHADOW} result="tan" />
            <feComposite in="tan" in2="cut" operator="in" result="shadowShape" />
            <feOffset in="shadowShape" dx={5 + (step % 3)} dy={7} result="shadow" />
            <feMerge>
              <feMergeNode in="shadow" />
              <feMergeNode in="paper" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
      </svg>
      <Img
        src={src}
        style={{ ...style, filter: `url(#${filterId})`, transform: `${style.transform || ""} rotate(${tilt}deg)`.trim() }}
      />
    </>
  );
};
