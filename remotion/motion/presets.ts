import React from "react";
import { interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { useStepFrame } from "../lib/stopMotion";
import { CameraMotionPreset, ObjectMotionPreset, TextMotionPreset } from "./types";

export interface ObjectMotionOptions {
  delay?: number;
  baseRotate?: number;
  hold?: number;
  durationInFrames?: number;
  enableAmbient?: boolean;
}

/**
 * Calculates transform and motion styling for product cutouts and objects
 * based on selected motion preset.
 */
export function useObjectMotionStyle(
  preset: ObjectMotionPreset = "scale-pop",
  options: ObjectMotionOptions = {}
): {
  transform: string;
  opacity: number;
} {
  const {
    delay = 0,
    baseRotate = -2,
    hold = 3,
    durationInFrames = 120,
    enableAmbient = true,
  } = options;

  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const stepFrame = useStepFrame(hold);

  // Discrete stepped entry frame for stop-motion aesthetic
  const entryFrame = Math.max(0, stepFrame - delay);

  // Standard spring pop
  const popSpring = spring({
    frame: entryFrame,
    fps,
    config: { damping: 9, stiffness: 180, mass: 0.7 },
  });

  // Bouncy spring
  const bounceSpring = spring({
    frame: entryFrame,
    fps,
    config: { damping: 6, stiffness: 140, mass: 0.8 },
  });

  // Smooth slide spring
  const slideSpring = spring({
    frame: entryFrame,
    fps,
    config: { damping: 12, stiffness: 120, mass: 0.9 },
  });

  // Ambient slow drift during hold phase (active after entry frame 20 until end)
  let ambientX = 0;
  let ambientY = 0;
  let ambientScale = 1;
  let ambientRotate = 0;

  if (enableAmbient && durationInFrames > 60) {
    // Subtle continuous Ken-Burns breathing / float for long scenes
    const progress = interpolate(frame, [0, durationInFrames], [0, 1], {
      extrapolateRight: "clamp",
    });
    ambientScale = 1 + progress * 0.05; // 5% gentle drift scale
    ambientY = Math.sin((frame / 30) * Math.PI) * 5; // 5px breathing float
    ambientX = Math.cos((frame / 40) * Math.PI) * 4;
    ambientRotate = Math.sin((frame / 45) * Math.PI) * 0.8;
  }

  let x = 0;
  let y = 0;
  let scale = 1;
  let rotate = baseRotate;
  let opacity = 1;

  switch (preset) {
    case "slide-left": {
      // Slides in from left (-320px -> 0) with gentle overshoot
      x = interpolate(slideSpring, [0, 1], [-320, 0]) + ambientX;
      y = ambientY;
      scale = interpolate(slideSpring, [0, 1], [0.85, 1]) * ambientScale;
      rotate = baseRotate + interpolate(slideSpring, [0, 1], [-8, 0]) + ambientRotate;
      opacity = interpolate(slideSpring, [0, 0.4], [0, 1]);
      break;
    }

    case "slide-right": {
      // Slides in from right (+320px -> 0)
      x = interpolate(slideSpring, [0, 1], [320, 0]) + ambientX;
      y = ambientY;
      scale = interpolate(slideSpring, [0, 1], [0.85, 1]) * ambientScale;
      rotate = baseRotate + interpolate(slideSpring, [0, 1], [8, 0]) + ambientRotate;
      opacity = interpolate(slideSpring, [0, 0.4], [0, 1]);
      break;
    }

    case "slide-bottom": {
      // Slides in from bottom (+400px -> 0) with spring bounce
      x = ambientX;
      y = interpolate(slideSpring, [0, 1], [400, 0]) + ambientY;
      scale = interpolate(slideSpring, [0, 1], [0.9, 1]) * ambientScale;
      rotate = baseRotate + ambientRotate;
      opacity = interpolate(slideSpring, [0, 0.3], [0, 1]);
      break;
    }

    case "drop-stamp": {
      // Drops from top (-500px -> 0) like a rubber stamp landing with impact
      const dropProgress = spring({
        frame: entryFrame,
        fps,
        config: { damping: 10, stiffness: 220, mass: 1.1 },
      });
      x = ambientX;
      y = interpolate(dropProgress, [0, 1], [-500, 0]) + ambientY;
      scale = interpolate(dropProgress, [0, 0.8, 1], [1.2, 0.95, 1.0]) * ambientScale;
      rotate = baseRotate + interpolate(dropProgress, [0, 1], [12, 0]) + ambientRotate;
      opacity = interpolate(dropProgress, [0, 0.2], [0, 1]);
      break;
    }

    case "pendulum-swing": {
      // Hangs from top pin and swings naturally
      const swingSpring = spring({
        frame: entryFrame,
        fps,
        config: { damping: 7, stiffness: 90, mass: 1.2 },
      });
      x = ambientX;
      y = interpolate(swingSpring, [0, 1], [-180, 0]) + ambientY;
      // Damped harmonic oscillation for pendulum swing
      const swingAngle =
        Math.sin((entryFrame / 6) * Math.PI) *
        interpolate(entryFrame, [0, 45], [18, 0], { extrapolateRight: "clamp" });
      rotate = baseRotate + swingAngle + ambientRotate;
      scale = interpolate(swingSpring, [0, 1], [0.8, 1]) * ambientScale;
      opacity = interpolate(swingSpring, [0, 0.3], [0, 1]);
      break;
    }

    case "bounce-reveal": {
      // Energetic playful double bounce
      x = ambientX;
      y = interpolate(bounceSpring, [0, 0.6, 1], [120, -15, 0]) + ambientY;
      scale = bounceSpring * ambientScale;
      rotate = baseRotate + interpolate(bounceSpring, [0, 1], [-6, 0]) + ambientRotate;
      opacity = interpolate(bounceSpring, [0, 0.2], [0, 1]);
      break;
    }

    case "float-drift": {
      // Floating continuous gentle wave
      const floatProgress = spring({
        frame: entryFrame,
        fps,
        config: { damping: 14, stiffness: 100, mass: 1 },
      });
      x = Math.sin((frame / 25) * Math.PI) * 12 + ambientX;
      y = Math.cos((frame / 20) * Math.PI) * 10 + ambientY;
      scale = floatProgress * ambientScale;
      rotate = baseRotate + Math.sin((frame / 35) * Math.PI) * 2 + ambientRotate;
      opacity = interpolate(floatProgress, [0, 0.4], [0, 1]);
      break;
    }

    case "whip-snap": {
      // High-velocity snap
      const snapProgress = spring({
        frame: entryFrame,
        fps,
        config: { damping: 12, stiffness: 320, mass: 0.5 },
      });
      x = interpolate(snapProgress, [0, 1], [-180, 0]) + ambientX;
      y = ambientY;
      scale = interpolate(snapProgress, [0, 1], [0.7, 1]) * ambientScale;
      rotate = baseRotate + interpolate(snapProgress, [0, 1], [-12, 0]) + ambientRotate;
      opacity = interpolate(snapProgress, [0, 0.2], [0, 1]);
      break;
    }

    case "scale-pop":
    default: {
      // Traditional pop
      scale = popSpring * ambientScale;
      x = ambientX;
      y = ambientY;
      rotate = baseRotate + ambientRotate;
      opacity = interpolate(popSpring, [0, 0.2], [0, 1]);
      break;
    }
  }

  return {
    transform: `translate(${x}px, ${y}px) rotate(${rotate}deg) scale(${scale})`,
    opacity,
  };
}

/**
 * Calculates typography animation styles based on selected preset.
 */
export function useTextMotionStyle(
  preset: TextMotionPreset = "kinetic-slide",
  options: {
    delay?: number;
    rotate?: number;
    lineIndex?: number;
  } = {}
): {
  transform: string;
  opacity: number;
} {
  const { delay = 0, rotate = 0, lineIndex = 0 } = options;
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const adjustedDelay = delay + lineIndex * 3;
  const animFrame = Math.max(0, frame - adjustedDelay);

  const textSpring = spring({
    frame: animFrame,
    fps,
    config: { damping: 10, stiffness: 200, mass: 0.8 },
  });

  let x = 0;
  let y = 0;
  let scale = 1;
  let rot = rotate;
  let opacity = 1;

  switch (preset) {
    case "kinetic-slide": {
      // Lines slide horizontally from alternating directions with spring snap
      const directionMultiplier = lineIndex % 2 === 0 ? -1 : 1;
      x = interpolate(textSpring, [0, 1], [140 * directionMultiplier, 0]);
      opacity = interpolate(textSpring, [0, 0.4], [0, 1]);
      rot = rotate;
      break;
    }

    case "stamp-slam": {
      // Headline slams down from above like a rubber stamp with impact
      scale = interpolate(textSpring, [0, 0.7, 1], [1.5, 0.94, 1.0]);
      y = interpolate(textSpring, [0, 1], [-60, 0]);
      opacity = interpolate(textSpring, [0, 0.2], [0, 1]);
      rot = rotate + interpolate(textSpring, [0, 1], [-4, 0]);
      break;
    }

    case "split-reveal": {
      // Split reveal from top/bottom
      const splitY = lineIndex % 2 === 0 ? -40 : 40;
      y = interpolate(textSpring, [0, 1], [splitY, 0]);
      opacity = interpolate(textSpring, [0, 0.5], [0, 1]);
      rot = rotate;
      break;
    }

    case "typewriter-cut": {
      // Stepped reveal in stop-motion discrete steps
      const steppedProgress = Math.floor(textSpring * 4) / 4;
      opacity = steppedProgress >= 0.25 ? 1 : 0;
      scale = steppedProgress >= 0.75 ? 1 : 0.96;
      rot = rotate;
      break;
    }

    case "bounce-pop": {
      // Bouncy spring overshoot
      const bounce = spring({
        frame: animFrame,
        fps,
        config: { damping: 7, stiffness: 220, mass: 0.6 },
      });
      scale = bounce;
      opacity = interpolate(bounce, [0, 0.2], [0, 1]);
      rot = rotate;
      break;
    }

    case "scale-pop":
    default: {
      scale = textSpring;
      opacity = interpolate(textSpring, [0, 0.2], [0, 1]);
      rot = rotate;
      break;
    }
  }

  return {
    transform: `translate(${x}px, ${y}px) rotate(${rot}deg) scale(${scale})`,
    opacity,
  };
}
