import { z } from "zod";

export const sceneSchema = z.object({
  id: z.string().min(1).max(80), role: z.enum(["hook", "demo", "detail", "cta"]),
  title: z.string().max(160), narration: z.string().max(2500), overlay: z.string().max(200),
  shot: z.string().max(1000), duration: z.number().min(1).max(60),
  assetId: z.string().nullable().default(null), inPoint: z.number().min(0).default(0)
});
export const projectInput = z.object({
  name: z.string().trim().min(1, "กรุณาระบุชื่อสินค้า").max(240),
  link: z.string().max(2500).default(""), price: z.string().max(80).default(""),
  facts: z.string().max(6000).default(""), experience: z.string().max(6000).default(""),
  audience: z.string().max(500).default("คนที่กำลังตัดสินใจซื้อ"),
  tone: z.enum(["honest", "tutorial", "problem", "unboxing"]).default("honest"),
  duration: z.number().int().min(15).max(90).default(30),
  platform: z.enum(["shopee", "tiktok", "reels"]).default("shopee"),
  scenes: z.array(sceneSchema).max(20).default([]),
  caption: z.string().max(6000).default(""),
  voice: z.enum(["female", "male", "original"]).default("male"),
  ttsEngine:z.enum(["gemini","edge"]).default("gemini"),
  geminiVoice:z.string().min(1).max(240).default("Puck"),
  voicePresetId:z.string().max(80).default("vendor-live"),
  voiceIntensity:z.enum(["low","mid","high"]).default("mid"),
  voiceStyle:z.string().max(2000).default(""),
  voicePolish:z.boolean().default(true),
  rate: z.number().int().min(-30).max(30).default(0),
  voiceAssetId: z.string().nullable().default(null),
  music: z.enum(["none", "soft", "upbeat"]).default("soft"),
  verified: z.boolean().default(false), rightsConfirmed: z.boolean().default(false),
  scriptSource: z.enum(["manual", "template", "gemini"]).default("manual")
});
export type ProjectInput = z.infer<typeof projectInput>;
// Defaults belong to creation only. Zod 4 applies inner defaults to partial fields,
// so remove them explicitly before defining PATCH semantics.
const shape=projectInput.shape;
export const projectPatch=z.object({
  name:shape.name.optional(), link:shape.link.removeDefault().optional(),
  price:shape.price.removeDefault().optional(),facts:shape.facts.removeDefault().optional(),
  experience:shape.experience.removeDefault().optional(),audience:shape.audience.removeDefault().optional(),
  tone:shape.tone.removeDefault().optional(),duration:shape.duration.removeDefault().optional(),
  platform:shape.platform.removeDefault().optional(),scenes:shape.scenes.removeDefault().optional(),
  caption:shape.caption.removeDefault().optional(),voice:shape.voice.removeDefault().optional(),
  ttsEngine:shape.ttsEngine.removeDefault().optional(),geminiVoice:shape.geminiVoice.removeDefault().optional(),
  voicePresetId:shape.voicePresetId.removeDefault().optional(),voiceIntensity:shape.voiceIntensity.removeDefault().optional(),
  voiceStyle:shape.voiceStyle.removeDefault().optional(),voicePolish:shape.voicePolish.removeDefault().optional(),
  rate:shape.rate.removeDefault().optional(),voiceAssetId:shape.voiceAssetId.removeDefault().optional(),
  music:shape.music.removeDefault().optional(),verified:shape.verified.removeDefault().optional(),
  rightsConfirmed:shape.rightsConfirmed.removeDefault().optional(),scriptSource:shape.scriptSource.removeDefault().optional()
});
export type Scene = z.infer<typeof sceneSchema>;
export type Asset = {
  id: string; projectId: string; name: string; kind: "video" | "image" | "audio";
  mime: string; size: number; duration: number | null; width: number | null; height: number | null;
  role: string; filename: string; thumbnail: string | null; createdAt: string;
};
export type Project = ProjectInput & {
  id: string; revision: number; createdAt: string; updatedAt: string; archived: boolean;
  status: "draft" | "editing" | "review" | "done";
  capcutUrl: string | null; assets: Asset[];
};
export type Job = {
  id: string; projectId: string; state: "prepared" | "running" | "completed" | "failed" | "cancelled";
  createdAt: string; updatedAt: string; message: string; draftUrl: string | null;
  projectRevision: number; snapshot: Project; draftId: string | null;
};
export const resultSchema = z.object({
  success: z.boolean(), draftId: z.string().nullable(), editUrl: z.string().nullable(),
  message: z.string().max(2000)
});
export function readiness(project: Project) {
  const hasFootage = project.assets.some(a => a.kind === "video");
  const sceneAssets = project.scenes.every(s => s.assetId && project.assets.some(a => a.id === s.assetId && a.kind !== "audio"));
  const clipsFit = project.scenes.every(s => {
    const a = project.assets.find(a => a.id === s.assetId);
    return !a || a.kind !== "video" || (a.duration !== null && s.inPoint + s.duration <= a.duration + 0.1);
  });
  return [
    { key: "facts", label: "ตรวจชื่อ ราคา และข้อเท็จจริงแล้ว", ok: project.verified },
    { key: "media", label: "มีภาพหรือวิดีโอต้นฉบับ", ok: project.assets.some(a => a.kind !== "audio") },
    { key: "real", label: "มีวิดีโอสาธิตการใช้งานจริง", ok: hasFootage, optional: true },
    { key: "script", label: "สคริปต์ครบทุกซีน", ok: project.scenes.length >= 3 && project.scenes.every(s => s.narration.trim()) },
    { key: "shots", label: "จับคู่ฟุตเทจและช่วงเวลาครบ", ok: sceneAssets && clipsFit && project.scenes.length > 0 },
    { key: "voice", label: project.voice === "original" ? "เลือกใช้เสียงจากคลิปต้นฉบับ" : "มีไฟล์เสียงพากย์", ok: project.voice === "original" || !!project.assets.find(a => a.id === project.voiceAssetId && a.kind === "audio") },
    { key: "rights", label: "ยืนยันสิทธิ์ในภาพ วิดีโอ และเสียง", ok: project.rightsConfirmed }
  ];
}
