import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';
import { runFastFfmpegRender } from './fast-ffmpeg-render.mjs';

// A short phone-like clip must remain visible, and short audio must not cut off the CTA.
test('mixed video/image export preserves media and the complete closing scene', { timeout: 120000 }, async () => {
  const dir = await fs.mkdtemp(path.resolve('public', 'render-test-'));
  const url = (name) => `/${path.basename(dir)}/${name}`;
  const outputPath = path.join(dir, 'result.mp4');
  try {
    execFileSync('ffmpeg', ['-v', 'error', '-y', '-f', 'lavfi', '-i', 'color=c=0x00cc44:s=360x640:d=0.5:r=30', '-c:v', 'libx264', '-pix_fmt', 'yuv420p', path.join(dir, 'clip.mp4')]);
    await sharp({ create: { width: 600, height: 700, channels: 3, background: '#0088ff' } }).png().toFile(path.join(dir, 'product.png'));
    execFileSync('ffmpeg', ['-v', 'error', '-y', '-f', 'lavfi', '-i', 'sine=frequency=440:duration=3', path.join(dir, 'voice.wav')]);
    await runFastFfmpegRender({ outputPath, scale: 0.667, inputProps: {
      productName: 'ทดสอบสินค้า', price: 'เพื่อแม่เราลดได้',
      images: [url('clip.mp4'), url('product.png')],
      voiceoverUrl: url('voice.wav'), voiceoverDurationSec: 3,
      bgmUrl: '',
      hook: { headline: 'อ่อนโยน ปลอดภัย', imageIndex: 0, durationSec: 2 },
      scenes: [{ highlightTitle: 'เช็ดสะอาดได้ทั้งตัว', highlightDesc: 'ใช้งานง่าย', imageIndex: 0, durationSec: 2 }],
      cta: { ctaTitle: 'ดูรายละเอียดสินค้า', imageIndex: 1, buttonText: 'ดูสินค้าที่ Shopee', durationSec: 2 },
    } });
    const probe = JSON.parse(execFileSync('ffprobe', ['-v', 'error', '-show_format', '-show_streams', '-of', 'json', outputPath], { encoding: 'utf8' }));
    assert.ok(Number(probe.format.duration) >= 5.95, `CTA was truncated: ${probe.format.duration}s`);
    assert.ok(probe.streams.some((s) => s.codec_type === 'audio'), 'export lost its audio');
    assert.ok(probe.streams.some((s) => s.codec_name === 'h264' && s.width === 720 && s.height === 1280));
    for (const second of [0.2, 1.5, 3.5]) {
      const frame = execFileSync('ffmpeg', ['-v', 'error', '-ss', String(second), '-i', outputPath, '-frames:v', '1', '-f', 'image2pipe', '-vcodec', 'png', '-']);
      const { data } = await sharp(frame).extract({ left: 300, top: 600, width: 80, height: 80 }).removeAlpha().raw().toBuffer({ resolveWithObject: true });
      let green = 0;
      for (let i = 0; i < data.length; i += 3) if (data[i + 1] > data[i] + 50 && data[i + 1] > data[i + 2] + 50) green++;
      assert.ok(green > 5000, `video missing at ${second}s (${green} green pixels)`);
    }
    const ending = execFileSync('ffmpeg', ['-v', 'error', '-ss', '5.5', '-i', outputPath, '-frames:v', '1', '-f', 'image2pipe', '-vcodec', 'png', '-']);
    assert.ok(ending.length > 1000, 'closing scene missing');
  } finally {
    await fs.rm(dir, { recursive: true, force: true });
  }
});
