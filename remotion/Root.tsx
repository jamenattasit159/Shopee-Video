import React from "react";
import { Composition } from "remotion";
import { defaultShopeeVideoProps, ShopeeProductVideo } from "./ShopeeProductVideo";
import { ShopeeProductVideoProps } from "./types";

export const calculateTotalFrames = (
  props: ShopeeProductVideoProps,
  fps: number = 30
): number => {
  const hookDuration = props.hook?.durationSec || 3;
  const scenesDuration = (props.scenes || []).reduce(
    (sum, s) => sum + (s.durationSec || 4),
    0
  );
  const ctaDuration = props.cta?.durationSec || 3;
  const visualTotalSeconds = hookDuration + scenesDuration + ctaDuration;

  // Audio-First safety: If audioDurationSec is provided, video MUST cover it plus tail buffer
  const audioTotalSeconds = props.audioDurationSec
    ? props.audioDurationSec + (props.tailBufferSec || 0.8)
    : 0;

  const minRequiredFrames = Math.max(
    Math.round(visualTotalSeconds * fps),
    Math.round(audioTotalSeconds * fps)
  );

  const explicitFrames =
    props.actualDurationFrames && props.actualDurationFrames > 0
      ? Math.round(props.actualDurationFrames)
      : 0;

  // Audio-First guarantee: Video length must NEVER be shorter than the audio + tail buffer or visual storyboard
  return Math.max(30, Math.max(explicitFrames, minRequiredFrames));
};

export const RemotionRoot: React.FC = () => {
  const defaultDurationInFrames = calculateTotalFrames(defaultShopeeVideoProps, 30);

  return (
    <>
      <Composition<any, ShopeeProductVideoProps>
        id="ShopeeProductVideo"
        component={ShopeeProductVideo}
        durationInFrames={defaultDurationInFrames}
        fps={30}
        width={1080}
        height={1920}
        defaultProps={defaultShopeeVideoProps}
        calculateMetadata={({ props }) => {
          return {
            durationInFrames: calculateTotalFrames(props, 30),
            props,
          };
        }}
      />
    </>
  );
};
