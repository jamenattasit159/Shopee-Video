import { TransitionPresentation, TransitionPresentationComponentProps } from "@remotion/transitions";
import React, { useMemo } from "react";
import { AbsoluteFill } from "remotion";
import { PALETTE } from "../lib/palette";

// --- 1. SLAP STRIP TRANSITION ---
// Multiple colored paper strips slap across the frame in discrete stop-motion steps
const SlapStripPresentation: React.FC<TransitionPresentationComponentProps<any>> = ({
  children,
  presentationProgress,
  presentationDirection,
}) => {
  // Quantize progress to 4 stop-motion steps
  const step = Math.floor(presentationProgress * 5) / 5;

  const style = useMemo((): React.CSSProperties => {
    if (presentationDirection === "exiting") {
      // Exiting scene stays underneath while paper strips slap over
      return {
        width: "100%",
        height: "100%",
        zIndex: 1,
      };
    }
    // Entering scene slides in as strips clear out
    const enterOffset = (1 - step) * 100;
    return {
      width: "100%",
      height: "100%",
      zIndex: 2,
      clipPath: `inset(0 ${enterOffset}% 0 0)`,
    };
  }, [presentationDirection, step]);

  return (
    <AbsoluteFill style={{ overflow: "hidden" }}>
      <AbsoluteFill style={style}>{children}</AbsoluteFill>

      {/* Slapping colored paper strips overlay during transition */}
      {presentationDirection === "entering" && step < 1 && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            pointerEvents: "none",
            zIndex: 10,
          }}
        >
          {/* Yellow strip */}
          <div
            style={{
              position: "absolute",
              top: 0,
              bottom: 0,
              width: "120px",
              left: `${(1 - step) * 100 - 10}%`,
              background: PALETTE.sunnyYellow,
              transform: "rotate(2deg) scale(1.1)",
              boxShadow: "10px 0 20px rgba(0,0,0,0.35)",
              filter: "url(#torn)",
            }}
          />
          {/* Shopee Orange strip */}
          <div
            style={{
              position: "absolute",
              top: 0,
              bottom: 0,
              width: "80px",
              left: `${(1 - step) * 100 - 4}%`,
              background: PALETTE.shopeeOrange,
              transform: "rotate(-1.5deg) scale(1.1)",
              boxShadow: "6px 0 16px rgba(0,0,0,0.3)",
              filter: "url(#torn)",
            }}
          />
        </div>
      )}
    </AbsoluteFill>
  );
};

export const slapStrip = (): TransitionPresentation<any> => ({
  component: SlapStripPresentation,
  props: {},
});

// --- 2. TORN WIPE TRANSITION ---
// Jagged torn paper edge wipe with paper tear edge line
const TornWipePresentation: React.FC<TransitionPresentationComponentProps<any>> = ({
  children,
  presentationProgress,
  presentationDirection,
}) => {
  // Quantize progress to 6 stop-motion steps
  const step = Math.floor(presentationProgress * 6) / 6;
  const p = Math.round(step * 100);

  const style = useMemo((): React.CSSProperties => {
    if (presentationDirection === "exiting") {
      return { width: "100%", height: "100%", zIndex: 1 };
    }

    if (step >= 1) {
      return { width: "100%", height: "100%", zIndex: 3 };
    }

    // Jagged torn paper polygon clip-path (scaled to clear edge completely)
    const pVal = Math.round(step * 110);
    const clip = `polygon(
      0% 0%,
      ${pVal + 4}% 0%,
      ${pVal - 2}% 15%,
      ${pVal + 6}% 30%,
      ${pVal - 4}% 45%,
      ${pVal + 5}% 60%,
      ${pVal - 3}% 75%,
      ${pVal + 7}% 90%,
      ${pVal}% 100%,
      0% 100%
    )`;

    return {
      width: "100%",
      height: "100%",
      zIndex: 3,
      clipPath: clip,
    };
  }, [presentationDirection, p]);

  return (
    <AbsoluteFill style={{ overflow: "hidden" }}>
      <AbsoluteFill style={style}>{children}</AbsoluteFill>

      {/* White torn edge fray indicator */}
      {presentationDirection === "entering" && step > 0 && step < 1 && (
        <div
          style={{
            position: "absolute",
            top: 0,
            bottom: 0,
            left: `${p - 2}%`,
            width: "36px",
            background: "#FFFBF0",
            filter: "url(#torn)",
            boxShadow: "8px 0 16px rgba(0,0,0,0.4)",
            zIndex: 4,
            pointerEvents: "none",
            transform: "rotate(1deg)",
          }}
        />
      )}
    </AbsoluteFill>
  );
};

export const tornWipe = (): TransitionPresentation<any> => ({
  component: TornWipePresentation,
  props: {},
});

// --- 3. PAGE SHUFFLE TRANSITION ---
// Paper card slides and tosses away like a card deck shuffle
const PageShufflePresentation: React.FC<TransitionPresentationComponentProps<any>> = ({
  children,
  presentationProgress,
  presentationDirection,
}) => {
  const step = Math.floor(presentationProgress * 5) / 5;

  const style = useMemo((): React.CSSProperties => {
    if (presentationDirection === "exiting") {
      const offsetX = -step * 110;
      const rot = -step * 14;
      return {
        width: "100%",
        height: "100%",
        transform: `translateX(${offsetX}%) rotate(${rot}deg)`,
        transformOrigin: "center bottom",
        boxShadow: "20px 0 30px rgba(0,0,0,0.5)",
        zIndex: 2,
      };
    }
    // Entering scene scales up slightly from behind
    const scale = 0.94 + step * 0.06;
    return {
      width: "100%",
      height: "100%",
      transform: `scale(${scale})`,
      transformOrigin: "center center",
      zIndex: 1,
    };
  }, [presentationDirection, step]);

  return (
    <AbsoluteFill style={{ overflow: "hidden" }}>
      <AbsoluteFill style={style}>{children}</AbsoluteFill>
    </AbsoluteFill>
  );
};

export const pageShuffle = (): TransitionPresentation<any> => ({
  component: PageShufflePresentation,
  props: {},
});
