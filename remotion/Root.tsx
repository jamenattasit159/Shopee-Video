import React from "react";
import { Composition, Still } from "remotion";
import { defaultShopeeVideoProps, ShopeeProductVideo } from "./ShopeeProductVideo";
import { CoverStill } from "./CoverStill";
import { ShopeeProductVideoProps } from "./types";
export { calculateTotalFrames } from "./lib/duration";
import { calculateTotalFrames } from "./lib/duration";

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
      <Still
        id="CoverStill"
        component={CoverStill}
        width={1080}
        height={1920}
        defaultProps={defaultShopeeVideoProps}
      />
    </>
  );
};
