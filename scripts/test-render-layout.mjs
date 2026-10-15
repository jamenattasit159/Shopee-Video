import { test } from 'node:test';
import assert from 'node:assert/strict';
import { displayPrice, fitThaiText, buildSceneOverlaySvg } from './render-layout.mjs';
import { createRenderPlan, runFastFfmpegRender } from './fast-ffmpeg-render.mjs';
import path from 'node:path';

test('promotion prose and missing prices never become invented numeric offers', () => {
  for (const value of ['', 'เพื่อแม่เราลดได้', 'ยกลัง12', '80 แผ่น', 'ลด 50%', '0']) assert.equal(displayPrice(value), '');
  assert.equal(displayPrice('฿1,299.50'), '฿1,299.5');
  assert.equal(displayPrice('259 บาท'), '฿259');
});

test('Thai wrapping preserves whole words and ignores invalid pre-split lines', async () => {
  const fit = await fitThaiText('อ่อนโยน ปลอดภัย', 300, 76);
  assert.deepEqual(fit.lines, ['อ่อนโยน', 'ปลอดภัย']);
  const product = await fitThaiText('DODOLOVE ทิชชู่เปียกห่อใหญ่', 856, 76);
  assert.ok(product.lines.some((line) => line.includes('ทิชชู่เปียก')), 'product noun was split inside a word');
  const svg = await buildSceneOverlaySvg({ headline: 'อ่อนโยน ปลอดภัย', headlineLines: ['อ่อนโยน ปล', 'อดภัย'], subheadline: 'ไม่มีน้ำหอม', captionText: 'ไม่มีน้ำหอม', index: 0, count: 2, productName: 'ทดสอบ', role: 'cta', price: 'เพื่อแม่เราลดได้' });
  assert.equal((svg.match(/ไม่มีน้ำหอม/g) || []).length, 1, 'supporting text must not be duplicated');
  assert.ok(!svg.includes('เพื่อแม่เราลดได้'), 'invalid price shown');
});

test('scene voice duration sets scene boundaries and reserves a complete CTA', () => {
  const plan = createRenderPlan({ images: ['/a.png'], hook: { durationSec: 3 }, scenes: [], cta: { durationSec: 3 } }, 0, [{ sceneId: 'hook', duration: 2 }, { sceneId: 'cta', duration: 4 }]);
  assert.equal(plan[0].durationSec, 2.2666666666666666);
  assert.equal(plan[1].startSec, 2.2666666666666666);
  assert.equal(plan[1].durationSec, 4.8);
});

test('missing product media fails instead of exporting a blank or sample product', async () => {
  await assert.rejects(runFastFfmpegRender({ inputProps: { images: ['/missing-product.mp4'], hook: {}, cta: {} }, outputPath: path.resolve('.diagnostics/should-not-exist.mp4') }), /ไม่พบไฟล์สื่อ/);
});
