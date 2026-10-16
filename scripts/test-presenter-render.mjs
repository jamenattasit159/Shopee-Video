import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { createHash } from 'node:crypto';
import { bundle } from '@remotion/bundler';
import { selectComposition, renderStill } from '@remotion/renderer';
import sharp from 'sharp';

// Real Chromium frames: catch a missing presenter, dark template, and lost closing scene.
const outputDir = path.resolve('.diagnostics/presenter');
await fs.mkdir(outputDir, { recursive: true });
const inputProps = {
  productName: 'แก้วเก็บความเย็น', price: '฿259',
  images: ['/samples/tumbler-1.svg', '/samples/tumbler-2.svg'],
  hook: { headline: 'แก้วใบโปรดของคุณ', subheadline: 'พกไปได้ทุกวัน', durationSec: 3 },
  scenes: [{ highlightTitle: 'มีหูหิ้ว พกสะดวก', highlightDesc: 'เลือกสีที่ใช่สำหรับคุณ', imageIndex: 1, durationSec: 3 }],
  cta: { ctaTitle: 'ดูรายละเอียดสินค้า', buttonText: 'ดูสินค้าที่ Shopee', durationSec: 3 },
  bgmUrl: '/audio/bgm-upbeat.mp3',
  captionSettings: { enabled: true, language: 'th', position: 'bottom', style: 'tiktok-pop' },
  captionCues: [
    { text: 'แก้วใบโปรด พกไปได้ทุกวัน', startSec: 0.4, endSec: 2.8 },
    { text: 'มีหูหิ้ว เลือกสีที่ใช่', startSec: 3.3, endSec: 5.8 },
    { text: 'ดูรายละเอียดในตะกร้าได้เลย', startSec: 6.3, endSec: 8.8 },
  ],
};
const serveUrl = await bundle({ entryPoint: path.resolve('remotion/index.ts') });
const composition = await selectComposition({ serveUrl, id: 'ShopeeProductVideo', inputProps });
assert.equal(composition.durationInFrames, 270);
for (const [name, frame] of [['opening', 0], ['hook', 45], ['feature', 135], ['cta', 225]]) {
  const output = path.join(outputDir, name + '.png');
  await renderStill({ serveUrl, composition, inputProps, frame, output, scale: 0.5 });
  const { data, info } = await sharp(output).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  let paper = 0, skin = 0;
  for (let y = 20; y < 70; y++) for (let x = 15; x < 90; x++) {
    const i = (y * info.width + x) * info.channels;
    if (data[i] > 180 && data[i + 1] > 175 && data[i + 2] > 150) paper++;
  }
  assert.ok(paper > 3000, `${name}: notebook paper background missing (${paper})`);
  for (let y = 420; y < 700; y++) for (let x = 25; x < 210; x++) {
    const i = (y * info.width + x) * info.channels;
    if (data[i] > 140 && data[i] > data[i + 1] * 1.15 && data[i + 1] > data[i + 2] * 1.1) skin++;
  }
  assert.ok(skin > 1000, `${name}: supplied presenter missing (${skin})`);
  console.log(`PASS ${name}: light paper and presenter visible at frame ${frame}`);
}
const captionHashes = new Set();
for (const style of ['tiktok-pop', 'karaoke-pill', 'clean-bar', 'minimal-outline']) {
  const output = path.join(outputDir, `caption-${style}.png`);
  const variant = { ...inputProps, captionSettings: { ...inputProps.captionSettings, style } };
  await renderStill({ serveUrl, composition: { ...composition, props: variant }, inputProps: variant, frame: 45, output, scale: 0.5 });
  captionHashes.add(createHash('sha256').update(await fs.readFile(output)).digest('hex'));
}
assert.equal(captionHashes.size, 4, 'existing caption styles must still change the output');
for (const [name, variant] of [
  ['captions-disabled', { ...inputProps, captionSettings: { ...inputProps.captionSettings, enabled: false } }],
  ['caption-color', { ...inputProps, captionSettings: { ...inputProps.captionSettings, highlightColor: '#38BDF8' } }],
  ['original', { ...inputProps, presentationStyle: 'original' }],
]) {
  const output = path.join(outputDir, name + '.png');
  await renderStill({ serveUrl, composition: { ...composition, props: variant }, inputProps: variant, frame: 45, output, scale: 0.5 });
  assert.ok(!captionHashes.has(createHash('sha256').update(await fs.readFile(output)).digest('hex')), `${name} control has no visual effect`);
}
console.log('PASS original template, caption styles, caption color and disabled captions');
if (process.argv.includes('--video')) {
  const exec = promisify(execFile);
  const texts = ['แก้วใบโปรด พกไปได้ทุกวัน', 'มีหูหิ้ว เลือกสีที่ใช่', 'ดูรายละเอียดในตะกร้าได้เลย'];
  inputProps.voiceLines = [];
  for (const [index, text] of texts.entries()) {
    const name = `studio_presenter_sample_${index}.mp3`;
    const audioPath = path.resolve('public/uploads', name);
    if ((await fs.stat(audioPath).catch(() => ({ size: 0 }))).size < 100) {
      try {
        await exec('python', ['-X', 'utf8', '-m', 'edge_tts', '--voice', 'th-TH-NiwatNeural', '--text', text, '--write-media', audioPath], { timeout: 45000, windowsHide: true });
      } catch {
        console.log('Edge voice unavailable; using existing Google Thai HTTP fallback for sample.');
        const response = await fetch('https://translate.google.com/translate_tts?ie=UTF-8&tl=th&client=tw-ob&q=' + encodeURIComponent(text), { signal: AbortSignal.timeout(15000), headers: { 'User-Agent': 'Mozilla/5.0' } });
        assert.ok(response.ok, 'sample voice service unavailable');
        await fs.writeFile(audioPath, Buffer.from(await response.arrayBuffer()));
      }
    }
    const { stdout } = await exec('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'default=noprint_wrappers=1:nokey=1', audioPath]);
    inputProps.voiceLines.push({ sceneId: ['hook', 'scene_0', 'cta'][index], role: ['hook', 'body', 'cta'][index], text, audioUrl: '/uploads/' + name, durationSec: Number(stdout.trim()) });
  }
  inputProps.hook.customCaption = texts[0];
  inputProps.scenes[0].customCaption = texts[1];
  inputProps.cta.customCaption = texts[2];
  const propsFile = path.join(outputDir, 'sample-props.json');
  await fs.writeFile(propsFile, JSON.stringify(inputProps));
  // Exercise the production worker, including minimal-public asset staging.
  const { stdout } = await exec(process.execPath, ['scripts/render.mjs', '--props-file', propsFile, '--output', 'public/renders/presenter-sample.mp4', '--scale', '0.667', '--concurrency', '2', '--progress-file', '.diagnostics/presenter/progress.json'], { timeout: 600000, maxBuffer: 4 * 1024 * 1024, windowsHide: true });
  console.log(stdout.split('\n').filter((line) => /PROGRESS:(99|100):/.test(line)).join('\n'));
  console.log('Rendered public/renders/presenter-sample.mp4');
}
