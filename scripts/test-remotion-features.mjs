import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import crypto from 'node:crypto';
import sharp from 'sharp';
import { bundle } from '@remotion/bundler';
import { getCompositions, renderStill, renderMedia } from '@remotion/renderer';

const dir = path.resolve('.diagnostics/remotion-verification');
const stage = path.resolve('.tmp/feature-public');
await fs.mkdir(dir, { recursive: true }); await fs.mkdir(stage, { recursive: true });
for (const name of ['sfx', 'audio', 'samples']) await fs.cp(path.resolve('public', name), path.join(stage, name), { recursive: true });
execFileSync('ffmpeg', ['-v', 'error', '-y', '-f', 'lavfi', '-i', 'color=c=red:s=360x640:r=30:d=1', '-f', 'lavfi', '-i', 'color=c=0x00cc44:s=360x640:r=30:d=1', '-f', 'lavfi', '-i', 'color=c=blue:s=360x640:r=30:d=1', '-filter_complex', '[0:v][1:v][2:v]concat=n=3:v=1:a=0[v]', '-map', '[v]', '-c:v', 'libx264', '-pix_fmt', 'yuv420p', path.join(stage, 'trim.mp4')]);
const [record] = JSON.parse(await fs.readFile('data/products.json', 'utf8'));
const props = { productName: 'ทดสอบเทมเพลต', price: '฿199', images: ['/trim.mp4'], mediaDurations: { '/trim.mp4': 3 }, hook: { headline: 'ช่วงคลิปที่เลือก', durationSec: 1.5, videoStartSec: 1, videoEndSec: 2 }, scenes: [], cta: { ctaTitle: 'ตรวจฉากปิดท้าย', buttonText: 'ดูสินค้า', durationSec: 1.5, videoStartSec: 1, videoEndSec: 2 }, styleDNA: { ...record.styleDNA, pack: 'pro-minimal-luxury' }, captionSettings: { enabled: true, style: 'clean-bar', position: 'bottom', language: 'th', fontSize: 54 }, captionCues: [{ text: 'ซับตรงช่วงเสียง', startSec: 0.2, endSec: 1.4 }], bgmUrl: '' };
console.log('Bundling shared preview/export composition...');
const serveUrl = await bundle({ entryPoint: path.resolve('remotion/index.ts'), publicDir: stage });
const compositions = await getCompositions(serveUrl, { inputProps: props });
const composition = compositions.find((c) => c.id === 'ShopeeProductVideo');
assert.equal(composition.durationInFrames, 90);
const packs = ['pro-minimal-luxury','pro-flash-sale','pro-ugc-creator','pro-cyber-slate','kraft-scrapbook','notebook-doodle','zine-newspaper','sticker-bomb','pinboard-corkboard','comic-popart','supermarket-flyer','soft-kawaii'];
const hashes = new Set();
for (const pack of packs) {
  const output = path.join(dir, `pack-${pack}.png`);
  const variant = { ...props, styleDNA: { ...props.styleDNA, pack } };
  await renderStill({ serveUrl, composition: { ...composition, props: variant }, inputProps: variant, frame: 24, output, scale: 0.4 });
  hashes.add(crypto.createHash('sha256').update(await sharp(output).raw().toBuffer()).digest('hex'));
  console.log('Rendered template:', pack);
}
assert.ok(hashes.size >= 10, `template selection did not affect output (${hashes.size} distinct results)`);
const styles = ['clean-bar', 'minimal-outline', 'karaoke-pill', 'tiktok-pop'];
const styleHashes = new Set();
for (const style of styles) {
  const output = path.join(dir, `caption-${style}.png`);
  const variant = { ...props, captionSettings: { ...props.captionSettings, style } };
  await renderStill({ serveUrl, composition: { ...composition, props: variant }, inputProps: variant, frame: 24, output, scale: 0.4 });
  styleHashes.add(crypto.createHash('sha256').update(await sharp(output).raw().toBuffer()).digest('hex'));
}
assert.equal(styleHashes.size, 4, 'subtitle styles have identical rendered pixels');
const outputLocation = path.join(dir, 'trim-verified.mp4');
await renderMedia({ serveUrl, composition, inputProps: props, codec: 'h264', outputLocation, scale: 2 / 3, concurrency: 2, timeoutInMilliseconds: 60000 });
for (const second of [0.4, 1.3]) {
  const png = execFileSync('ffmpeg', ['-v', 'error', '-ss', String(second), '-i', outputLocation, '-frames:v', '1', '-f', 'image2pipe', '-vcodec', 'png', '-']);
  const raw = await sharp(png).extract({ left: 300, top: 600, width: 80, height: 80 }).removeAlpha().raw().toBuffer();
  let green = 0;
  for (let i = 0; i < raw.length; i += 3) if (raw[i+1] > raw[i]+40 && raw[i+1] > raw[i+2]+40) green++;
  assert.ok(green > 5000, `trim escaped selected green region at ${second}s`);
}
console.log(`PASS: ${hashes.size} template results, 4 subtitle styles, exact source range and held end frame`);
