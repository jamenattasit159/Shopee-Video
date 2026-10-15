import { test } from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { validateSpeechCues } from '../src/lib/captionAlignment.ts';
import { generateSrtContent } from '../src/lib/exportBundle.ts';
import { SafeZoneOverlay } from '../remotion/components/SafeZoneOverlay.tsx';

test('aligned text must cover every spoken word, stay within audio and remain chronological', () => {
  const cues = [{ text: 'ทิชชู่เปียก', startSec: 0.2, endSec: 0.9 }, { text: '80 แผ่น', startSec: 1.3, endSec: 2.1 }];
  assert.deepEqual(validateSpeechCues(cues, 'ทิชชู่เปียก 80 แผ่น', 3), cues);
  assert.throws(() => validateSpeechCues(cues.slice(0, 1), 'ทิชชู่เปียก 80 แผ่น', 3), /ไม่ครบ/);
  assert.throws(() => validateSpeechCues([...cues].reverse(), 'ทิชชู่เปียก 80 แผ่น', 3));
  assert.throws(() => validateSpeechCues(cues, 'ทิชชู่เปียก 80 แผ่น', 1));
});
test('SRT preserves exact prepared cue times rather than adding scene padding', () => {
  const srt = generateSrtContent({ productName: 'สินค้า', price: '', images: ['/a.png'], hook: { headline: 'หัวข้อ', durationSec: 2 }, scenes: [], cta: { ctaTitle: 'จบ', buttonText: 'ดู', durationSec: 2 }, captionCues: [{ text: 'บทพูดจริง', startSec: 0.45, endSec: 1.2 }] });
  assert.match(srt, /00:00:00,450 --> 00:00:01,200/);
  assert.ok(srt.includes('บทพูดจริง'));
  assert.ok(!srt.includes('หัวข้อ'));
});
test('Red Zone uses a scalable video viewBox without fixed preview-pixel rectangles', () => {
  const svg = renderToStaticMarkup(React.createElement(SafeZoneOverlay));
  assert.ok(svg.includes('viewBox="0 0 1080 1920"'));
  assert.ok(svg.includes('width="100%"'));
  assert.ok(!svg.includes('height:180px'));
});
