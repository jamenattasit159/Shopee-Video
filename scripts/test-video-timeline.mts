import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildVideoTimeline, timelineCaptionCues } from '../remotion/lib/videoTimeline.ts';
import { SAFE_ZONE, redZoneRects } from '../remotion/lib/layoutGuard.ts';

const props = () => ({ productName: 'ทดสอบ', price: '', images: ['/clip.mp4'], mediaDurations: { '/clip.mp4': 12 }, hook: { headline: 'เริ่ม', durationSec: 2, videoStartSec: 2, videoEndSec: 4 }, scenes: [], cta: { ctaTitle: 'จบ', buttonText: 'ดูสินค้า', durationSec: 2, videoStartSec: 6, videoEndSec: 8 } });
test('explicit clip ranges survive voice timing and never require a loop', () => {
  const p = { ...props(), voiceLines: [{ sceneId: 'hook', role: 'hook', text: 'เสียงช่วงแรก', audioUrl: '/hook.wav', durationSec: 3 }] };
  const t = buildVideoTimeline(p, 30);
  assert.equal(t.scenes[0].videoStartSec, 2);
  assert.equal(t.scenes[0].videoEndSec, 4);
  assert.equal(t.scenes[0].fillMode, 'freeze');
  assert.ok(t.scenes[0].durationInFrames >= 99);
  assert.equal(t.scenes[1].from, t.scenes[0].durationInFrames);
});
test('invalid ranges and a manual scene shorter than its voice are rejected', () => {
  assert.throws(() => buildVideoTimeline({ ...props(), hook: { ...props().hook, videoEndSec: 1 } }), /ช่วงคลิป/);
  assert.throws(() => buildVideoTimeline({ ...props(), hook: { ...props().hook, durationMode: 'manual' }, voiceLines: [{ sceneId: 'hook', audioUrl: '/a.wav', durationSec: 4 }] }), /เสียง/);
});
test('unselected source offsets advance instead of restarting the same clip', () => {
  const p = props(); delete p.hook.videoStartSec; delete p.hook.videoEndSec; delete p.cta.videoStartSec; delete p.cta.videoEndSec;
  const t = buildVideoTimeline(p);
  assert.equal(t.scenes[0].videoStartSec, 0);
  assert.equal(t.scenes[1].videoStartSec, 2);
});
test('display captions use prepared speech cues, not stale storyboard text or character estimates', () => {
  const p = { ...props(), captionCues: [{ text: 'บทพูดจริง', startSec: 0.45, endSec: 1.2 }], voiceLines: [{ sceneId: 'hook', text: 'บทเก่า', durationSec: 2 }] };
  assert.deepEqual(timelineCaptionCues(p), [{ text: 'บทพูดจริง', startSec: 0.45, endSec: 1.2 }]);
});
test('safe area and red regions use the same composition coordinates', () => {
  const zones = redZoneRects(1080, 1920);
  assert.equal(zones.bottom.y, SAFE_ZONE.bottom);
  assert.equal(zones.top.height, SAFE_ZONE.top);
  assert.equal(zones.right.x, SAFE_ZONE.right);
  assert.ok(SAFE_ZONE.bottom < 1560);
});
