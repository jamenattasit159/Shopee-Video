import { PackId, TransitionType } from "../types";
import {
  CameraMotionPreset,
  ExtendedTransitionType,
  MotionConfig,
  ObjectMotionPreset,
  SceneMotionPlan,
  TextMotionPreset,
} from "./types";

interface OrchestrateParams {
  packId?: PackId;
  sceneIndex: number;
  totalScenes: number;
  sceneType: "hook" | "feature" | "cta";
  durationInFrames: number;
  category?: string;
  previousObjectMotion?: ObjectMotionPreset;
  previousTransition?: ExtendedTransitionType;
}

// Pack-specific motion affinities
const PACK_MOTION_AFFINITIES: Record<
  PackId,
  {
    objectPresets: ObjectMotionPreset[];
    textPresets: TextMotionPreset[];
    cameraPresets: CameraMotionPreset[];
    transitions: ExtendedTransitionType[];
  }
> = {
  "comic-popart": {
    objectPresets: ["bounce-reveal", "whip-snap", "slide-bottom", "drop-stamp"],
    textPresets: ["stamp-slam", "bounce-pop", "kinetic-slide"],
    cameraPresets: ["parallax-drift", "ken-burns-pan"],
    transitions: ["whip-pan", "slap-strip", "shape-mask"],
  },
  "zine-newspaper": {
    objectPresets: ["slide-left", "slide-right", "drop-stamp", "scale-pop"],
    textPresets: ["typewriter-cut", "kinetic-slide", "split-reveal"],
    cameraPresets: ["slow-dolly-in", "static"],
    transitions: ["torn-wipe", "page-shuffle", "push-slide"],
  },
  "supermarket-flyer": {
    objectPresets: ["drop-stamp", "bounce-reveal", "slide-bottom", "whip-snap"],
    textPresets: ["stamp-slam", "bounce-pop", "kinetic-slide"],
    cameraPresets: ["slow-dolly-in", "parallax-drift"],
    transitions: ["slap-strip", "push-slide", "whip-pan"],
  },
  "soft-kawaii": {
    objectPresets: ["float-drift", "pendulum-swing", "bounce-reveal", "scale-pop"],
    textPresets: ["kinetic-slide", "bounce-pop", "split-reveal"],
    cameraPresets: ["parallax-drift", "slow-dolly-out"],
    transitions: ["shape-mask", "page-shuffle", "torn-wipe"],
  },
  "pinboard-corkboard": {
    objectPresets: ["pendulum-swing", "drop-stamp", "slide-left", "slide-right"],
    textPresets: ["stamp-slam", "split-reveal", "kinetic-slide"],
    cameraPresets: ["ken-burns-pan", "parallax-drift"],
    transitions: ["page-shuffle", "torn-wipe", "push-slide"],
  },
  "notebook-doodle": {
    objectPresets: ["slide-left", "float-drift", "slide-bottom", "pendulum-swing"],
    textPresets: ["typewriter-cut", "kinetic-slide", "split-reveal"],
    cameraPresets: ["slow-dolly-in", "static"],
    transitions: ["torn-wipe", "page-shuffle", "shape-mask"],
  },
  "sticker-bomb": {
    objectPresets: ["whip-snap", "bounce-reveal", "drop-stamp", "slide-left"],
    textPresets: ["stamp-slam", "bounce-pop", "kinetic-slide"],
    cameraPresets: ["parallax-drift", "ken-burns-pan"],
    transitions: ["slap-strip", "whip-pan", "torn-wipe"],
  },
  "kraft-scrapbook": {
    objectPresets: ["drop-stamp", "slide-right", "pendulum-swing", "slide-left"],
    textPresets: ["kinetic-slide", "stamp-slam", "split-reveal"],
    cameraPresets: ["slow-dolly-in", "parallax-drift"],
    transitions: ["torn-wipe", "slap-strip", "page-shuffle"],
  },
};

/**
 * Intelligent Motion Orchestrator
 * Selects genuinely diverse motion behavior based on style pack, scene position,
 * and duration, strictly preventing consecutive duplicate animations.
 */
export function orchestrateSceneMotion(params: OrchestrateParams): SceneMotionPlan {
  const {
    packId = "kraft-scrapbook",
    sceneIndex,
    totalScenes,
    sceneType,
    durationInFrames,
    previousObjectMotion,
    previousTransition,
  } = params;

  const affinity = PACK_MOTION_AFFINITIES[packId] || PACK_MOTION_AFFINITIES["kraft-scrapbook"];

  // 1. Select Object Entry Preset with strict anti-repetition guard
  const availableObjectPresets = affinity.objectPresets.filter(
    (p) => p !== previousObjectMotion
  );
  const objectPool =
    availableObjectPresets.length > 0 ? availableObjectPresets : affinity.objectPresets;

  let chosenObjectPreset: ObjectMotionPreset;
  if (sceneType === "hook") {
    // Hooks should have high-impact initial entries
    chosenObjectPreset =
      packId === "comic-popart" || packId === "sticker-bomb"
        ? "whip-snap"
        : packId === "soft-kawaii"
        ? "float-drift"
        : "drop-stamp";
  } else if (sceneType === "cta") {
    // CTA scene focuses on the price action & basket
    chosenObjectPreset = "bounce-reveal";
  } else {
    // Feature scenes cycle through the pool without repeats
    chosenObjectPreset = objectPool[sceneIndex % objectPool.length];
  }

  // 2. Select Typography Preset
  const textPool = affinity.textPresets;
  const chosenTextPreset: TextMotionPreset =
    sceneType === "cta"
      ? "stamp-slam"
      : textPool[sceneIndex % textPool.length];

  // 3. Select Camera / Ambient Motion
  const cameraPool = affinity.cameraPresets;
  const chosenCameraPreset: CameraMotionPreset =
    durationInFrames > 120
      ? cameraPool[sceneIndex % cameraPool.length]
      : "static";

  // 4. Select Transition Preset with anti-repetition
  const availableTransitions = affinity.transitions.filter(
    (t) => t !== previousTransition
  );
  const transitionPool =
    availableTransitions.length > 0 ? availableTransitions : affinity.transitions;
  const chosenTransition: ExtendedTransitionType =
    transitionPool[sceneIndex % transitionPool.length];

  // 5. Ambient drift is enabled for all scenes longer than 4 seconds (120 frames @ 30fps)
  const ambientDrift = durationInFrames >= 120;

  // 6. Sub-beat timing is computed dynamically based on scene duration
  // For standard 3-4s scene: frame 36 (~1.2s)
  // For long 8s scene: frame 45 and frame 120
  const subBeatTimingFrame = Math.min(
    Math.round(durationInFrames * 0.35),
    45
  );

  const motionConfig: MotionConfig = {
    entryPreset: chosenObjectPreset,
    textPreset: chosenTextPreset,
    cameraPreset: chosenCameraPreset,
    transitionOut: chosenTransition,
    ambientDrift,
    subBeatTimingFrame,
  };

  return {
    sceneIndex,
    motionConfig,
    packId,
    durationInFrames,
  };
}

/**
 * Pre-orchestrates motion plans for an entire video storyboard.
 * Guarantees zero consecutive animation repeats across the whole timeline.
 */
export function orchestrateFullStoryboardMotion(params: {
  packId?: PackId;
  scenesCount: number;
  hookFrames: number;
  scenesFrames: number[];
  ctaFrames: number;
  category?: string;
}): {
  hookPlan: SceneMotionPlan;
  featurePlans: SceneMotionPlan[];
  ctaPlan: SceneMotionPlan;
} {
  const {
    packId = "kraft-scrapbook",
    scenesCount,
    hookFrames,
    scenesFrames,
    ctaFrames,
    category,
  } = params;

  // 1. Hook Plan
  const hookPlan = orchestrateSceneMotion({
    packId,
    sceneIndex: 0,
    totalScenes: scenesCount + 2,
    sceneType: "hook",
    durationInFrames: hookFrames,
    category,
  });

  // 2. Feature Plans
  const featurePlans: SceneMotionPlan[] = [];
  let prevObject = hookPlan.motionConfig.entryPreset;
  let prevTrans = hookPlan.motionConfig.transitionOut;

  for (let i = 0; i < scenesCount; i++) {
    const fPlan = orchestrateSceneMotion({
      packId,
      sceneIndex: i + 1,
      totalScenes: scenesCount + 2,
      sceneType: "feature",
      durationInFrames: scenesFrames[i] || 120,
      category,
      previousObjectMotion: prevObject,
      previousTransition: prevTrans,
    });
    featurePlans.push(fPlan);
    prevObject = fPlan.motionConfig.entryPreset;
    prevTrans = fPlan.motionConfig.transitionOut;
  }

  // 3. CTA Plan
  const ctaPlan = orchestrateSceneMotion({
    packId,
    sceneIndex: scenesCount + 1,
    totalScenes: scenesCount + 2,
    sceneType: "cta",
    durationInFrames: ctaFrames,
    category,
    previousObjectMotion: prevObject,
    previousTransition: prevTrans,
  });

  return {
    hookPlan,
    featurePlans,
    ctaPlan,
  };
}
