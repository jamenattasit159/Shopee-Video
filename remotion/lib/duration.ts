import { ShopeeProductVideoProps } from "../types";
import { buildVideoTimeline } from "./videoTimeline";

export const calculateTotalFrames = (props: ShopeeProductVideoProps, fps = 30): number => buildVideoTimeline(props, fps).durationInFrames;
