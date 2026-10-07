import { random, spring, useCurrentFrame, useVideoConfig } from "remotion";

/**
 * Returns a stepped / held frame to achieve stop-motion timing (e.g. 30fps -> 10-12fps with hold = 2 or 3)
 */
export const useStepFrame = (hold = 3): number => {
  const frame = useCurrentFrame();
  return Math.floor(frame / hold) * hold;
};

export interface BoilAmp {
  rot?: number;
  pos?: number;
  scale?: number;
}

/**
 * Deterministic jitter/boil effect calculated per step.
 * Using Remotion's pure random() ensures multi-threaded renders are completely reproducible.
 */
export const useBoil = (
  seedKey: string,
  hold = 3,
  amp: BoilAmp = { rot: 1.2, pos: 3, scale: 0.01 }
) => {
  const step = useStepFrame(hold) / hold;
  const rotAmp = amp.rot ?? 1.2;
  const posAmp = amp.pos ?? 3;
  const scaleAmp = amp.scale ?? 0.01;

  const r = (n: string) => random(`${seedKey}-${n}-${step}`) * 2 - 1;

  return {
    rotate: r("r") * rotAmp,
    x: r("x") * posAmp,
    y: r("y") * posAmp,
    scale: 1 + r("s") * scaleAmp,
    seed: Math.floor(random(`${seedKey}-seed-${step}`) * 1000),
  };
};

/**
 * Spring pop-in with overshoot for collage cutouts and stickers.
 * damping = 9, stiffness = 180 gives a punchy tactile snap.
 */
export const usePop = (delay = 0, damping = 9) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return spring({
    frame: frame - delay,
    fps,
    config: { damping, stiffness: 180, mass: 0.7 },
  });
};

/**
 * Stepped spring for stop-motion movement
 */
export const useSteppedPop = (delay = 0, hold = 3, damping = 9) => {
  const stepFrame = useStepFrame(hold);
  const { fps } = useVideoConfig();
  return spring({
    frame: stepFrame - delay,
    fps,
    config: { damping, stiffness: 180, mass: 0.7 },
  });
};
