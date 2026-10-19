export const MASCOT_POSES = ["present", "surprised", "megaphone", "wave", "thumbs-up", "point", "think", "confident", "ok", "excited", "whisper", "clap", "other"] as const;
export type MascotPose = (typeof MASCOT_POSES)[number];

export const MASCOT_POSE_LABELS: Record<MascotPose, string> = {
  present: "ผายมือนำเสนอ",
  surprised: "ตกใจ / ว้าว",
  megaphone: "ถือโทรโข่ง",
  wave: "โบกมือ",
  "thumbs-up": "ชูนิ้วโป้ง",
  point: "ชี้",
  think: "จับคางคิด",
  confident: "กอดอกมั่นใจ",
  ok: "ทำมือโอเค",
  excited: "กระโดดดีใจ",
  whisper: "กระซิบบอกความลับ",
  clap: "ปรบมือ",
  other: "ท่าอื่น ๆ",
};

export const isMascotPose = (value: unknown): value is MascotPose =>
  typeof value === "string" && (MASCOT_POSES as readonly string[]).includes(value);

export interface MascotFrame { url: string; durationMs: number; }
/** A run of near-identical frames that reads as one pose (a still, or a short loop of the same gesture). */
export interface MascotPoseClip { pose: MascotPose; frames: MascotFrame[]; }
export interface MascotAnimation { frames: MascotFrame[]; poses?: MascotPoseClip[]; }

export function mascotFrameUrl(fallback: string, animation: { frames: MascotFrame[] } | undefined, seconds: number) {
  const frames = animation?.frames;
  if (!frames?.length) return fallback;
  const total = frames.reduce((sum, frame) => sum + frame.durationMs, 0);
  if (!(total > 0)) return fallback;
  let time = Math.max(0, seconds * 1000) % total;
  for (const frame of frames) {
    if (time < frame.durationMs) return frame.url;
    time -= frame.durationMs;
  }
  return frames[0].url;
}

/** What each part of the clip should feel like, best first. */
const ROLE_PREFERENCES: Record<string, MascotPose[]> = {
  hook: ["surprised", "whisper", "excited", "megaphone", "point", "present"],
  body: ["present", "thumbs-up", "ok", "think", "confident", "clap", "point"],
  cta: ["point", "megaphone", "excited", "clap", "wave", "thumbs-up", "present"],
};

/**
 * Picks one pose clip per scene: the scene's requested pose first, then the role's preferences,
 * avoiding the previous scene's clip and spreading use across clips. Returns undefined entries when
 * the mascot has no analysed poses, so callers keep the old cycling behaviour.
 */
export function planMascotPoses(
  animation: MascotAnimation | undefined,
  scenes: Array<{ role: string; requested?: MascotPose }>,
): Array<MascotPoseClip | undefined> {
  const clips = animation?.poses?.filter((c) => c.frames.length > 0);
  if (!clips?.length) return scenes.map(() => undefined);
  const uses = clips.map(() => 0);
  let previous = -1;
  let bodyIndex = 0;
  return scenes.map(({ role, requested }) => {
    const base = ROLE_PREFERENCES[role] || ROLE_PREFERENCES.body;
    const shift = role === "body" ? bodyIndex++ % base.length : 0;
    const order = [...base.slice(shift), ...base.slice(0, shift)];
    const byUse = (a: number, b: number) => uses[a] - uses[b] || a - b;
    const indicesFor = (pose: MascotPose) => clips.map((c, i) => (c.pose === pose ? i : -1)).filter((i) => i >= 0).sort(byUse);

    let pick = requested ? indicesFor(requested)[0] ?? -1 : -1;
    for (const pose of order) {
      if (pick >= 0) break;
      pick = indicesFor(pose).find((i) => i !== previous) ?? -1;
    }
    if (pick < 0) pick = clips.map((_, i) => i).filter((i) => i !== previous || clips.length === 1).sort(byUse)[0];
    uses[pick]++;
    previous = pick;
    return clips[pick];
  });
}
