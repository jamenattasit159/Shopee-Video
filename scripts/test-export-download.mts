import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { NextRequest } from 'next/server';

test('export download returns the actual file and refuses path traversal', async () => {
  const { GET } = await import('../src/app/api/exports/route.ts');
  const dir = path.resolve('exports/2099-01-01/download-test');
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(path.join(dir, 'caption.txt'), 'ข้อความพร้อมใช้งาน');
  try {
    const response = await GET(new NextRequest('http://localhost:3000/api/exports?date=2099-01-01&slug=download-test&file=caption.txt'));
    assert.equal(response.status, 200);
    assert.equal(await response.text(), 'ข้อความพร้อมใช้งาน');
    assert.match(response.headers.get('content-disposition') || '', /attachment/);
    const invalid = await GET(new NextRequest('http://localhost:3000/api/exports?date=2099-01-01&slug=..&file=caption.txt'));
    assert.equal(invalid.status, 400);
    const missing = await GET(new NextRequest('http://localhost:3000/api/exports?date=2099-01-01&slug=download-test&file=video.mp4'));
    assert.equal(missing.status, 404);
  } finally { await fs.rm(dir, { recursive: true, force: true }); }
});
