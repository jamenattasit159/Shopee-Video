import { test } from 'node:test';
import assert from 'node:assert/strict';
import sharp from 'sharp';
import fs from 'node:fs/promises';
import path from 'node:path';

test('uploaded mascot keeps transparency and GIF poses follow the video clock', async () => {
  const upload = await import('../src/lib/mascotUpload.ts').catch(() => null);
  const clock = await import('../remotion/lib/mascotAnimation.ts').catch(() => null);
  assert.ok(upload && clock, 'mascot upload and frame playback are missing');
  await fs.mkdir(path.resolve('.diagnostics'), { recursive: true });
  const dir = await fs.mkdtemp(path.resolve('.diagnostics/mascot-test-'));
  try {
    const png = await sharp({ create: { width: 8, height: 8, channels: 4, background: { r: 255, g: 0, b: 0, alpha: 0.5 } } }).png().toBuffer();
    const result = await upload.storeMascot(png, dir, '/test-mascot');
    const metadata = await sharp(path.join(dir, path.basename(result.mascotUrl))).metadata();
    assert.equal(metadata.hasAlpha, true);
    await assert.rejects(() => upload.storeMascot(Buffer.from('invalid'), dir, '/test-mascot'));
    const pixels = Buffer.alloc(8 * 16 * 4);
    for (let i = 0; i < 8 * 16; i++) { pixels[i * 4 + (i < 64 ? 0 : 1)] = 255; pixels[i * 4 + 3] = 255; }
    const gif = await sharp(pixels, { raw: { width: 8, height: 16, channels: 4, pageHeight: 8 } }).gif({ delay: [100, 200], loop: 0 }).toBuffer();
    const animated = await upload.storeMascot(gif, dir, '/test-mascot');
    assert.equal(animated.mascotAnimation?.frames.length, 2);
    const frames = animated.mascotAnimation!.frames;
    assert.equal(clock.mascotFrameUrl(animated.mascotUrl, animated.mascotAnimation, 0), frames[0].url);
    assert.equal(clock.mascotFrameUrl(animated.mascotUrl, animated.mascotAnimation, 0.15), frames[1].url);
    assert.equal(clock.mascotFrameUrl(animated.mascotUrl, animated.mascotAnimation, 0.31), frames[0].url);
    const a = await sharp(path.join(dir, path.basename(frames[0].url))).raw().toBuffer();
    const b = await sharp(path.join(dir, path.basename(frames[1].url))).raw().toBuffer();
    assert.notDeepEqual(a, b, 'GIF poses were flattened to a still image');
  } finally { await fs.rm(dir, { recursive: true, force: true }); }
});
