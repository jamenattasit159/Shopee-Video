import type { ShopeeProductVideoProps, CaptionCue } from '../types';

export const VIDEO_FPS = 30;
const positive = (n: unknown, fallback: number) => Number.isFinite(Number(n)) && Number(n) > 0 ? Number(n) : fallback;
export function storyboardScenes(props: ShopeeProductVideoProps) {
  return [
    { id: 'hook', role: 'hook', data: props.hook, fallbackIndex: 0 },
    ...(props.scenes || []).map((data, i) => ({ id: `scene_${i}`, role: 'body', data, fallbackIndex: i })),
    { id: 'cta', role: 'cta', data: props.cta, fallbackIndex: Math.max(0, (props.images || []).length - 1) },
  ];
}

/** Composition, audio sequences, source trims and SRT share these exact frame boundaries. */
export function buildVideoTimeline(props: ShopeeProductVideoProps, fps = VIDEO_FPS) {
  const cursors = new Map<string, number>();
  const definitions = storyboardScenes(props);
  const hasSceneAudio = (props.voiceLines || []).some((l) => l.audioUrl);
  const rawTotal = definitions.reduce((n, s) => n + positive(s.data?.durationSec, 3), 0);
  const voiceRatio = !hasSceneAudio && props.voiceoverDurationSec ? Math.max(1, (props.voiceoverDurationSec + 0.8) / rawTotal) : 1;
  let from = 0;
  const scenes = definitions.map(({ id, role, data, fallbackIndex }) => {
    const mediaIndex = Math.max(0, Number.isInteger(data?.imageIndex) ? data!.imageIndex! : fallbackIndex) % Math.max(1, props.images?.length || 0);
    const mediaUrl = props.images?.[mediaIndex] || '';
    const line = props.voiceLines?.find((l) => l.sceneId === id && l.audioUrl);
    const speechSec = positive(line?.durationSec, 0);
    const tail = role === 'cta' ? 0.8 : 0.3;
    const requestedSec = positive(data?.durationSec, 3);
    if (data?.durationMode === 'manual' && speechSec > requestedSec + 1 / fps) throw new Error(`ฉาก ${id}: เสียงยาวกว่าระยะฉาก กรุณาเพิ่มเวลา หรือเลือกตามเสียง`);
    const sceneSec = data?.durationMode === 'manual' ? requestedSec : Math.max(requestedSec * voiceRatio, speechSec ? speechSec + tail : 0);
    const durationInFrames = Math.max(1, Math.ceil(sceneSec * fps));
    const sourceDuration = props.mediaDurations?.[mediaUrl];
    const isVideo = /\.(mp4|mov|webm|m4v)(\?|$)/i.test(mediaUrl);
    const explicitStart = data?.videoStartSec !== undefined;
    const videoStartSec = explicitStart ? Math.max(0, Number(data?.videoStartSec) || 0) : Math.min(cursors.get(mediaUrl) || 0, sourceDuration ? Math.max(0, sourceDuration - 1 / fps) : Infinity);
    const videoEndSec = data?.videoEndSec !== undefined ? Number(data.videoEndSec) : sourceDuration;
    if (isVideo && ((videoEndSec !== undefined && (!Number.isFinite(videoEndSec) || videoEndSec <= videoStartSec)) || (sourceDuration && (videoStartSec >= sourceDuration || (videoEndSec ?? 0) > sourceDuration + 1 / fps)))) {
      throw new Error(`ฉาก ${id}: ช่วงคลิปไม่ถูกต้อง กรุณาตรวจเวลาเข้า–ออกและความยาวไฟล์`);
    }
    const availableFrames = videoEndSec !== undefined ? Math.max(1, Math.round((videoEndSec - videoStartSec) * fps)) : durationInFrames;
    const fillMode = data?.videoFillMode || 'freeze';
    if (isVideo && fillMode === 'error' && availableFrames < durationInFrames) throw new Error(`ฉาก ${id}: ช่วงคลิปสั้นกว่าฉาก กรุณาเลือกช่วงเพิ่ม หรือเลือกค้างภาพสุดท้าย`);
    if (isVideo) cursors.set(mediaUrl, videoStartSec + Math.min(durationInFrames, availableFrames) / fps);
    const result = { id, role, from, durationInFrames, mediaIndex, mediaUrl, videoStartSec, videoEndSec, fillMode, availableFrames, audioUrl: line?.audioUrl, speechFrames: Math.round(speechSec * fps), data };
    from += durationInFrames;
    return result;
  });
  return { fps, scenes, durationInFrames: Math.max(1, from) };
}

export function timelineCaptionCues(props: ShopeeProductVideoProps): CaptionCue[] {
  if (props.captionCues?.length) return props.captionCues;
  const timeline = buildVideoTimeline(props);
  const cues: CaptionCue[] = [];
  for (const scene of timeline.scenes) {
    const line = props.voiceLines?.find((l) => l.sceneId === scene.id && l.audioUrl);
    if (line?.durationSec) cues.push({ text: line.text, startSec: scene.from / timeline.fps, endSec: scene.from / timeline.fps + line.durationSec });
  }
  if (!cues.length && props.voiceoverUrl && props.voiceoverDurationSec && props.narrationScript) cues.push({ text: props.narrationScript, startSec: 0, endSec: props.voiceoverDurationSec });
  return cues;
}
