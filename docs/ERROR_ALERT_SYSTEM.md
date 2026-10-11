# 🚨 ERROR ALERT SYSTEM — ระบบแจ้งเตือนข้อผิดพลาดทั้งโปรเจกต์
> ไฟล์สั่งงาน Agent (ใช้ร่วมกับ `VOICE_STYLE_PRESETS.md`, `SHOPEE_LINK_IMPORT.md`, `PAPER_COLLAGE_*.md`)
> **เป้าหมาย:** ถ้ามีอะไรพังที่ไหน ผู้ใช้ต้องเห็นเป็นภาษาไทยที่เข้าใจง่าย รู้ว่าต้องทำอะไรต่อ และส่งรายงานปัญหาให้คนอื่น/AI ช่วยแก้ได้สะดวก

## 0. กฎเหล็ก
1. ห้ามทำให้ฟีเจอร์เดิมพัง (กรอกเอง, สินค้าตัวอย่าง, โคลนเสียง, สังเคราะห์เสียง, เรนเดอร์) และห้ามเปลี่ยนขนาดวิดีโอ 1080x1920 @ 30fps
2. **ห้ามมี `catch` ว่าง หรือ `catch` ที่กลืน error เงียบๆ** ให้ค้นหาทั้งโปรเจกต์แล้วแก้ทุกจุด (ไม่ว่าจะเป็นฝั่ง server, client, Remotion, scripts)
3. **ห้ามข้อมูลลับหลุด:** API key, secret, token, query string ของลิงก์ affiliate, path ที่มีชื่อผู้ใช้เครื่อง ต้อง redact ก่อนบันทึก/แสดง/ส่งออกเสมอ
4. ผู้ใช้ทั่วไปไม่ต้องเห็น stack trace (แสดงเฉพาะใน "รายละเอียด" ที่ผู้ใช้กดดูเอง และต้อง redact แล้ว)
5. ไม่เพิ่ม dependency หนักๆ ถ้ามีไลบรารี toast อยู่แล้ว (เช่น sonner) ให้ใช้ตัวนั้น
6. ข้อความทั้งหมดที่ผู้ใช้เห็นเป็นภาษาไทย สุภาพ บอกวิธีแก้

## 1. โครงสร้างกลาง (`src/lib/errors.ts`)
```ts
export type Severity = 'info' | 'warning' | 'error' | 'fatal';
export type Source = 'ui' | 'api' | 'gemini' | 'tts' | 'voice' | 'render' | 'import' | 'storage' | 'remotion' | 'ffmpeg';

export interface AppError {
  id: string;            // uuid ต่อครั้ง
  code: string;          // รหัสจากแคตตาล็อก
  severity: Severity;
  source: Source;
  messageTh: string;     // ข้อความสั้นที่ผู้ใช้เห็น
  hintTh: string;        // วิธีแก้
  details?: unknown;     // redact แล้วเท่านั้น
  context?: Record<string, unknown>;  // เช่น sceneId, productId, fileName (ห้ามมีความลับ)
  retryable?: boolean;
  timestamp: string;
}
```
- ฟังก์ชัน `toAppError(unknown, hint?)` แปลง Error/Response/สตริงใดๆ เป็น `AppError` (ไม่รู้จัก → `UNKNOWN`)
- ฟังก์ชัน `redact(value)` ลบความลับตามรูปแบบที่พบบ่อย (คีย์ที่ขึ้นต้น `AIza`, ค่าที่ชื่อ key/secret/token/password, query string ของ URL) และ path ผู้ใช้ (`C:\Users\<ชื่อ>` → `C:\Users\***`)

## 2. แคตตาล็อกข้อผิดพลาด (รหัส → ข้อความไทย + วิธีแก้)
เก็บในไฟล์เดียว `src/lib/errorCatalog.ts` ให้เพิ่มได้ง่าย อย่างน้อยต้องมี:

| หมวด | รหัส | severity | ความหมาย / วิธีแก้ที่ต้องบอกผู้ใช้ |
|---|---|---|---|
| รูปภาพ | `IMAGE_DECODE_FAILED` | error | ภาพเปิดไม่ได้ (EncodingError) → ระบุ **ชื่อไฟล์ที่เสีย**, ให้อัปโหลดใหม่/แปลงเป็น PNG/JPG |
| รูปภาพ | `UPLOAD_INVALID` | error | ไฟล์ว่าง / ชนิดไม่ถูกต้อง / ใหญ่เกินกำหนด → บอกเงื่อนไข |
| Gemini | `GEMINI_NO_KEY` / `GEMINI_BAD_KEY` | warning/error | ไม่มีหรือคีย์ไม่ถูกต้อง → ใช้ระบบสำรองได้ (warning) ชี้ไปตั้งค่า `.env.local` |
| Gemini | `GEMINI_QUOTA` (429) | error | โควตาเต็ม → รอแล้วลองใหม่ / ใช้ระบบสำรอง |
| Gemini | `GEMINI_TIMEOUT` | error | หมดเวลา → ลองใหม่ |
| Gemini | `GEMINI_BAD_JSON` | warning | ตอบผิดรูปแบบ → ลองใหม่อัตโนมัติ 1 ครั้งก่อนแจ้ง |
| Gemini | `GEMINI_SAFETY_BLOCK` | warning | ถูกบล็อกด้วยนโยบาย → ปรับข้อความสินค้า |
| Gemini | `FALLBACK_USED` | **warning** | ใช้ระบบสำรองแทน (ไม่ใช่ error ที่ทำให้ใช้ต่อไม่ได้) บอกเหตุผล |
| เสียง | `VOICE_CONSENT_MISMATCH` | error | ประโยคยินยอมไม่ตรง (`FINISH_REASON_INPUT_VR_TAKEDOWN`) → ใช้ข้อความจาก `parseGoogleVoiceError()` ที่มีอยู่แล้ว **ห้ามเขียนซ้ำ ให้เรียกใช้และห่อเป็น AppError** |
| เสียง | `VOICE_NOT_FOUND` | error | ไม่พบ voiceId → ให้เลือกเสียงใหม่ |
| เสียง | `TTS_QUOTA` / `TTS_TIMEOUT` | error | โควตา/หมดเวลา |
| เสียง | `VOICE_STYLE_UNSUPPORTED` | error | SDK/โมเดลไม่รองรับการส่งสไตล์ |
| เสียง | `PRONUNCIATION_UNVERIFIED` | warning | คำที่อาจอ่านเพี้ยน (ชื่อแบรนด์/ตัวเลข) ให้ผู้ใช้ตรวจเสียง |
| เสียง | `SCRIPT_TOO_LONG_FOR_DURATION` | error | บทยาวเกินความยาวคลิป → ย่อบท |
| FFmpeg | `FFMPEG_NOT_FOUND` | error | ไม่พบไบนารี (เคสที่เคยเจอ: `ffmpeg is not recognized`) → ตรวจ `src/lib/ffmpeg.ts` / ติดตั้ง Remotion ใหม่ |
| FFmpeg | `AUDIO_POLISH_FILTER_MISSING` | warning | ฟิลเตอร์ขัดเสียงบางตัวไม่มี → ข้ามแล้วใช้เสียงดิบ |
| Render | `RENDER_NO_BROWSER` | error | ไม่พบ Chromium → ให้ Remotion ดาวน์โหลดเบราว์เซอร์ใหม่ |
| Render | `RENDER_TIMEOUT` | error | เกินเวลา → ลดความซับซ้อน/ลอง concurrency ต่ำลง |
| Render | `RENDER_EXIT_NONZERO` | error | child process จบผิดปกติ → แนบ log 20 บรรทัดท้าย (redact) |
| Render | `FONT_LOAD_FAILED` / `DELAY_RENDER_TIMEOUT` | error | โหลดฟอนต์/ทรัพยากรไม่ทัน |
| Storage | `STORAGE_WRITE_FAILED` / `DISK_FULL` | error/fatal | เขียน `data/` `public/uploads` `public/renders` ไม่ได้ / พื้นที่เต็ม |
| Import | `NO_URL`, `DOMAIN_NOT_ALLOWED`, `REDIRECT_FAILED`, `API_UNAVAILABLE`, `PRODUCT_NOT_FOUND` | error/warning | ตามที่ `SHOPEE_LINK_IMPORT.md` กำหนด |
| ข้อความบนจอ | `TEXT_OVERFLOW`, `BAD_LINE_BREAK` | warning | จาก validator ใน Part E (ตัดคำผิด/ล้นกรอบ) ระบุซีนและข้อความ |
| เครือข่าย | `NETWORK_OFFLINE` | warning | ออฟไลน์ → ตรวจอินเทอร์เน็ต |
| อื่นๆ | `UNKNOWN` | error | ข้อความกลางๆ + แนะนำดาวน์โหลดรายงาน |

รหัสของฟีเจอร์ที่ยังไม่ได้ทำ (เสียง, ลิงก์, Part E) ให้ลงทะเบียนไว้ในแคตตาล็อกได้เลย เมื่อ agent ทำฟีเจอร์เหล่านั้นจะได้ใช้ต่อทันที

## 3. ฝั่ง Server
- `withErrorHandling(handler)` ครอบ **ทุก route ใน `src/app/api/*`** ตอบรูปแบบเดียวกัน:
  `{ ok:false, error:{ id, code, severity, messageTh, hintTh, retryable } }` พร้อม HTTP status ที่ถูกต้อง (400/404/429/500/502/504)
  ผลสำเร็จคงรูปแบบเดิมของแต่ละ route (ห้ามทำให้ client เดิมพัง) อาจเพิ่ม `warnings: AppError[]` ได้
- บันทึกลง `data/error-log.json` (เก็บ 500 รายการล่าสุด, เขียนแบบปลอดภัยต่อการเรียกซ้อน) และ `console.error` เฉพาะที่ redact แล้ว
- งานเรนเดอร์ (`/api/render-video`, `scripts/render.mjs`): จับ stderr, exit code, timeout; แนบ log 20 บรรทัดท้ายใน `details` (redact); ส่งสถานะความคืบหน้า/ล้มเหลวกลับ UI
- Gemini/TTS: ถ้า fallback ทำงานแทน ให้ส่ง `warning: FALLBACK_USED` ไม่ใช่ error
- `GET /api/health`: ตรวจ env (บอกแค่ "มี/ไม่มี" ห้ามแสดงค่าคีย์), FFmpeg และฟิลเตอร์ที่จำเป็น, Chromium สำหรับ Remotion, โฟลเดอร์ `data/`, `public/uploads`, `public/renders` เขียนได้, พื้นที่ดิสก์ว่าง, (ถ้ามี) เสียงโคลนที่ใช้อยู่ยังมีอยู่

## 4. ฝั่ง Client
- `apiFetch()` ครอบ `fetch` ทุกครั้ง แปลงผลล้มเหลว/เครือข่ายล้ม/ข้อมูลผิดรูปแบบ → AppError → ส่งเข้า store แจ้งเตือน และ **เปลี่ยนทุกจุดที่เรียก `fetch` เดิมมาใช้ตัวนี้**
- ดักโกลบอล: `window.onerror`, `unhandledrejection`
- `app/error.tsx` และ `app/global-error.tsx` หน้าจอภาษาไทย พร้อมปุ่ม "ลองใหม่"
- Remotion `<Player />`: ใส่ `errorFallback` และ `onError`; ภาพโหลดไม่ได้ (`<img onError>`) ต้องระบุชื่อไฟล์/path ที่เสีย
- **Ignore list** (แก้ไขได้ในไฟล์เดียว `src/lib/errorIgnore.ts`) ไม่แจ้งผู้ใช้สำหรับสัญญาณรบกวน: error จาก browser extension (ข้อความขึ้นต้น `A listener indicated an asynchronous response`, แหล่งที่มา `chrome-extension://`), `favicon.ico` 404, ข้อความ React DevTools / Fast Refresh, warning `Extra attributes from the server` ที่มาจาก extension (แก้จริงด้วย `suppressHydrationWarning` ที่ `<html>` ใน `layout.tsx`)  แต่ยังบันทึกลง log ระดับ debug ได้
- เพิ่ม `favicon`/`icon` เพื่อไม่ให้ 404

## 5. UI การแจ้งเตือน (ภาษาไทยทั้งหมด)
- **Toast** แยกสี: info น้ำเงิน / warning เหลือง / error แดง / fatal แบนเนอร์เต็มความกว้าง
  - info กับ warning หายเองใน ~6 วินาที, error ต้องกดปิดเอง
- ทุกแจ้งเตือนมี: ข้อความสั้น, วิธีแก้ (`hintTh`), ปุ่ม "ดูรายละเอียด", ปุ่ม "ลองใหม่" เมื่อ `retryable`
- **จัดกลุ่มรายการซ้ำ (dedupe)** แสดง ×N แทนการเด้งซ้ำรัว
- **Error Center:** ไอคอนกระดิ่งที่หัวหน้าเว็บ พร้อมตัวเลขที่ยังไม่อ่าน เปิดเป็น drawer แสดงประวัติ 100 รายการล่าสุด กรองตาม severity/source ได้ มีปุ่ม "คัดลอกรายละเอียด" และ **"ดาวน์โหลดรายงานปัญหา (JSON)"** (เวอร์ชันแอป, เวลา, source, รหัส, ข้อความ, details ที่ redact แล้ว, ผล health check)
- **แถบสถานะระบบ** เล็กๆ บน dashboard: ✅ ปกติ / ⚠️ มีข้อควรระวัง / ❌ ใช้งานไม่ได้ คลิกดูรายละเอียดจาก `/api/health` และมีปุ่มตรวจใหม่
- รองรับ screen reader (`role="alert"` / `aria-live`)

## 6. หน้าทดสอบสำหรับนักพัฒนา (เฉพาะ `NODE_ENV=development`)
`/dev/errors` มีปุ่มจำลองทุกรหัสในแคตตาล็อก เพื่อดูหน้าตา toast, Error Center, dedupe และการ redact

## 7. การทดสอบ
**อัตโนมัติ:** `toAppError`, `redact` (คีย์ `AIza…`, query string, path ผู้ใช้), ignore list, dedupe, การครอบ route ด้วย `withErrorHandling` (route ที่ throw ต้องตอบรูปแบบมาตรฐาน)

**ด้วยมือ (ถ่ายภาพหน้าจอแต่ละกรณีมาให้ผู้ใช้):**
- ปิดอินเทอร์เน็ต
- ลบ/ใส่ `GEMINI_API_KEY` ผิด
- อัปโหลดไฟล์ภาพ 0 ไบต์ และไฟล์ `.txt` ที่เปลี่ยนชื่อเป็น `.png`
- ให้ path ของ FFmpeg ผิด / สั่งเรนเดอร์ตอนไม่มี Chromium
- เลือก voiceId ที่ไม่มีอยู่
- ทำให้เขียนโฟลเดอร์ `public/renders` ไม่ได้ (เช่นตั้งเป็น read-only ชั่วคราว)
- เปิด extension ที่ทำให้เกิด `A listener indicated an asynchronous response` แล้วต้องไม่มีแจ้งเตือนเด้ง

## 8. ลำดับการทำงานของ Agent
1. สำรวจโค้ด (ทุก `fetch`, `catch`, `console.error`, route ใน `src/app/api/*`, `scripts/render.mjs`, `src/lib/tts.ts`, `src/lib/ffmpeg.ts`) สรุปจำนวนจุดที่ต้องแก้และแผนเป็น checklist แล้ว **รอผู้ใช้ตอบ "ลุย"**
2. ทำตามลำดับ: `errors.ts` + `redact` + tests → `errorCatalog.ts` → `withErrorHandling` ครอบทุก route → `apiFetch` + แทนที่ `fetch` เดิม → ดักโกลบอล + `error.tsx` → Toast + Error Center + แถบสถานะ → `/api/health` → `/dev/errors`
3. กวาดทั้งโปรเจกต์หา `catch` ว่าง/กลืน error แล้วแก้ รายงานจำนวนที่แก้
4. หลังแต่ละขั้น `npm run build` ผ่านและทดสอบ regression (กรอกเอง, สินค้าตัวอย่าง, สังเคราะห์เสียง, เรนเดอร์)
5. รายงานผล: ไฟล์ที่เพิ่ม/แก้, จำนวนจุดที่แก้ catch, ภาพหน้าจอตามข้อ 7, ข้อจำกัดที่พบ

## ✅ Acceptance Checklist
- [ ] ทุก API route ตอบ error รูปแบบเดียวกัน และไม่ทำให้ client เดิมพัง
- [ ] ไม่มีข้อมูลลับหลุดใน log / UI / รายงานที่ดาวน์โหลด
- [ ] ทุกกรณีทดสอบในข้อ 7 ขึ้นแจ้งเตือนภาษาไทยที่บอกวิธีแก้ได้
- [ ] ภาพเสีย → บอกชื่อไฟล์ที่เสีย
- [ ] error จาก extension และ favicon ไม่รบกวน
- [ ] ใช้ระบบสำรอง Gemini → แสดงเป็น warning ไม่ใช่ error
- [ ] ไม่มี `catch` ว่างเหลือในโปรเจกต์
- [ ] `/api/health` และแถบสถานะระบบทำงาน
- [ ] ระบบเดิมทั้งหมดใช้ได้เหมือนเดิม และ `npm run build` ผ่าน
