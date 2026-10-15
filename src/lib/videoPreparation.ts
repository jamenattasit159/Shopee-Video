import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { getFfprobePath } from './ffmpeg';
import { alignSpeech } from './captionAlignment';
import { buildVideoTimeline } from '../../remotion/lib/videoTimeline';
import type { CaptionCue, ShopeeProductVideoProps } from '../../remotion/types';

function mediaFile(url: string) {
  const root = path.resolve('public');
  const file = path.resolve(root, decodeURIComponent(url.split('?')[0]).replace(/^[/\\]+/, ''));
  if (!file.startsWith(root + path.sep) || !fs.existsSync(file)) throw new Error(`ไม่พบไฟล์สื่อ: ${url}`);
  return file;
}
function mediaDuration(url: string) {
  const output = execFileSync(getFfprobePath(), ['-v', 'error', '-show_entries', 'format=duration', '-of', 'default=noprint_wrappers=1:nokey=1', mediaFile(url)], { encoding: 'utf8', windowsHide: true });
  const value = Number(output.trim());
  if (!Number.isFinite(value) || value <= 0) throw new Error(`อ่านความยาวสื่อไม่ได้: ${url}`);
  return value;
}
export async function prepareVideoProps(input: ShopeeProductVideoProps): Promise<ShopeeProductVideoProps> {
  const props: ShopeeProductVideoProps = structuredClone(input);
  props.mediaDurations = {};
  for (const url of props.images || []) {
    mediaFile(url);
    if (/\.(mp4|mov|webm|m4v)(\?|$)/i.test(url)) props.mediaDurations[url] = mediaDuration(url);
  }
  props.voiceLines = (props.voiceLines || []).map((line) => line.audioUrl ? { ...line, durationSec: mediaDuration(line.audioUrl) } : line);
  const hasLines = props.voiceLines.some((line) => line.audioUrl);
  if (props.voiceoverUrl && !hasLines) props.voiceoverDurationSec = mediaDuration(props.voiceoverUrl);
  const timeline = buildVideoTimeline(props);
  if (hasLines && timeline.scenes.some((scene) => !props.voiceLines!.some((line) => line.sceneId === scene.id && line.audioUrl))) throw new Error('เสียงพากย์รายฉากไม่ครบ กรุณาสร้างเสียงให้ครบทุกฉาก');
  if (!hasLines && props.voiceoverDurationSec && props.voiceoverDurationSec > timeline.durationInFrames / timeline.fps) throw new Error('ระยะเวลาฉากรวมสั้นกว่าเสียงพากย์ กรุณาเพิ่มเวลาฉาก');
  props.captionCues = [];
  if (props.captionSettings?.enabled !== false) {
    const cues: CaptionCue[] = [];
    if (hasLines) {
      for (const scene of timeline.scenes) {
        const line = props.voiceLines.find((l) => l.sceneId === scene.id);
        if (!line?.audioUrl) throw new Error(`เสียงพากย์รายฉากไม่ครบ (${scene.id}) กรุณาสร้างเสียงให้ครบก่อนเรนเดอร์`);
        if (scene.data?.customCaption?.trim()) {
          cues.push({ text: scene.data.customCaption.trim(), startSec: scene.from / timeline.fps, endSec: scene.from / timeline.fps + line.durationSec! });
          continue;
        }
        const aligned = await alignSpeech(mediaFile(line.audioUrl), line.text, line.durationSec!, props.captionSettings?.language);
        const offset = scene.from / timeline.fps;
        cues.push(...aligned.map((cue) => ({ ...cue, startSec: cue.startSec + offset, endSec: cue.endSec + offset })));
      }
    } else if (props.voiceoverUrl) {
      const transcript = props.narrationScript || props.voiceLines.map((l) => l.text).join(' ');
      if (!transcript?.trim()) throw new Error('ไม่มีบทพูดที่ตรงกับไฟล์เสียง กรุณาระบุบทพากย์ก่อนจัดเวลาซับ');
      cues.push(...await alignSpeech(mediaFile(props.voiceoverUrl), transcript, props.voiceoverDurationSec!, props.captionSettings?.language));
    }
    props.captionCues = cues;
  }
  return props;
}
