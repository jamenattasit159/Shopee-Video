import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import { GoogleGenAI } from '@google/genai';
import type { CaptionCue } from '../../remotion/types';

const compact = (s: string) => s.normalize('NFC').replace(/[\s\p{P}\p{S}]/gu, '').toLowerCase();
export function validateSpeechCues(cues: CaptionCue[], transcript: string, durationSec: number): CaptionCue[] {
  if (!Array.isArray(cues) || !cues.length || compact(cues.map((c) => c.text).join('')) !== compact(transcript)) throw new Error('ข้อความซับไม่ครบหรือไม่ตรงบทพากย์');
  let previous = 0;
  for (const cue of cues) {
    if (!cue.text || !Number.isFinite(cue.startSec) || !Number.isFinite(cue.endSec) || cue.startSec < previous - 0.02 || cue.endSec <= cue.startSec || cue.endSec > durationSec + 0.1) throw new Error('เวลาซับไม่ถูกต้องหรือเกินเสียงพากย์');
    previous = cue.endSec;
  }
  return cues.map((c) => ({ text: c.text.trim(), startSec: Math.max(0, c.startSec), endSec: Math.min(durationSec, c.endSec), ...(c.en ? { en: c.en } : {}) }));
}

const pending = new Map<string, Promise<CaptionCue[]>>();
export async function alignSpeech(file: string, transcript: string, durationSec: number, language = 'th'): Promise<CaptionCue[]> {
  const audio = await fs.readFile(file);
  const hash = crypto.createHash('sha256').update(audio).update(transcript).update(language).update('speech-cues-v1').digest('hex');
  const cache = path.resolve('.tmp/caption-alignment', hash + '.json');
  try { return validateSpeechCues(JSON.parse(await fs.readFile(cache, 'utf8')), transcript, durationSec); } catch {}
  if (pending.has(hash)) return pending.get(hash)!;
  const work = (async () => {
    if (!process.env.GEMINI_API_KEY) throw new Error('การจัดเวลาซับจากเสียงต้องใช้ GEMINI_API_KEY ที่ตั้งค่าไว้ กรุณาตั้งค่าหรือปิดซับก่อนเรนเดอร์');
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    const mimeType = path.extname(file).toLowerCase() === '.mp3' ? 'audio/mpeg' : 'audio/wav';
    const response = await ai.models.generateContent({
      model: process.env.GEMINI_ALIGNMENT_MODEL || 'gemini-2.5-flash',
      contents: [{ role: 'user', parts: [
        { inlineData: { data: audio.toString('base64'), mimeType } },
        { text: `Align this EXACT display transcript to the supplied audio. Listen to actual speech, including pauses; do not allocate timestamps by character count. Return chronological non-overlapping subtitle phrases of roughly 8–35 Thai characters (up to 45 where needed). Keep every transcript word exactly, including numeric display forms such as 80 even if spoken as Thai numbers. Concatenated text must equal the transcript ignoring spaces/punctuation. Each cue: text, startSec, endSec (seconds relative to this audio, within 0..${durationSec}). ${language !== 'th' ? 'Also supply en, a concise English translation for every cue.' : ''} Transcript: ${transcript}` },
      ] }],
      config: { responseMimeType: 'application/json', responseJsonSchema: { type: 'object', properties: { cues: { type: 'array', items: { type: 'object', properties: { text: { type: 'string' }, startSec: { type: 'number' }, endSec: { type: 'number' }, en: { type: 'string' } }, required: ['text', 'startSec', 'endSec'] } } }, required: ['cues'] } },
    });
    const cues = validateSpeechCues(JSON.parse(response.text || '{}').cues, transcript, durationSec);
    await fs.mkdir(path.dirname(cache), { recursive: true });
    await fs.writeFile(cache, JSON.stringify(cues));
    return cues;
  })();
  pending.set(hash, work);
  try { return await work; } finally { pending.delete(hash); }
}
