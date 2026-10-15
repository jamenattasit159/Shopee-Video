import React from "react";
import { Composition, Still } from "remotion";
import { defaultShopeeVideoProps, ShopeeProductVideo } from "./ShopeeProductVideo";
import { CoverStill } from "./CoverStill";
import { CreatorVideo } from "./CreatorVideo";
import { HybridProductVideo } from "./HybridProductVideo";
import { ResolvedTimeline } from "../src/lib/workspace/types";
import { projectFrames, StudioProject } from "../src/lib/studio";
import { ShopeeProductVideoProps } from "./types";
export { calculateTotalFrames } from "./lib/duration";
import { calculateTotalFrames } from "./lib/duration";

export const RemotionRoot: React.FC = () => {
  const defaultDurationInFrames = calculateTotalFrames(defaultShopeeVideoProps, 30);

  return (
    <>
      <Composition id="HybridProductVideo" component={HybridProductVideo} width={1080} height={1920} fps={30} durationInFrames={30}
        defaultProps={{timeline:{durationFrames:30,scenes:[],captions:[],blockers:[],captionStyle:'highlight'} as ResolvedTimeline}}
        calculateMetadata={({props})=>({durationInFrames:Math.max(1,props.timeline.durationFrames)})}/>
      <Composition id="CreatorVideo" component={CreatorVideo} width={1080} height={1920} fps={30} durationInFrames={30}
        defaultProps={{ project: { id: "00000000-0000-4000-8000-000000000000", name: "คลิปใหม่", assets: [], clips: [], audio: "original", captionStyle: "clean", headline: "", cta: "" } as StudioProject }}
        calculateMetadata={({ props }) => ({ durationInFrames: projectFrames(props.project) })} />
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

