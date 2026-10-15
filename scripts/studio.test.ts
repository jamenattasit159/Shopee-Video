import test from "node:test";
import assert from "node:assert/strict";
import { FPS, ProjectSchema, projectFrames, speechRanges, timelineCaptions, studioSrt, parseSrt, StudioProject } from "../src/lib/studio";

const assetId = "00000000-0000-4000-8000-000000000001";
const project = (): StudioProject => ({ id: "00000000-0000-4000-8000-000000000002", name: "Test", assets: [{ id: assetId, name: "source.mp4", url: `/uploads/studio_${assetId}.mp4`, duration: 10, width: 1920, height: 1080, hasAudio: true, captions: [{ id: "one", start: 1, end: 3, text: "สินค้าจริง" }, { id: "two", start: 6, end: 8, text: "ทดลองใช้งาน" }] }], clips: [{ id: "a", assetId, in: 2, out: 4, position: "center" }, { id: "b", assetId, in: 6, out: 9, position: "right" }], audio: "original", captionStyle: "clean", headline: "", cta: "" });

test("trim clips truncates source captions and shifts them to the output timeline", () => {
  const p = project();
  assert.equal(projectFrames(p), 5 * FPS);
  assert.deepEqual(timelineCaptions(p).map(c => [c.start, c.end, c.text]), [[0, 1, "สินค้าจริง"], [2, 4, "ทดลองใช้งาน"]]);
});
test("reordering and reusing a source produces independently timed caption copies", () => {
  const p = project(); p.clips = [p.clips[1], p.clips[0], { ...p.clips[0], id: "repeat" }];
  assert.deepEqual(timelineCaptions(p).map(c => [c.start, c.end]), [[0, 2], [3, 4], [5, 6]]);
  assert.equal(new Set(timelineCaptions(p).map(c => c.id)).size, 3);
});
test("caption boundaries use the same rounded frames as output clips", () => {
  const p = project(); p.clips = [{ ...p.clips[0], in: 1.01, out: 2.07 }, { ...p.clips[1], in: 1.01, out: 2.07 }];
  const cues = timelineCaptions(p);
  assert.equal(cues[0].end * FPS, Math.round(1.06 * FPS));
  assert.equal(cues[1].start, cues[0].end);
  assert.equal(cues[1].end, projectFrames(p) / FPS);
});
test("SRT export round-trips Thai text and trimmed timestamps", () => {
  const p = project(); const srt = studioSrt(p); const imported = parseSrt(srt);
  assert.ok(srt.includes("00:00:02,000 --> 00:00:04,000"));
  assert.deepEqual(imported.map(c => [c.start, c.end, c.text]), timelineCaptions(p).map(c => [c.start, c.end, c.text]));
  assert.throws(() => parseSrt("1\nno timestamps\ntext"));
});
test("validation rejects traversal, negative/overlong cuts and captions outside the source", () => {
  const p = project(); assert.ok(ProjectSchema.safeParse(p).success);
  assert.ok(!ProjectSchema.safeParse({ ...p, assets: [{ ...p.assets[0], url: "/uploads/../../.env.local" }] }).success);
  assert.ok(!ProjectSchema.safeParse({ ...p, clips: [{ ...p.clips[0], in: 5, out: 4 }] }).success);
  assert.ok(!ProjectSchema.safeParse({ ...p, clips: [{ ...p.clips[0], out: 11 }] }).success);
  assert.ok(!ProjectSchema.safeParse({ ...p, assets: [{ ...p.assets[0], captions: [{ id: "bad", start: 9, end: 11, text: "bad" }] }] }).success);
});
test("empty timeline and missing speech never fabricate captions", () => {
  const p = project(); p.assets[0].captions = [];
  assert.deepEqual(timelineCaptions(p), []); assert.equal(studioSrt(p), "");
  p.clips = []; assert.equal(projectFrames(p), 1);
});
test("speech-based cutting retains breaths, removes large gaps, and merges nearby cues", () => {
  const a = project().assets[0];
  a.captions = [{ id: "a", start: 0, end: 1, text: "หนึ่ง" }, { id: "b", start: 1.2, end: 2, text: "สอง" }, { id: "c", start: 5, end: 6, text: "สาม" }];
  const ranges = speechRanges(a);
  assert.equal(ranges.length, 2);
  assert.equal(ranges[0].in, 0);
  assert.ok(ranges[0].out > 2 && ranges[0].out < 2.2);
  assert.ok(ranges[1].in > 4.8 && ranges[1].in < 5);
  a.captions = []; assert.deepEqual(speechRanges(a), []);
});
