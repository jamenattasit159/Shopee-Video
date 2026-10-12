import { ShopeeProductVideoProps } from "../types";

export const calculateTotalFrames = (
  props: ShopeeProductVideoProps,
  fps: number = 30
): number => {
  // If voiceLines with individual audioUrls are provided, dynamically compute total frames from voice line durations + 0.3s padding
  if (props.voiceLines && props.voiceLines.length > 0 && props.voiceLines.some((l) => l.audioUrl)) {
    const linesTotalSec = props.voiceLines.reduce((sum, line) => {
      const lineDuration = line.durationSec && line.durationSec > 0 ? line.durationSec + 0.3 : 3.0;
      return sum + lineDuration;
    }, 0);
    const totalSec = Math.max(12, linesTotalSec + 0.5);
    return Math.round(totalSec * fps);
  }

  // If voiceover duration is available, guarantee video duration covers full speech + 0.8s clean CTA buffer
  if (props.voiceoverDurationSec && props.voiceoverDurationSec > 0) {
    const totalSec = Math.max(12, props.voiceoverDurationSec + 0.8);
    return Math.round(totalSec * fps);
  }
  const hookDuration = props.hook?.durationSec || 3;
  const scenesDuration = (props.scenes || []).reduce(
    (sum, s) => sum + (s.durationSec || 4),
    0
  );
  const ctaDuration = props.cta?.durationSec || 3;
  const totalSeconds = hookDuration + scenesDuration + ctaDuration;
  return Math.max(30, Math.round(totalSeconds * fps));
};
