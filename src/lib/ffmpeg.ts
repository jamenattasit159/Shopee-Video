import fs from "fs";
import path from "path";
import { execFile, execSync } from "child_process";
import util from "util";

const execFileAsync = util.promisify(execFile);

/**
 * Finds the absolute path to ffmpeg binary
 */
export function getFfmpegPath(): string {
  const isWindows = process.platform === "win32";
  const exeName = isWindows ? "ffmpeg.exe" : "ffmpeg";

  const candidates = [
    path.join(process.cwd(), "node_modules/@remotion/compositor-win32-x64-msvc", exeName),
    path.join(process.cwd(), "node_modules/@remotion/compositor-linux-x64-gnu", exeName),
    path.join(process.cwd(), "node_modules/@remotion/compositor-linux-x64-musl", exeName),
    path.join(process.cwd(), "node_modules/@remotion/compositor-darwin-arm64", exeName),
    path.join(process.cwd(), "node_modules/@remotion/compositor-darwin-x64", exeName),
  ];

  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }

  // Fallback to global command
  return "ffmpeg";
}

/**
 * Finds the absolute path to ffprobe binary
 */
export function getFfprobePath(): string {
  const isWindows = process.platform === "win32";
  const exeName = isWindows ? "ffprobe.exe" : "ffprobe";

  const candidates = [
    path.join(process.cwd(), "node_modules/@remotion/compositor-win32-x64-msvc", exeName),
    path.join(process.cwd(), "node_modules/@remotion/compositor-linux-x64-gnu", exeName),
    path.join(process.cwd(), "node_modules/@remotion/compositor-linux-x64-musl", exeName),
    path.join(process.cwd(), "node_modules/@remotion/compositor-darwin-arm64", exeName),
    path.join(process.cwd(), "node_modules/@remotion/compositor-darwin-x64", exeName),
  ];

  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }

  return "ffprobe";
}

/**
 * Ensures the directory containing ffmpeg/ffprobe is prepended to process.env.PATH
 */
export function ensureFfmpegInPath(): void {
  const ffmpegPath = getFfmpegPath();
  if (ffmpegPath !== "ffmpeg") {
    const dir = path.dirname(ffmpegPath);
    const sep = process.platform === "win32" ? ";" : ":";
    const currentPath = process.env.PATH || "";
    if (!currentPath.includes(dir)) {
      process.env.PATH = `${dir}${sep}${currentPath}`;
      if (process.platform === "win32") {
        process.env.Path = `${dir}${sep}${process.env.Path || ""}`;
      }
    }
  }
}

/**
 * Executes FFmpeg binary with argument array safely
 */
export async function execFfmpegAsync(args: string[]): Promise<{ stdout: string; stderr: string }> {
  const ffmpeg = getFfmpegPath();
  const { stdout, stderr } = await execFileAsync(ffmpeg, args);
  return { stdout: stdout.toString(), stderr: stderr.toString() };
}

let cachedFfmpegFilters: Set<string> | null = null;

/**
 * Returns a Set of all filters supported by the available FFmpeg binary
 */
export async function getFfmpegFilters(): Promise<Set<string>> {
  if (cachedFfmpegFilters) return cachedFfmpegFilters;
  try {
    const { stdout } = await execFfmpegAsync(["-filters"]);
    const lines = stdout.split("\n");
    const filters = new Set<string>();
    for (const line of lines) {
      const match = line.match(/^\s*[TSC.]{3}\s+([a-zA-Z0-9_]+)/);
      if (match && match[1]) {
        filters.add(match[1]);
      }
    }
    cachedFfmpegFilters = filters;
    return filters;
  } catch (err: any) {
    console.warn("[ffmpeg] Failed to query ffmpeg filters:", err?.message);
    cachedFfmpegFilters = new Set(["atempo", "loudnorm"]); // safe fallback
    return cachedFfmpegFilters;
  }
}

/**
 * Converts any audio file to 24kHz Mono 16-bit PCM WAV (Gemini TTS standard)
 */
export async function convertTo24kHzWav(inputPath: string, outputPath: string): Promise<void> {
  await execFfmpegAsync([
    "-y",
    "-i",
    inputPath,
    "-ar",
    "24000",
    "-ac",
    "1",
    "-c:a",
    "pcm_s16le",
    outputPath,
  ]);
}

/**
 * Measures exact audio duration in seconds via ffprobe
 */
export function getAudioDurationInSeconds(filePath: string): number {
  const fullPath = path.isAbsolute(filePath) ? filePath : path.resolve(process.cwd(), filePath);
  const ffprobe = getFfprobePath();

  try {
    const out = execSync(
      `"${ffprobe}" -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${fullPath}"`,
      { stdio: ["ignore", "pipe", "ignore"] }
    );
    const sec = parseFloat(out.toString().trim());
    if (!isNaN(sec) && sec > 0) return sec;
  } catch (err: any) {
    console.warn(`[ffmpeg] ffprobe duration measurement failed for ${fullPath}:`, err?.message);
  }

  return 0;
}
