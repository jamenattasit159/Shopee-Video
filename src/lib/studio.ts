import { z } from "zod";

export const FPS = 30;
export const CaptionSchema = z.object({
  id: z.string().min(1).max(100),
  start: z.number().finite().min(0),
  end: z.number().finite().positive(),
  text: z.string().max(500),
}).refine(c => c.end > c.start, "เวลาจบซับต้องมากกว่าเวลาเริ่ม");
export const AssetSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(255),
  url: z.string().regex(/^\/uploads\/studio_[a-f0-9-]+\.(mp4|mov|webm)$/),
  duration: z.number().finite().positive().max(600),
  width: z.number().positive(), height: z.number().positive(),
  hasAudio: z.boolean(),
  captions: z.array(CaptionSchema).max(3000),
}).superRefine((a, ctx) => {
  if (new Set(a.captions.map(c => c.id)).size !== a.captions.length) ctx.addIssue({ code: "custom", message: "รหัสซับซ้ำกัน" });
  a.captions.forEach((c, i) => { if (c.end > a.duration) ctx.addIssue({ code: "custom", path: ["captions", i], message: "เวลาซับเกินความยาวต้นฉบับ" }); });
});
export const ClipSchema = z.object({
  id: z.string().min(1).max(100), assetId: z.string().uuid(),
  in: z.number().finite().min(0), out: z.number().finite().positive(),
  position: z.enum(["center", "left", "right"]).default("center"),
});
export const ProjectSchema = z.object({
  id: z.string().uuid(), name: z.string().min(1).max(120),
  assets: z.array(AssetSchema).max(20), clips: z.array(ClipSchema).max(150),
  audio: z.enum(["original", "mute"]),
  captionStyle: z.enum(["clean", "highlight", "none"]),
  headline: z.string().max(100), cta: z.string().max(100),
}).superRefine((p, ctx) => {
  const assetIds = new Set(p.assets.map(a => a.id));
  if (assetIds.size !== p.assets.length || new Set(p.clips.map(c => c.id)).size !== p.clips.length) {
    ctx.addIssue({ code: "custom", message: "รายการสื่อหรือช็อตซ้ำกัน" });
  }
  let total = 0;
  p.clips.forEach((c, i) => {
    const a = p.assets.find(a => a.id === c.assetId);
    if (!a || c.out > a.duration + 0.001 || c.out - c.in < 1 / FPS) {
      ctx.addIssue({ code: "custom", path: ["clips", i], message: "ช่วงตัดคลิปไม่ถูกต้อง" });
    }
    total += Math.round((c.out - c.in) * FPS);
  });
  if (total > FPS * 300) ctx.addIssue({ code: "custom", message: "วิดีโอรวมต้องไม่เกิน 5 นาที" });
});
export type StudioCaption = z.infer<typeof CaptionSchema>;
export type StudioAsset = z.infer<typeof AssetSchema>;
export type StudioClip = z.infer<typeof ClipSchema>;
export type StudioProject = z.infer<typeof ProjectSchema>;

// Merge nearby spoken cues and retain a short breath at either edge.
// This is speech-based cutting, not a semantic ranking of product shots.
export function speechRanges(asset: StudioAsset): Array<{ in: number; out: number }> {
  const ranges: Array<{ in: number; out: number }> = [];
  for (const c of [...asset.captions].filter(c => c.text.trim()).sort((a, b) => a.start - b.start)) {
    const start = Math.max(0, Math.round((c.start - 0.12) * FPS) / FPS);
    const end = Math.min(asset.duration, Math.round((c.end + 0.12) * FPS) / FPS);
    if (end - start < 1 / FPS) continue;
    const last = ranges[ranges.length - 1];
    if (last && start - last.out <= 0.3) last.out = Math.max(last.out, end);
    else ranges.push({ in: start, out: end });
  }
  return ranges;
}

export function clipFrames(c: StudioClip) { return Math.max(1, Math.round((c.out - c.in) * FPS)); }
export function projectFrames(p: StudioProject) { return Math.max(1, p.clips.reduce((n, c) => n + clipFrames(c), 0)); }
// Use the same rounded clip boundaries for preview, render and subtitle export.
export function timelineCaptions(p: StudioProject): StudioCaption[] {
  let offset = 0;
  const result: StudioCaption[] = [];
  for (const clip of p.clips) {
    const asset = p.assets.find(a => a.id === clip.assetId);
    const frames = clipFrames(clip);
    for (const cue of asset?.captions || []) {
      const startFrame = Math.max(0, Math.round((cue.start - clip.in) * FPS));
      const endFrame = Math.min(frames, Math.round((cue.end - clip.in) * FPS));
      if (endFrame > startFrame && cue.text.trim()) result.push({
        ...cue, id: `${clip.id}:${cue.id}`, start: (offset + startFrame) / FPS, end: (offset + endFrame) / FPS,
      });
    }
    offset += frames;
  }
  return result.sort((a, b) => a.start - b.start);
}
function timestamp(seconds: number) {
  const ms = Math.round(seconds * 1000);
  return `${String(Math.floor(ms / 3600000)).padStart(2, "0")}:${String(Math.floor(ms / 60000) % 60).padStart(2, "0")}:${String(Math.floor(ms / 1000) % 60).padStart(2, "0")},${String(ms % 1000).padStart(3, "0")}`;
}
export function studioSrt(p: StudioProject) {
  return timelineCaptions(p).map((c, i) => `${i + 1}\n${timestamp(c.start)} --> ${timestamp(c.end)}\n${c.text}\n`).join("\n");
}
export function parseSrt(text: string): StudioCaption[] {
  const blocks = text.replace(/^\uFEFF/, "").replace(/\r/g, "").trim().split(/\n\s*\n/);
  const seconds = (s: string) => { const [h, m, rest] = s.replace(",", ".").split(":"); return +h * 3600 + +m * 60 + +rest; };
  return blocks.map((block, index) => {
    const lines = block.split("\n");
    const timingIndex = lines.findIndex(l => l.includes("-->"));
    const match = lines[timingIndex]?.match(/(\d{2}:\d{2}:\d{2}[,.]\d{3})\s*-->\s*(\d{2}:\d{2}:\d{2}[,.]\d{3})/);
    if (!match) throw new Error(`รูปแบบ SRT ไม่ถูกต้องในรายการ ${index + 1}`);
    return CaptionSchema.parse({ id: `srt-${index}`, start: seconds(match[1]), end: seconds(match[2]), text: lines.slice(timingIndex + 1).join("\n") });
  });
}
