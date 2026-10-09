import { exec } from "child_process";
import fsSync from "fs";
import fs from "fs/promises";
import path from "path";
import util from "util";
import { StoryboardPlan } from "../../remotion/types";

const execAsync = util.promisify(exec);

export interface AudioMetadata {
  durationSec: number;
  durationFrames: number;
  sampleRate?: number;
  channels?: number;
  bitRate?: number;
  isValid: boolean;
}

export interface SynchronizedTimeline {
  totalDurationSec: number;
  totalDurationFrames: number;
  hookDurationSec: number;
  scenesDurationSec: number[];
  ctaDurationSec: number;
  tailBufferSec: number;
  audioDurationSec: number;
}

/**
 * Resolves a public URL or relative path into an absolute filesystem path.
 */
export function resolveAudioFilePath(audioUrlOrPath: string): string {
  if (!audioUrlOrPath) return "";
  let clean = audioUrlOrPath.trim();

  // If it's a URL (http:// or https://), extract pathname
  if (clean.startsWith("http://") || clean.startsWith("https://")) {
    try {
      const parsed = new URL(clean);
      clean = decodeURIComponent(parsed.pathname);
    } catch {
      // fallback
    }
  }

  // Strip query params or hash if present
  clean = clean.split("?")[0].split("#")[0];

  // On Windows, paths starting with '/' or '\' are treated as isAbsolute=true by Node,
  // pointing to root of current drive (e.g., C:\uploads\...), NOT the project folder!
  // A true disk absolute path on Windows must start with a drive letter (e.g. C:\ or C:/).
  const isWindowsAbsolute = /^[a-zA-Z]:[/\\]/.test(clean);
  const isPosixAbsolute = process.platform !== "win32" && clean.startsWith("/");

  if ((isWindowsAbsolute || isPosixAbsolute) && fsSync.existsSync(clean)) {
    return clean;
  }

  // Otherwise, treat as path relative to public/
  clean = clean.replace(/^[/\\]+/, "");
  if (clean.startsWith("public/") || clean.startsWith("public\\")) {
    clean = clean.replace(/^public[/\\]+/, "");
  }

  return path.join(process.cwd(), "public", clean);
}

/**
 * Measures the exact duration of an audio file using ffprobe.
 * Handles missing, corrupt, or invalid audio gracefully.
 */
export async function measureAudioDuration(
  audioUrlOrPath: string,
  fps = 30
): Promise<AudioMetadata> {
  const filePath = resolveAudioFilePath(audioUrlOrPath);

  try {
    const stats = await fs.stat(filePath);
    if (stats.size === 0) {
      console.warn(`[AudioTimeline] Audio file is empty: ${filePath}`);
      return { durationSec: 0, durationFrames: 0, isValid: false };
    }

    // Run ffprobe with JSON output for precise duration and stream info
    const cmd = `ffprobe -v error -show_entries format=duration,bit_rate:stream=sample_rate,channels -of json "${filePath}"`;
    const { stdout } = await execAsync(cmd);
    const data = JSON.parse(stdout);

    const rawDuration = parseFloat(data.format?.duration);
    if (isNaN(rawDuration) || rawDuration <= 0) {
      throw new Error(`Invalid duration reported by ffprobe: ${data.format?.duration}`);
    }

    const durationSec = Math.round(rawDuration * 1000) / 1000;
    const durationFrames = Math.ceil(durationSec * fps);
    const stream = data.streams?.[0] || {};

    return {
      durationSec,
      durationFrames,
      sampleRate: stream.sample_rate ? parseInt(stream.sample_rate, 10) : undefined,
      channels: stream.channels ? parseInt(stream.channels, 10) : undefined,
      bitRate: data.format?.bit_rate ? parseInt(data.format.bit_rate, 10) : undefined,
      isValid: true,
    };
  } catch (error: any) {
    console.warn(
      `[AudioTimeline] ffprobe failed for "${filePath}": ${error.message}. Attempting header fallback...`
    );

    // Fallback: estimate from file size if WAV
    try {
      const buf = await fs.readFile(filePath);
      if (buf.length > 44 && buf.subarray(0, 4).toString() === "RIFF") {
        const byteRate = buf.readUInt32LE(28);
        const dataSize = buf.readUInt32LE(40);
        if (byteRate > 0 && dataSize > 0) {
          const durationSec = Math.round((dataSize / byteRate) * 100) / 100;
          return {
            durationSec,
            durationFrames: Math.ceil(durationSec * fps),
            isValid: true,
          };
        }
      }
    } catch {
      // Ignore fallback errors
    }

    // Default safe fallback if completely unreadable
    return {
      durationSec: 0,
      durationFrames: 0,
      isValid: false,
    };
  }
}

/**
 * Calculates audio-first scene duration allocation.
 * Guarantees that video duration covers the entire audio without abrupt trimming,
 * plus a natural breathing tail buffer for comfortable CTA viewing.
 */
export function synchronizeTimelineToAudio(params: {
  audioDurationSec: number;
  numScenes: number;
  fps?: number;
  minHookSec?: number;
  minSceneSec?: number;
  minCtaSec?: number;
  tailBufferSec?: number;
}): SynchronizedTimeline {
  const {
    audioDurationSec,
    numScenes = 3,
    fps = 30,
    minHookSec = 3.0,
    minSceneSec = 3.5,
    minCtaSec = 3.0,
    tailBufferSec = 0.8, // 0.8s tail buffer ensures last spoken word isn't clipped and CTA is readable
  } = params;

  const validScenesCount = Math.max(1, numScenes);

  // If audio duration is negligible or zero, use standard visual defaults
  if (!audioDurationSec || audioDurationSec <= 1) {
    const defaultHook = minHookSec;
    const defaultScenes = Array(validScenesCount).fill(4.0);
    const defaultCta = minCtaSec;
    const totalSec = defaultHook + defaultScenes.reduce((a, b) => a + b, 0) + defaultCta;
    return {
      totalDurationSec: totalSec,
      totalDurationFrames: Math.ceil(totalSec * fps),
      hookDurationSec: defaultHook,
      scenesDurationSec: defaultScenes,
      ctaDurationSec: defaultCta,
      tailBufferSec: 0,
      audioDurationSec: 0,
    };
  }

  // Audio-First Total Target Duration: Audio length + comfortable tail buffer
  const targetTotalSec = audioDurationSec + tailBufferSec;

  // Minimum visual floor duration so short audio doesn't cause frantic 1-second scenes
  const minFloorSec = minHookSec + validScenesCount * minSceneSec + minCtaSec;
  const effectiveTotalSec = Math.max(minFloorSec, targetTotalSec);

  // Allocation ratios based on video flow:
  // Hook: ~18-20% of timeline (max 4.5s so audience isn't bored before product features)
  // CTA: ~18-20% of timeline (min 3.5s so viewer can comfortably see basket action)
  // Features: Remaining ~60-64% divided evenly across feature scenes
  let hookDuration = Math.min(4.5, Math.max(minHookSec, effectiveTotalSec * 0.18));
  let ctaDuration = Math.min(4.5, Math.max(minCtaSec, effectiveTotalSec * 0.18));

  // The rest goes to feature scenes
  const remainingForFeatures = Math.max(
    validScenesCount * minSceneSec,
    effectiveTotalSec - hookDuration - ctaDuration
  );
  const perSceneDuration = Math.round((remainingForFeatures / validScenesCount) * 10) / 10;
  const scenesDuration = Array(validScenesCount).fill(perSceneDuration);

  // Re-sum to exact duration to avoid fractional rounding drift
  const computedTotalSec =
    Math.round(
      (hookDuration + scenesDuration.reduce((a, b) => a + b, 0) + ctaDuration) * 10
    ) / 10;

  return {
    totalDurationSec: computedTotalSec,
    totalDurationFrames: Math.ceil(computedTotalSec * fps),
    hookDurationSec: Math.round(hookDuration * 10) / 10,
    scenesDurationSec: scenesDuration,
    ctaDurationSec: Math.round(ctaDuration * 10) / 10,
    tailBufferSec,
    audioDurationSec,
  };
}

/**
 * Updates a StoryboardPlan object in-place with synchronized audio durations.
 */
export function applyTimelineToStoryboard(
  storyboard: StoryboardPlan,
  timeline: SynchronizedTimeline
): StoryboardPlan {
  const updatedScenes = (storyboard.scenes || []).map((s, idx) => ({
    ...s,
    durationSec: timeline.scenesDurationSec[idx] ?? timeline.scenesDurationSec[0] ?? 4.0,
  }));

  return {
    ...storyboard,
    hook: {
      ...storyboard.hook,
      durationSec: timeline.hookDurationSec,
    },
    scenes: updatedScenes,
    cta: {
      ...storyboard.cta,
      durationSec: timeline.ctaDurationSec,
    },
  };
}

/**
 * Validates a rendered video file against the source audio file using ffprobe.
 * Confirms that video duration is at least as long as the narration audio.
 */
export async function validateRenderedVideo(
  videoPath: string,
  audioUrlOrPath?: string
): Promise<{
  isValid: boolean;
  videoDurationSec: number;
  audioDurationSec?: number;
  differenceSec?: number;
  message: string;
}> {
  try {
    const cmd = `ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${videoPath}"`;
    const { stdout } = await execAsync(cmd);
    const videoDurationSec = parseFloat(stdout.trim());

    if (isNaN(videoDurationSec) || videoDurationSec <= 0) {
      return {
        isValid: false,
        videoDurationSec: 0,
        message: "Could not read duration of rendered video",
      };
    }

    if (!audioUrlOrPath) {
      return {
        isValid: true,
        videoDurationSec,
        message: `Video rendered with duration ${videoDurationSec.toFixed(2)}s (no voiceover attached)`,
      };
    }

    const audioMeta = await measureAudioDuration(audioUrlOrPath);
    if (!audioMeta.isValid || audioMeta.durationSec === 0) {
      return {
        isValid: true,
        videoDurationSec,
        message: `Video rendered (${videoDurationSec.toFixed(2)}s). Audio metadata unavailable.`,
      };
    }

    const differenceSec = videoDurationSec - audioMeta.durationSec;
    // Tolerance of 0.2s for container frame rounding
    const hasEnoughDuration = differenceSec >= -0.2;

    return {
      isValid: hasEnoughDuration,
      videoDurationSec,
      audioDurationSec: audioMeta.durationSec,
      differenceSec: Math.round(differenceSec * 100) / 100,
      message: hasEnoughDuration
        ? `PASSED: Video (${videoDurationSec.toFixed(2)}s) covers audio narration (${audioMeta.durationSec.toFixed(2)}s) with ${differenceSec.toFixed(2)}s margin.`
        : `FAILED TRUNCATION CHECK: Video (${videoDurationSec.toFixed(2)}s) is shorter than narration (${audioMeta.durationSec.toFixed(2)}s) by ${Math.abs(differenceSec).toFixed(2)}s!`,
    };
  } catch (error: any) {
    return {
      isValid: false,
      videoDurationSec: 0,
      message: `Validation error: ${error.message}`,
    };
  }
}
