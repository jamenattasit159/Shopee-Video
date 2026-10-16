import { execFile, execFileSync } from 'node:child_process';
import fs from 'node:fs/promises';
import fsSync from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { promisify } from 'node:util';
import sharp from 'sharp';
import { buildSceneOverlaySvg } from './render-layout.mjs';

const exec = promisify(execFile);
const isVideo = (file) => /\.(mp4|mov|webm|m4v)$/i.test(file);
let runtime;

// Remotion's binary omits overlay/fps/crop. Test capabilities before selecting it.
export function getRenderRuntime() {
  if (runtime) return runtime;
  const exe = process.platform === 'win32' ? 'ffmpeg.exe' : 'ffmpeg';
  const candidates = [process.env.FFMPEG_PATH, ...(process.env.PATH || '').split(path.delimiter).map((dir) => path.join(dir.replace(/^"|"$/g, ''), exe)), 'ffmpeg'];
  const required = ['overlay', 'fps', 'crop', 'format', 'zoompan', 'fade', 'amix', 'apad', 'loudnorm', 'alimiter'];
  for (const bin of [...new Set(candidates.filter(Boolean))]) {
    try {
      const filters = execFileSync(bin, ['-hide_banner', '-filters'], { encoding: 'utf8', windowsHide: true, stdio: ['ignore', 'pipe', 'ignore'] });
      if (!required.every((name) => new RegExp('\\s' + name + '\\s').test(filters))) continue;
      const sibling = path.join(path.dirname(bin), process.platform === 'win32' ? 'ffprobe.exe' : 'ffprobe');
      const probe = fsSync.existsSync(sibling) ? sibling : 'ffprobe';
      execFileSync(probe, ['-version'], { stdio: 'ignore', windowsHide: true });
      return runtime = { ffmpeg: bin, ffprobe: probe };
    } catch {}
  }
  throw new Error('ไม่พบ FFmpeg รุ่นเต็มที่รองรับการซ้อนภาพ กรุณาติดตั้ง FFmpeg และเพิ่มลง PATH');
}

function diskMedia(url) {
  if (typeof url !== 'string' || !url.trim()) throw new Error('ไม่ได้ระบุไฟล์สื่อสำหรับฉากวิดีโอ');
  const root = path.resolve('public');
  const file = path.resolve(root, decodeURIComponent(url.split('?')[0]).replace(/^[/\\]+/, ''));
  if (!file.startsWith(root + path.sep) || !fsSync.existsSync(file)) throw new Error('ไม่พบไฟล์สื่อ: ' + url);
  return file;
}
function probe(file) {
  return JSON.parse(execFileSync(getRenderRuntime().ffprobe, ['-v', 'error', '-show_format', '-show_streams', '-of', 'json', file], { encoding: 'utf8', windowsHide: true }));
}
const duration = (file) => Number(probe(file).format?.duration) || 0;
const seconds = (value, fallback) => Number.isFinite(Number(value)) && Number(value) > 0 ? Number(value) : fallback;

export function createRenderPlan(props, voiceDuration = 0, lineDurations = []) {
  const images = props.images || [];
  if (!images.length) throw new Error('กรุณาเพิ่มภาพหรือคลิปสินค้าก่อนสร้างวิดีโอ');
  const pick = (index, fallback) => images[((Number.isInteger(index) ? index : fallback) % images.length + images.length) % images.length];
  const hook = props.hook || {};
  const cta = props.cta || {};
  const scenes = [
    { id: 'hook', role: 'hook', headline: hook.headline || props.productName, subheadline: hook.subheadline, badgeText: hook.badgeText, captionText: hook.customCaption, mediaUrl: pick(hook.imageIndex, 0), durationSec: seconds(hook.durationSec, 3), videoStartSec: hook.videoStartSec },
    ...(props.scenes || []).map((s, i) => ({ id: 'scene_' + i, role: 'body', headline: s.highlightTitle, subheadline: s.highlightDesc, badgeText: s.stickerText, captionText: s.customCaption, mediaUrl: pick(s.imageIndex, i), durationSec: seconds(s.durationSec, 3.5), videoStartSec: s.videoStartSec })),
    { id: 'cta', role: 'cta', headline: cta.ctaTitle || 'ดูรายละเอียดสินค้า', subheadline: cta.ctaSubtitle, badgeText: cta.badgeText, captionText: cta.customCaption, mediaUrl: pick(cta.imageIndex, images.length - 1), durationSec: seconds(cta.durationSec, 3), videoStartSec: cta.videoStartSec },
  ];
  const rawTotal = scenes.reduce((sum, s) => sum + s.durationSec, 0);
  // Keep reading time. Pad audio instead of truncating the CTA with -shortest.
  const ratio = Math.max(1, (voiceDuration + (voiceDuration ? 0.8 : 0)) / rawTotal);
  let cursor = 0;
  return scenes.map((scene) => {
    const line = lineDurations.find((l) => l.sceneId === scene.id);
    const durationFrames = Math.ceil(Math.max(1.5, line ? line.duration + (scene.role === 'cta' ? 0.8 : 0.25) : scene.durationSec * ratio) * 30);
    const result = { ...scene, durationSec: durationFrames / 30, durationFrames, startSec: cursor };
    cursor += result.durationSec;
    return result;
  });
}

async function renderSegment(scene, context) {
  const { ffmpeg, dir, width, height, props, index, count } = context;
  const file = diskMedia(scene.mediaUrl);
  const video = isVideo(file);
  const overlay = await buildSceneOverlaySvg({ ...scene, captionText: props.captionSettings?.enabled === false ? '' : scene.captionText, index, count, video, productName: props.productName, price: props.price, buttonText: props.cta?.buttonText, primaryColor: props.styleDNA?.primaryColor || props.theme?.primaryColor });
  const hud = path.join(dir, 'hud-' + index + '.png');
  await sharp(Buffer.from(overlay)).resize(width, height).png().toFile(hud);
  const segment = path.join(dir, 'scene-' + index + '.mp4');
  let args;
  if (video) {
    const info = probe(file);
    if (!info.streams?.some((s) => s.codec_type === 'video')) throw new Error('คลิปไม่มีภาพวิดีโอ: ' + scene.mediaUrl);
    const clipDuration = Number(info.format?.duration) || 0;
    const start = Math.max(0, Number(scene.videoStartSec) || 0);
    if (start >= clipDuration) throw new Error('เวลาเริ่มคลิปเกินความยาวไฟล์: ' + scene.mediaUrl);
    args = ['-stream_loop', '-1', '-ss', String(start), '-i', file, '-loop', '1', '-framerate', '30', '-i', hud,
      '-filter_complex', '[0:v:0]scale=' + width + ':' + height + ':force_original_aspect_ratio=increase,crop=' + width + ':' + height + ',setsar=1,fps=30,setpts=PTS-STARTPTS[media];[media][1:v:0]overlay=0:0:shortest=1,fade=t=in:st=0:d=0.12,format=yuv420p[v]', '-map', '[v]'];
  } else {
    const product = await sharp(file).rotate().resize(920, 1000, { fit: 'contain', background: '#ffffff' }).png().toBuffer();
    // Composite at full size BEFORE resizing, avoiding Sharp's resize-before-composite behavior.
    const base = await sharp({ create: { width: 1080, height: 1920, channels: 3, background: '#101416' } })
      .composite([{ input: product, left: 80, top: 430 }]).png().toBuffer();
    const photo = path.join(dir, 'photo-' + index + '.png');
    await sharp(base).resize(width, height).png().toFile(photo);
    args = ['-loop', '1', '-framerate', '30', '-i', photo, '-loop', '1', '-framerate', '30', '-i', hud,
      '-filter_complex', "[0:v]zoompan=z='1+0.025*on/" + scene.durationFrames + "':x='iw/2-iw/zoom/2':y='ih/2-ih/zoom/2':d=1:s=" + width + "x" + height + ":fps=30[media];[media][1:v]overlay=0:0,fade=t=in:st=0:d=0.12,format=yuv420p[v]", '-map', '[v]'];
  }
  args.push('-frames:v', String(scene.durationFrames), '-an', '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '19', '-pix_fmt', 'yuv420p', '-r', '30', '-video_track_timescale', '15360', segment);
  try {
    await exec(ffmpeg, ['-hide_banner', '-loglevel', 'error', '-y', ...args], { timeout: 120000, windowsHide: true, maxBuffer: 4 * 1024 * 1024 });
  } catch (err) {
    throw new Error('สร้างฉากที่ ' + (index + 1) + ' ไม่สำเร็จ (' + scene.mediaUrl + '): ' + (err.stderr || err.message));
  }
  return segment;
}

export async function runFastFfmpegRender({ inputProps: props, outputPath, scale = 1, progressFile }) {
  const started = Date.now();
  const { ffmpeg } = getRenderRuntime();
  await fs.mkdir(path.resolve('.tmp'), { recursive: true });
  const dir = await fs.mkdtemp(path.resolve('.tmp', 'fast-render-'));
  const relativeVideoUrl = '/' + path.relative(path.resolve('public'), outputPath).replace(/\\/g, '/');
  const progress = async (percent, message, status = 'rendering') => {
    if (progressFile) {
      await fs.mkdir(path.dirname(progressFile), { recursive: true });
      await fs.writeFile(
        progressFile,
        JSON.stringify({
          status: status === 'complete' && props.renderRequestId ? 'finalizing' : status,
          requestId: props.renderRequestId,
          percent,
          message,
          productId: props.productId,
          videoUrl: relativeVideoUrl,
          updatedAt: Date.now()
        })
      );
    }
  };
  try {
    await progress(8, 'กำลังตรวจไฟล์ภาพ คลิป และเสียงก่อนเรนเดอร์...');
    const voiceLines = (props.voiceLines || []).filter((l) => l.audioUrl).map((l) => {
      const file = diskMedia(l.audioUrl);
      return { ...l, file, duration: duration(file) };
    });
    const expectedIds = ['hook', ...(props.scenes || []).map((_, i) => 'scene_' + i), 'cta'];
    const useLines = expectedIds.every((id) => voiceLines.some((l) => l.sceneId === id && l.duration > 0));
    const voice = !useLines && props.voiceoverUrl ? diskMedia(props.voiceoverUrl) : null;
    const voiceDuration = voice ? duration(voice) : 0;
    if (voice && !voiceDuration) throw new Error('ไม่สามารถอ่านเสียงพากย์ได้');
    if (voiceLines.length && !useLines && !voice) throw new Error('เสียงพากย์รายฉากไม่ครบ กรุณาสร้างเสียงให้ครบทุกฉาก');
    const plan = createRenderPlan(props, useLines ? 0 : voiceDuration, useLines ? voiceLines : []);
    for (const scene of plan) diskMedia(scene.mediaUrl);
    const width = scale < 1 ? 720 : 1080;
    const height = scale < 1 ? 1280 : 1920;
    const files = [];
    for (const [index, scene] of plan.entries()) {
      await progress(Math.round(12 + index / plan.length * 65), 'กำลังสร้างฉาก ' + (index + 1) + '/' + plan.length + ' พร้อมภาพสินค้า...');
      files.push(await renderSegment(scene, { ffmpeg, dir, width, height, props, index, count: plan.length }));
    }
    const totalDuration = plan.reduce((sum, s) => sum + s.durationSec, 0);
    const list = path.join(dir, 'concat.txt');
    await fs.writeFile(list, files.map((f) => "file '" + f.replace(/\\/g, '/').replace(/'/g, "'\\''") + "'").join('\n'));
    const silent = path.join(dir, 'picture.mp4');
    await exec(ffmpeg, ['-v', 'error', '-y', '-f', 'concat', '-safe', '0', '-i', list, '-c', 'copy', silent], { windowsHide: true });
    await progress(82, 'กำลังผสมเสียงและตรวจความยาวฉากปิดท้าย...');
    const args = ['-v', 'error', '-y', '-i', silent];
    const filters = [];
    const tracks = [];
    let input = 1;
    if (useLines) {
      for (const scene of plan) {
        const line = voiceLines.find((l) => l.sceneId === scene.id);
        args.push('-i', line.file);
        const label = 'voice' + input;
        filters.push('[' + input + ':a]aresample=48000,adelay=' + Math.round(scene.startSec * 1000) + ':all=1[' + label + ']');
        tracks.push('[' + label + ']'); input++;
      }
    } else if (voice) {
      args.push('-i', voice);
      filters.push('[' + input + ':a]aresample=48000,loudnorm=I=-16:TP=-1.5:LRA=11[voice]');
      tracks.push('[voice]'); input++;
    }
    const bgmUrl = props.bgmUrl === undefined ? '/audio/bgm-upbeat.mp3' : props.bgmUrl;
    const defaultBgm = path.resolve('public/audio/bgm-upbeat.mp3');
    const bgm = bgmUrl && (props.bgmUrl !== undefined || fsSync.existsSync(defaultBgm)) ? diskMedia(bgmUrl) : null;
    if (bgm) {
      args.push('-stream_loop', '-1', '-i', bgm);
      filters.push('[' + input + ':a]aresample=48000,volume=' + (voice || useLines ? 0.07 : 0.3) + ',afade=t=out:st=' + Math.max(0, totalDuration - 0.7) + ':d=0.7[bgm]');
      tracks.push('[bgm]');
    }
    if (tracks.length) {
      filters.push(tracks.join('') + 'amix=inputs=' + tracks.length + ':duration=longest:normalize=0,apad,alimiter=limit=0.95[a]');
      args.push('-filter_complex', filters.join(';'), '-map', '0:v:0', '-map', '[a]', '-c:a', 'aac', '-b:a', '192k', '-ar', '48000');
    } else args.push('-map', '0:v:0');
    const candidate = path.join(dir, 'finished.mp4');
    args.push('-c:v', 'copy', '-t', String(totalDuration), '-movflags', '+faststart', candidate);
    await exec(ffmpeg, args, { timeout: 120000, windowsHide: true, maxBuffer: 4 * 1024 * 1024 });
    const info = probe(candidate);
    const video = info.streams?.find((s) => s.codec_type === 'video');
    if (video?.width !== width || video?.height !== height || Math.abs(Number(info.format?.duration) - totalDuration) > 0.15) throw new Error('ไฟล์วิดีโอส่งออกมีขนาดหรือความยาวไม่ครบ');
    if (tracks.length && !info.streams.some((s) => s.codec_type === 'audio')) throw new Error('ไฟล์ส่งออกไม่มีเสียง');
    await fs.copyFile(candidate, outputPath);
    const manifest = { engine: 'studio-ffmpeg', width, height, fps: 30, durationSec: totalDuration, price: props.price, scenes: plan, audio: useLines ? 'per-scene' : voice ? 'voiceover' : bgm ? 'music' : 'none' };
    await fs.writeFile(outputPath.replace(/\.mp4$/i, '.render.json'), JSON.stringify(manifest, null, 2));
    const elapsedSec = (Date.now() - started) / 1000;
    await progress(100, 'สร้างวิดีโอและตรวจไฟล์เสร็จแล้ว (' + elapsedSec.toFixed(1) + ' วินาที)', 'complete');
    return { success: true, elapsedSec, outputPath, manifest };
  } catch (err) {
    await progress(0, err.message, 'error'); throw err;
  } finally {
    await fs.rm(dir, { recursive: true, force: true });
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  const args = process.argv.slice(2);
  const option = (key) => args[args.indexOf(key) + 1];
  const propsFile = args.includes('--props-file') ? option('--props-file') : null;
  const outputPath = path.resolve(args.includes('--output') ? option('--output') : 'public/renders/shopee_' + Date.now() + '.mp4');
  runFastFfmpegRender({ inputProps: propsFile ? JSON.parse(await fs.readFile(propsFile, 'utf8')) : {}, outputPath, scale: args.includes('--scale') ? Number(option('--scale')) : 1, progressFile: path.resolve(args.includes('--progress-file') ? option('--progress-file') : '.tmp/render_progress.json') })
    .then(() => console.log('Output ready: ' + outputPath))
    .catch((err) => { console.error(err.message); process.exitCode = 1; });
}

