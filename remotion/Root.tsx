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
  const totalSeconds = hookDuration + scenesDuration + ctaDuration;
  return Math.max(30, Math.round(totalSeconds * fps));
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
