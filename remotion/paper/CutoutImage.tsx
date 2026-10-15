import React from "react";
import { Freeze, Img, OffthreadVideo, useCurrentFrame, useVideoConfig } from "remotion";
import { FONTS } from "../lib/palette";
import { useBoil, usePop } from "../lib/stopMotion";
import { isVideoMedia, resolveMediaSrc } from "../utils";
import { WashiTape } from "./WashiTape";

interface MediaElementProps {
  src: string;
  style?: React.CSSProperties;
  videoStartSec?: number;
  videoEndSec?: number;
  videoFillMode?: "freeze" | "error";
  videoAudioMode?: "mute" | "mix";
}

/**
 * Renders either a video clip (<OffthreadVideo>) or an image (<Img>) seamlessly.
 */
export const MediaElement: React.FC<MediaElementProps> = ({
  src,
  style,
  videoStartSec = 0,
  videoEndSec,
  videoFillMode = "freeze",
  videoAudioMode = "mute",
}) => {
  const { fps } = useVideoConfig();
  const frame = useCurrentFrame();
  const resolvedSrc = resolveMediaSrc(src);
  const isVideo = isVideoMedia(src);

  if (isVideo) {
    const startFrom = Math.max(0, Math.round((videoStartSec || 0) * fps));
    const isMuted = videoAudioMode !== "mix";
    const endAt = videoEndSec === undefined ? undefined : Math.round(videoEndSec * fps);
    const available = endAt === undefined ? Infinity : endAt - startFrom;
    const frozen = frame >= available;
    const media = (
      <OffthreadVideo
        src={resolvedSrc}
        startFrom={startFrom}
        endAt={endAt}
        muted={isMuted || frozen}
        volume={isMuted ? 0 : 0.25}
        style={{
          width: "100%",
          height: "100%",
          objectFit: "cover",
          display: "block",
          ...style,
        }}
      />
    );
    if (frozen && videoFillMode === "error") throw new Error('ช่วงคลิปสั้นกว่าฉาก');
    return frozen ? <Freeze frame={Math.max(0, available - 1)}>{media}</Freeze> : media;
  }

  return (
    <Img
      src={resolvedSrc}
      style={{
        width: "100%",
        height: "100%",
        objectFit: "contain",
        display: "block",
        ...style,
      }}
    />
  );
};

interface CutoutImageProps {
  id: string;
  src: string;
  delay?: number;
  baseRotate?: number;
  width?: number;
  x?: number;
  y?: number;
  isPolaroid?: boolean;
  polaroidCaption?: string;
  showTape?: boolean;
  videoStartSec?: number;
  videoEndSec?: number;
  videoFillMode?: "freeze" | "error";
  videoAudioMode?: "mute" | "mix";
  children?: React.ReactNode;
  style?: React.CSSProperties;
}

export const CutoutImage: React.FC<CutoutImageProps> = ({
  id,
  src,
  delay = 0,
  baseRotate = -2,
  width = 820,
  x = 0,
  y = 0,
  isPolaroid = false,
  polaroidCaption,
  showTape = false,
  videoStartSec = 0,
  videoEndSec,
  videoFillMode,
  videoAudioMode = "mute",
  children,
  style = {},
}) => {
  const pop = usePop(delay);
  const boil = useBoil(id, 3, { rot: 0.8, pos: 2, scale: 0.01 });
  const isVideo = isVideoMedia(src);

  // Clamp rotation
  const clampedRotate = Math.max(-5, Math.min(5, baseRotate + boil.rotate * 0.4));

  if (isPolaroid) {
    const polaroidTilt = Math.max(-3, Math.min(3, baseRotate));

    return (
      <div
        style={{
          position: "absolute",
          left: "50%",
          top: "50%",
          width,
          transform: `translate(-50%, -50%) translate(${x + boil.x}px, ${y + boil.y}px) rotate(${polaroidTilt + boil.rotate * 0.2}deg) scale(${pop * boil.scale})`,
          transformOrigin: "center center",
          background: "#FFFBF2",
          padding: "24px 24px 64px 24px",
          boxShadow: "10px 16px 32px rgba(0,0,0,0.35)",
          border: "2px solid rgba(0,0,0,0.06)",
          zIndex: 15,
          ...style,
        }}
      >
        {showTape && (
          <WashiTape
            id={`${id}-tape`}
            x={width * 0.35}
            y={-18}
            rotate={-2}
            width={140}
          />
        )}
        <div
          style={{
            width: "100%",
            aspectRatio: "1/1",
            overflow: "hidden",
            backgroundColor: "#0F172A",
            boxShadow: "inset 0 0 10px rgba(0,0,0,0.08)",
            borderRadius: "14px",
          }}
        >
          <MediaElement
            src={src}
            videoStartSec={videoStartSec}
            videoEndSec={videoEndSec}
            videoFillMode={videoFillMode}
            videoAudioMode={videoAudioMode}
            style={{
              width: "100%",
              height: "100%",
              objectFit: isVideo ? "cover" : "contain",
              padding: isVideo ? "0px" : "12px",
              backgroundColor: isVideo ? "#0F172A" : "#F8FAFC",
            }}
          />
        </div>
        {polaroidCaption && (
          <div
            style={{
              marginTop: "20px",
              textAlign: "center",
              fontFamily: FONTS.handwriting,
              fontSize: "44px",
              fontWeight: 700,
              color: "#1B1B1B",
              lineHeight: 1.2,
            }}
          >
            {polaroidCaption}
          </div>
        )}
      </div>
    );
  }

  return (
    <div
      style={{
        position: "absolute",
        left: "50%",
        top: "55%",
        width,
        transform: `translate(-50%, -50%) translate(${x + boil.x}px, ${y + boil.y}px) rotate(${clampedRotate}deg) scale(${pop * boil.scale})`,
        transformOrigin: "center center",
        filter:
          "drop-shadow(0 0 10px #FFFFFF) drop-shadow(0 0 3px #FFFFFF) drop-shadow(10px 14px 0px rgba(0, 0, 0, 0.4))",
        zIndex: 15,
        ...style,
      }}
    >
      {showTape && (
        <WashiTape
          id={`${id}-tape`}
          x={width * 0.36}
          y={20}
          rotate={-8}
          width={130}
          height={36}
        />
      )}
      {isVideo ? (
        <div
          style={{
            width: "100%",
            height: "780px",
            borderRadius: "32px",
            overflow: "hidden",
            border: "4px solid rgba(255,255,255,0.85)",
            backgroundColor: "#0F172A",
          }}
        >
          <MediaElement
            src={src}
            videoStartSec={videoStartSec}
            videoEndSec={videoEndSec}
            videoFillMode={videoFillMode}
            videoAudioMode={videoAudioMode}
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
          />
        </div>
      ) : (
        <MediaElement
          src={src}
          style={{
            width: "100%",
            maxHeight: "880px",
            objectFit: "contain",
          }}
        />
      )}
      {children}
    </div>
  );
};
