import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

test('a lost render response follows its worker instead of leaving a false offline error', async () => {
  const module = await import('../src/lib/renderRecovery.ts').catch(() => null);
  assert.ok(module, 'render request recovery is missing');
  const expected = { productId: 'product-a', requestId: 'attempt-2' };
  const progress = { productId: 'product-a', requestId: 'attempt-2', updatedAt: Date.now(), status: 'rendering', percent: 67 };
  const running = module.recoverRenderProgress(progress, expected);
  assert.equal(running?.isRendering, true);
  assert.equal(running?.error, null);
  const complete = module.recoverRenderProgress({ ...progress, status: 'complete', videoUrl: '/renders/new.mp4', exportBundle: { success: true } }, expected);
  assert.equal(complete?.isRendering, false);
  assert.equal(complete?.error, null);
  assert.equal(complete?.videoUrl, '/renders/new.mp4');
  assert.deepEqual(complete?.exportBundle, { success: true });
  assert.equal(module.recoverRenderProgress({ ...progress, productId: 'product-b' }, expected), null);
  assert.equal(module.recoverRenderProgress({ ...progress, requestId: 'attempt-1' }, expected), null);
  const stalled = module.recoverRenderProgress({ ...progress, updatedAt: Date.now() - 601000 }, expected);
  assert.equal(stalled?.isRendering, false);
  assert.match(stalled?.error || '', /10 นาที/);
  assert.equal(module.recoverRenderProgress({ ...progress, status: 'finalizing' }, expected)?.isRendering, true);
  assert.equal(module.recoverRenderProgress({ ...progress, status: 'complete' }, expected), null);
  const failed = module.recoverRenderProgress({ ...progress, status: 'error', message: 'เรนเดอร์ล้มเหลว' }, expected);
  assert.equal(failed?.isRendering, false);
  assert.equal(failed?.error, 'เรนเดอร์ล้มเหลว');
});

test('the production worker retains attempt identity and waits for export finalization', { timeout: 180000 }, async () => {
  const dir = path.resolve('.diagnostics/render-recovery');
  await fs.mkdir(dir, { recursive: true });
  const propsFile = path.join(dir, 'props.json');
  const progressFile = path.join(dir, 'progress.json');
  await fs.writeFile(propsFile, JSON.stringify({
    productId: 'recovery-check', renderRequestId: 'recovery-attempt',
    productName: 'ทดสอบสถานะ', price: '', images: ['/samples/tumbler-1.svg'],
    hook: { headline: 'ทดสอบเริ่มงาน', durationSec: 1 }, scenes: [],
    cta: { ctaTitle: 'ทดสอบจบงาน', buttonText: 'ดูสินค้า', durationSec: 1 },
    bgmUrl: '', captionSettings: { enabled: false },
  }));
  await promisify(execFile)(process.execPath, ['scripts/render.mjs', '--props-file', propsFile,
    '--output', path.join(dir, 'worker-check.mp4'), '--scale', '0.667', '--concurrency', '2', '--progress-file', progressFile],
    { timeout: 170000, windowsHide: true, maxBuffer: 4 * 1024 * 1024 });
  const progress = JSON.parse(await fs.readFile(progressFile, 'utf8'));
  assert.equal(progress.productId, 'recovery-check');
  assert.equal(progress.requestId, 'recovery-attempt');
  assert.equal(progress.status, 'finalizing');
  assert.equal(progress.percent, 99);
});
