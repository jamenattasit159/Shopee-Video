# 🎙️ VOICE STYLE PRESETS — เสียงของฉัน + สไตล์พ่อค้าน่าซื้อ
> ไฟล์สั่งงาน Agent (ต่อจากชุด `PAPER_COLLAGE_*.md` และ `SHOPEE_LINK_IMPORT.md`)
> อ้างอิงระบบเดิมจาก `VOICE_CLONING_SYSTEM_REPORT.md`
> **เป้าหมาย:** ใช้ "เสียงโคลนของผู้ใช้" เป็นตัวตนหลักเสมอ แล้วสั่ง **สไตล์การพูด** (พลังงาน จังหวะ น้ำเสียงพ่อค้า) ทับเป็นรายประโยค เพื่อให้คลิปฟังแล้วน่าซื้อ โดยยังเป็นเสียงของผู้ใช้

---

## 0. กฎเหล็ก (ห้ามละเมิด)

1. **ห้ามแก้ flow โคลนเสียงและการยืนยันความยินยอมเดิม** (`/api/replicated-voices`, `VoiceCloningModal.tsx`, `parseGoogleVoiceError()`) งานนี้ทำเฉพาะชั้น "สังเคราะห์เสียง" และ "หลังประมวลผล"
2. **ห้ามเปลี่ยนระดับเสียง (pitch shift) หรือทำ voice conversion ใดๆ** (ห้าม `asetrate`, `rubberband`, `pitch` ฯลฯ) เพราะทำให้เสียงไม่เหมือนผู้ใช้ ใช้ได้แค่เร่งความเร็วแบบคงระดับเสียง (`atempo`) ช่วง 1.00–1.12
3. **ห้ามพยายามลบ/หลบ/ทำลายลายน้ำ SynthID** การขัดเสียงต้องเบาและเป็นการปรับระดับเสียง/ความชัดเท่านั้น
4. **ใช้ได้เฉพาะ voiceId ที่ผ่าน flow ยืนยันความยินยอมแล้ว** และต้องเป็นเสียงของผู้ใช้เอง
5. **ห้ามใส่คำสั่งสไตล์ปนในข้อความที่จะอ่านออกเสียง** (โมเดลอาจอ่านคำสั่งนั้นออกมาเป็นเสียง) สไตล์ต้องส่งผ่านช่อง style/metadata ของ API เท่านั้น
6. **ห้ามเดาชื่อฟิลด์ API** ให้อ่านเอกสารทางการ (Gemini API → "Voice design" และเอกสารของ `gemini-3.8-flash-tts`) แล้วตรวจกับ `@google/genai` เวอร์ชันที่ติดตั้งจริง (`node_modules/@google/genai`) ก่อนเขียนโค้ด เอกสารที่ผมเห็นระบุว่าใช้ **style prompt สั้นๆ ผ่าน `speech_metadata`** (ใน SDK บางตัวเรียก `delivery_style`) ถ้า SDK ที่ติดตั้งยังไม่รองรับ → **หยุดแล้วรายงานผู้ใช้** ห้ามแก้ด้วยการยัดคำสั่งในข้อความ
7. **Backward compatible:** payload เดิมของ `/api/synthesize-voice` (`customText`, `ttsEngine`, `geminiVoice`) ต้องทำงานเหมือนเดิมทุกประการ
8. **ฟีเจอร์ทุกอย่างต้อง fallback ได้:** ขัดเสียงไม่ได้ → ใช้เสียงดิบ + เตือน, สไตล์ไม่รองรับ → แจ้งผู้ใช้ ห้าม crash

---

## 1. ข้อเท็จจริงของระบบปัจจุบัน (จากรายงาน)

- โมเดล `gemini-3.8-flash-tts`, เสียงโคลนเก็บใน Google AI Studio, ใช้ผ่าน `geminiVoice: "{voiceId}"`
- ไฟล์เสียงเป็น WAV 24kHz mono 16-bit (ผ่าน FFmpeg ที่มาพร้อม Remotion: `src/lib/ffmpeg.ts` มี `ensureFfmpegInPath()` และ `getAudioDurationInSeconds`)
- `/api/synthesize-voice` รับ `customText`, `ttsEngine: "gemini"`, `geminiVoice`
- ตอนนี้ **ยังไม่มีการส่งสไตล์การพูด** และยังไม่ผูกกับ storyboard/ซีน

---

## 2. Voice Style Presets

สร้าง `src/lib/voicePresets.ts` (และ export ชนิดข้อมูลไว้ใน types กลาง)

```ts
export interface VoicePreset {
  id: string;
  nameTh: string;
  stylePrompt: string;            // สั้น ภาษาไทย ≤ 2 ประโยค ห้ามมีชื่อสินค้า/เนื้อหาบท
  polish: { atempo: number; compressor: boolean; presenceDb: number; targetLufs: number };
  bestFor: string[];              // หมวดสินค้า เช่น 'baby','beauty','kitchen','general'
  roleDefault?: Partial<Record<'hook' | 'body' | 'cta', true>>;
}

export const VOICE_PRESETS: VoicePreset[] = [
  { id: 'vendor-live',  nameTh: 'พ่อค้าไลฟ์สด',
    stylePrompt: 'พลังงานสูง ยิ้มในน้ำเสียง พูดเร็วขึ้นเล็กน้อย เน้นคำสำคัญและราคา เหมือนพ่อค้าชวนลูกค้าหน้าร้านอย่างเป็นกันเอง',
    polish: { atempo: 1.08, compressor: true, presenceDb: 3, targetLufs: -14 }, bestFor: ['general','kitchen','gadget'], roleDefault: { hook: true } },
  { id: 'market-hype',  nameTh: 'ตลาดนัดตื่นเต้น',
    stylePrompt: 'ตื่นเต้นกระตือรือร้น จังหวะกระชับ เว้นจังหวะสั้นๆ ก่อนบอกราคา',
    polish: { atempo: 1.10, compressor: true, presenceDb: 3, targetLufs: -14 }, bestFor: ['general','fashion'], roleDefault: { hook: true } },
  { id: 'friendly-trust', nameTh: 'เพื่อนแนะนำของ',
    stylePrompt: 'อบอุ่น เป็นกันเอง ไม่เร่งขาย เหมือนแนะนำให้เพื่อนสนิท',
    polish: { atempo: 1.03, compressor: true, presenceDb: 2, targetLufs: -14 }, bestFor: ['baby','beauty','health-adjacent'] },
  { id: 'whisper-secret', nameTh: 'กระซิบของดี',
    stylePrompt: 'กระซิบเล่าความลับน่ารัก เสียงใกล้ไมค์ พลังงานต่ำแต่ตื่นเต้น',
    polish: { atempo: 1.00, compressor: true, presenceDb: 2, targetLufs: -14 }, bestFor: ['beauty','general'] },
  { id: 'calm-reviewer', nameTh: 'รีวิวจริงจัง',
    stylePrompt: 'นิ่ง มั่นใจ ชัดเจน เหมือนผู้รีวิวที่ใช้จริง',
    polish: { atempo: 1.02, compressor: true, presenceDb: 2, targetLufs: -14 }, bestFor: ['gadget','kitchen'] },
  { id: 'flash-close', nameTh: 'เร่งปิดการขาย',
    stylePrompt: 'ชัดเจนมั่นใจ เร่งจังหวะเล็กน้อย ชวนกดตะกร้าส้มทันที',
    polish: { atempo: 1.08, compressor: true, presenceDb: 3, targetLufs: -14 }, bestFor: ['general'], roleDefault: { cta: true } },
];
```

- **ระดับความแรงของสไตล์ (`intensity`: low | mid | high):** low ต่อท้ายว่า "ให้เบาและเป็นธรรมชาติ", high ต่อท้ายว่า "จัดเต็มขึ้นอีกนิด" (ยังเป็น style prompt สั้นๆ ไม่เกิน ~200 ตัวอักษร)
- สินค้าเด็ก/สุขภาพ: พรีเซ็ตเริ่มต้นเป็น `friendly-trust` และ **ห้ามเลือก hype ที่เร่งขายเกินไปโดยอัตโนมัติ**
- ช่วงบทบาทซีน: Hook → พรีเซ็ตที่ `roleDefault.hook` / Body → พรีเซ็ตหลักของคลิป / CTA → `flash-close` (ผู้ใช้เปลี่ยนได้)

---

## 3. สคริปต์เสียงจาก Gemini (ตัวบทสำคัญกว่าน้ำเสียง)

ขยาย storyboard (ฟิลด์ optional ทั้งหมด):
```ts
export interface VoiceLine {
  sceneId: string;
  role: 'hook' | 'body' | 'cta';
  text: string;            // ข้อความอ่านจริง (ภาษาพูด)
  textForSpeech?: string;  // หลัง normalizeForSpeech() (ดูข้อ 4)
  styleOverride?: string;  // ถ้าผู้ใช้ปรับเฉพาะประโยค
}
// storyboard.voiceLines?: VoiceLine[];  storyboard.voicePresetId?: string;
```

กฎใน prompt ของ Gemini (`src/lib/gemini.ts` และ Fallback Generator):
- เขียนเป็น **ภาษาพูดแบบพ่อค้า**: ประโยคสั้น (≤ 25 ตัวอักษรต่อประโยคเป็นเป้าหมาย), ทักผู้ฟังตรงๆ ("พี่ๆ ดูตรงนี้"), ซ้ำคำสำคัญ 1 ครั้ง, เว้นจังหวะก่อนราคา
- ความยาวพูดรวมสอดคล้องกับความยาวคลิป (เป้าหมาย 13–15 วินาทีที่ความเร็วปกติ) ถ้ายาวเกิน ให้ย่อบท ไม่ใช่เร่งเสียงเกิน 1.12
- **ใช้เฉพาะข้อเท็จจริงจากชื่อสินค้า/ข้อมูลที่ผู้ใช้ยืนยันแล้ว** ห้ามแต่งสรรพคุณ ห้ามคำรับรอง/การันตี/ใส่ร้ายคู่แข่ง (กฎเดียวกับ Part E4 ใน `PAPER_COLLAGE_V2_PATCH.md` และ `SHOPEE_LINK_IMPORT.md` ข้อ 9)
- เสียงมั่นใจแบบพ่อค้า **ต้องไม่ทำให้คำอ้างเกินจริงฟังน่าเชื่อขึ้น** — ผ่านตัวตรวจคำอ้างก่อนส่งเข้า TTS ทุกครั้ง
- Headline บนจอ ≠ ข้อความที่พูด (ตามกฎ A2: ห้ามซ้ำกัน) แคปชั่นบนจอใช้ `text` ของ VoiceLine
- คลังประโยคสำรอง (ไม่มี API Key) ต้องมีอย่างน้อย 5 แบบต่อ role ต่อพรีเซ็ต และห้ามซ้ำภายใน 20 คลิปล่าสุด

---

## 4. Normalize ข้อความก่อนอ่าน (`src/lib/speechText.ts`)

TTS ภาษาไทยอ่านตัวเลข/ภาษาอังกฤษ/ตัวย่อเพี้ยนบ่อย ให้ `normalizeForSpeech(text, pronunciationMap)`:
- ราคา/ตัวเลข → คำอ่านไทย (544 บาท → "ห้าร้อยสี่สิบสี่บาท", 80 แผ่น → "แปดสิบแผ่น", ยกลัง12 → "ยกลังสิบสอง", 100% → "ร้อยเปอร์เซ็นต์")
- ชื่อแบรนด์/คำอังกฤษ → ตัวสะกดไทยตาม `pronunciationMap` ที่ผู้ใช้แก้ไขได้ (เช่น DODOLOVE → โดโดเลิฟ) เก็บใน `data/pronunciation-map.json`; ถ้าไม่มีใน map ให้ปล่อยตามเดิมและตั้งธง "ควรตรวจเสียง"
- เอาอีโมจิ/สัญลักษณ์ที่ไม่ควรอ่านออก
- เก็บ `text` (บนจอ) กับ `textForSpeech` (ใช้อ่าน) แยกกันเสมอ
- เขียนยูนิตเทสต์ครอบคลุมตัวเลข ทศนิยม ราคา ช่วง (100–200) และข้อความผสมไทย-อังกฤษ

---

## 5. API: ขยาย `/api/synthesize-voice`

รับฟิลด์ใหม่ (ทั้งหมด optional):
```ts
{
  customText?: string,                 // เดิม
  ttsEngine?: 'gemini',                // เดิม
  geminiVoice?: string,                // เดิม (voiceId)
  presetId?: string,                   // ใหม่
  intensity?: 'low' | 'mid' | 'high',  // ใหม่
  style?: string,                      // ใหม่ ถ้าระบุ จะ override preset
  lines?: { id: string; text: string; style?: string }[],  // ใหม่ สังเคราะห์หลายบรรทัดในครั้งเดียว
  polish?: boolean,                    // ใหม่ default true
  previewOnly?: boolean                // ใหม่ ตัดความยาว ≤ ~8 วินาที ใช้ตอนลองฟัง
}
```
คืนค่า: `{ ok, files: [{ id, url, durationSec, cached, polished, warnings[] }] }`

ข้อกำหนด:
- **Cache** ตาม hash(`voiceId + textForSpeech + style + intensity + polishParams`) ที่ `public/audio/cache/` (ลดค่าใช้จ่ายและเวลา) พร้อมปุ่ม "สร้างใหม่" ที่ข้าม cache
- ส่ง style ผ่านช่องที่ SDK รองรับเท่านั้น (ดูกฎเหล็กข้อ 5–6)
- จำกัดจำนวนบรรทัดต่อคำขอและทำทีละ 2 บรรทัดพร้อมกัน, retry 1 ครั้งเมื่อ timeout, จัดการ 429 อย่างสุภาพ
- ใช้ระบบแจ้งเตือนข้อผิดพลาดกลาง (Error Alert System) ถ้ามีแล้ว: เพิ่มรหัส `VOICE_STYLE_UNSUPPORTED`, `TTS_QUOTA`, `TTS_TIMEOUT`, `VOICE_NOT_FOUND`, `SCRIPT_TOO_LONG_FOR_DURATION` (error) และ `AUDIO_POLISH_FILTER_MISSING`, `PRONUNCIATION_UNVERIFIED` (warning) พร้อมข้อความไทยที่บอกวิธีแก้

---

## 6. ขัดเสียงเบาๆ (`src/lib/audioPolish.ts`)

ใช้ฟังก์ชันรัน FFmpeg ที่มีอยู่แล้วใน `src/lib/ffmpeg.ts` (ผ่าน `execFile` แบบ array arguments) **ห้ามสร้างตัวรันซ้ำซ้อน**

โซ่ฟิลเตอร์ตั้งต้น (ทดสอบไวยากรณ์แล้วกับ FFmpeg ทั่วไป ยังไม่ได้ทดสอบกับไบนารีของ Remotion):
```
highpass=f=80,
acompressor=threshold=-18dB:ratio=3:attack=5:release=80,
equalizer=f=3000:t=q:w=1:g=<presenceDb>,
atempo=<atempo>,
loudnorm=I=<targetLufs>:TP=-1.5:LRA=11
```
- **ก่อนใช้ ต้องตรวจว่าไบนารี FFmpeg ที่ Remotion ติดตั้งมีฟิลเตอร์ครบ** (`ffmpeg -filters` ค้นหา `highpass`, `acompressor`, `equalizer`, `atempo`, `loudnorm`) ถ้าขาดตัวใด ให้ข้ามเฉพาะตัวนั้นและแจ้ง warning `AUDIO_POLISH_FILTER_MISSING` ห้ามให้ทั้งกระบวนการล้ม ถ้าขาดหมดให้ใช้เสียงดิบ
- ตัดความเงียบหัว/ท้ายประมาณ 0.1–0.2 วินาที (เว้นไว้เล็กน้อยไม่ให้คำขาด)
- `atempo` บังคับ clamp 1.00–1.12
- ผลลัพธ์เป็น WAV (คง 24kHz mono หรืออัปเป็น 48kHz ก็ได้ ตามที่ Remotion ใช้อยู่แล้ว) เก็บคู่กับไฟล์ดิบ เพื่อให้เทียบก่อน/หลังได้
- ตรวจ loudness หลังขัดด้วย `loudnorm=...:print_format=json` หรือ `ebur128` แล้วบันทึกลง log ใน dev mode: เป้าหมาย −14 LUFS ±1

---

## 7. UI: เลือกและลองฟังสไตล์ (`src/components/VoiceStylePicker.tsx` ใน Step 2)

- ตัวเลือก "สไตล์เสียง": การ์ดพรีเซ็ต (ชื่อไทย + คำอธิบายสั้น), ค่าเริ่มต้น = แนะนำตามหมวดสินค้า, สลับ "สุ่มให้" ได้
- สไลเดอร์ความแรง 3 ระดับ (เบา/กลาง/จัดเต็ม)
- ปุ่ม **"ลองฟัง"** ที่ประโยค Hook (previewOnly) และปุ่ม **"เทียบ 3 สไตล์"** สร้างประโยคเดียวกันด้วย 3 พรีเซ็ต เล่นสลับได้ในที่เดียว
- สวิตช์ **"ขัดเสียง"** เปิด/ปิด พร้อมปุ่มฟังก่อน-หลัง
- ช่องให้ผู้ใช้แก้ `pronunciationMap` ของคำที่ระบบเตือนว่า "ควรตรวจเสียง" (เช่น ชื่อแบรนด์) แล้วสร้างเสียงใหม่ได้
- ช่องให้คะแนน "ยังเป็นเสียงฉันไหม" 1–5 ต่อพรีเซ็ต เก็บไว้ใน `data/voice-feedback.json` ถ้าคะแนนต่ำ ให้ระบบแนะนำลดความแรงของสไตล์
- แสดงสถานะ/ข้อผิดพลาดเป็นภาษาไทย (ผ่าน Error Alert System ถ้ามี)
- **ตัวเลือก "ระบุว่าใช้เสียงสังเคราะห์ด้วย AI"** ใน `caption.txt`/ข้อความโพสต์ (ค่าเริ่มต้นเปิด ผู้ใช้ปิดได้) เพราะแพลตฟอร์มอาจมีกฎติดป้ายเนื้อหาที่สร้างด้วย AI ผู้ใช้ต้องตรวจกฎล่าสุดของแต่ละแพลตฟอร์มเอง

---

## 8. เชื่อมกับ Remotion และระบบอื่น

- `ShopeeProductVideo.tsx`: วาง `<Audio>` ต่อบรรทัด (`<Sequence>` ตามเวลาเริ่ม) หรือรวมเป็นแทร็กเดียว **ความยาวซีนคำนวณจาก `durationSec` ของเสียง + เว้นท้าย ~0.3 วินาที** (ใช้ `getAudioDurationInSeconds`) ไม่ตายตัวที่ 3/9/12 วินาที
- ถ้าเสียงรวมยาวกว่าเป้าหมายคลิป → เรียก Gemini ย่อบท (ไม่เกิน 2 รอบ) ห้ามเร่งเกิน `atempo` 1.12; ถ้ายังไม่พอ ให้เตือนผู้ใช้แทนการตัดเสียงกลางประโยค
- เสียงพูดเป็นแทร็กหลัก, BGM ลดเหลือ 20–30%, SFX ซิงก์ตามภาพ (กฎเดิมไฟล์แรกหัวข้อ 6) ห้ามให้ SFX/BGM กลบเสียงพูด
- แคปชั่นบนจอใช้ `text` ของ VoiceLine และไฮไลต์คำตามเวลา (ถ้ามี timestamp) ตามกฎ Readability ใน Part A/E (ตัดบรรทัดไว้ล่วงหน้า ไม่เลยขอบ)
- เพิ่ม `voicePresetId` ลงใน `StyleDNA` (V2 หัวข้อ B3): สลับพรีเซ็ตเสียงระหว่างคลิปตามระบบกันซ้ำ (ไม่ใช้พรีเซ็ตเดียวกันติดกัน) **แต่ voiceId ต้องเป็นเสียงของผู้ใช้เหมือนเดิมเสมอ**
- Preview (Remotion Player) และ Render ต้องใช้ไฟล์เสียงชุดเดียวกัน (ไฟล์ที่ผ่าน cache/polish แล้ว) เพื่อให้ผลตรงกัน
- เก็บ `voicePresetId`, `intensity`, ไฟล์เสียงที่ใช้ และ pronunciationMap ที่ใช้ ไว้ใน `products.json` (ฟิลด์ optional) เพื่อเรนเดอร์ซ้ำได้ผลเดิม

---

## 9. การทดสอบ

**อัตโนมัติ**
- `normalizeForSpeech`: ราคา, ตัวเลข, ร้อยละ, ชื่อแบรนด์ใน/นอก map, อีโมจิ
- Preset validation: stylePrompt ไม่ว่าง ไม่ยาวเกิน ~200 ตัวอักษร ไม่มีเนื้อหาบท/ชื่อสินค้า
- Polish: clamp atempo, filter ขาดแล้วข้ามได้, ไม่ crash เมื่อไฟล์เสียงว่าง/เสีย
- Cache: เรียกซ้ำด้วยพารามิเตอร์เดิมได้ไฟล์เดิม
- Backward compat: payload เดิมของ `/api/synthesize-voice` ได้ผลเหมือนก่อนแก้
- ระยะเวลา: ความยาวซีนที่คำนวณตรงกับความยาวเสียง ±0.05 วินาที

**ฟังด้วยหู (Agent ต้องสร้างตัวอย่างให้ผู้ใช้ตัดสิน)**
- สร้างไฟล์ตัวอย่างประโยคเดียวกัน (Hook + ราคา + CTA) 6 พรีเซ็ต × 3 ระดับความแรง × เปิด/ปิดขัดเสียง ไว้ที่ `out/voice-samples/` พร้อมหน้า HTML ง่ายๆ ให้กดฟังเทียบ
- รายงานจริงว่า **ภาษาไทยตอบสนองต่อ style prompt มากน้อยแค่ไหน** อย่าอ้างผลที่ไม่ได้ฟัง (Agent ฟังเสียงเองไม่ได้ ให้บอกชัดว่าต้องให้ผู้ใช้ประเมิน)
- ผู้ใช้ให้คะแนน 1–5: (ก) ยังเป็นเสียงฉันไหม (ข) ฟังเป็นพ่อค้าน่าซื้อไหม (ค) ฟังเป็นธรรมชาติไหม ระบบบันทึกผลแล้วแนะนำพรีเซ็ต/ความแรงที่เหมาะ

---

## 10. ลำดับการทำงานของ Agent

1. อ่าน `VOICE_CLONING_SYSTEM_REPORT.md`, `src/lib/tts.ts`, `src/lib/ffmpeg.ts`, `/api/synthesize-voice` แล้วสรุปแผนเป็น checklist **รอผู้ใช้ตอบ "ลุย"**
2. ตรวจเอกสารทางการ + SDK ที่ติดตั้งว่ารองรับการส่ง style/delivery style อย่างไร (กฎเหล็กข้อ 6) รายงานผลก่อนเขียนโค้ด
3. ทำตามลำดับ: `voicePresets.ts` → `speechText.ts` + tests → ขยาย `/api/synthesize-voice` (style + cache) → `audioPolish.ts` (ตรวจฟิลเตอร์ก่อน) → `VoiceStylePicker` (ลองฟัง/เทียบ) → `voiceLines` จาก Gemini → เชื่อม Remotion (ความยาวซีนตามเสียง) → ผูก StyleDNA
4. ทุกขั้น: `npm run build` ผ่าน และทดสอบ regression ของเสียงโคลนเดิม (สังเคราะห์ด้วย payload เดิม)
5. สร้างชุดตัวอย่างเสียงให้ผู้ใช้ฟังตามข้อ 9 แล้วรายงาน: ไฟล์ที่เพิ่ม/แก้, ฟิลเตอร์ FFmpeg ที่มี/ขาด, ชื่อฟิลด์ style ที่ใช้จริงและแหล่งอ้างอิง, ข้อจำกัดที่พบ

---

## ✅ Acceptance Checklist

- [ ] Flow โคลนเสียง/ยินยอมเดิมไม่ถูกแก้และใช้งานได้
- [ ] Payload เดิมของ `/api/synthesize-voice` ได้ผลเหมือนเดิม
- [ ] สไตล์ถูกส่งผ่านช่อง style ของ API เท่านั้น ไม่ปนในข้อความอ่าน (ฟังตัวอย่างแล้วไม่มีเสียงอ่านคำสั่งสไตล์)
- [ ] ไม่มีการเปลี่ยน pitch และ atempo ไม่เกิน 1.12
- [ ] ตรวจฟิลเตอร์ FFmpeg ก่อนใช้ และข้ามได้โดยไม่ล้ม
- [ ] ราคา/ตัวเลข/ชื่อแบรนด์ถูกอ่านถูกต้อง หรือถูกติดธงให้ผู้ใช้ตรวจ
- [ ] ความยาวซีนตามความยาวเสียงจริง ไม่มีเสียงถูกตัดกลางประโยค
- [ ] มีหน้าลองฟัง/เทียบสไตล์ และไฟล์ตัวอย่างให้ผู้ใช้ประเมิน
- [ ] บทพูดผ่านตัวตรวจคำอ้าง (ไม่มีคำรับรอง/สรรพคุณเกินจริง) ก่อนเข้า TTS
- [ ] Preview กับ Render ใช้เสียงชุดเดียวกัน เรนเดอร์ซ้ำได้ผลเดิม
- [ ] มีตัวเลือกระบุว่าใช้เสียงสังเคราะห์ด้วย AI ในข้อความโพสต์
