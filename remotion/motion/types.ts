import { PackId, SceneLayout, TransitionType } from "../types";

export type ObjectMotionPreset =
  | "scale-pop"
  | "slide-left"
  | "slide-right"
  | "slide-bottom"
  | "drop-stamp"
  | "pendulum-swing"
  | "bounce-reveal"
  | "float-drift"
  | "whip-snap";

export type TextMotionPreset =
  | "kinetic-slide"
  | "stamp-slam"
  | "split-reveal"
  | "typewriter-cut"
  | "bounce-pop"
  | "scale-pop";

export type CameraMotionPreset =
  | "static"
  | "ken-burns-pan"
  | "slow-dolly-in"
  | "slow-dolly-out"
  | "parallax-drift";

export type ExtendedTransitionType =
  | TransitionType
  | "whip-pan"
  | "push-slide"
  | "shape-mask";

export interface MotionConfig {
  entryPreset: ObjectMotionPreset;
  textPreset: TextMotionPreset;
  cameraPreset: CameraMotionPreset;
  transitionOut: ExtendedTransitionType;
  ambientDrift: boolean; // Continuous subtle movement for long duration scenes
  subBeatTimingFrame: number;
}

export interface SceneMotionPlan {
  sceneIndex: number;
  motionConfig: MotionConfig;
  packId: PackId;
  durationInFrames: number;
}
