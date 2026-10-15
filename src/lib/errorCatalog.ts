import { Severity, Source } from "./errors";

export interface CatalogEntry {
  code: string;
  severity: Severity;
  source: Source;
  messageTh: string;
  hintTh: string;
  retryable?: boolean;
}

export const ERROR_CATALOG: Record<string, CatalogEntry> = {
  // --- หมวด รูปภาพ ---
  IMAGE_DECODE_FAILED: {
    code: "IMAGE_DECODE_FAILED",
    severity: "error",
    source: "ui",
    messageTh: "ไม่สามารถเปิดหรือถอดรหัสไฟล์รูปภาพได้",
    hintTh: "ไฟล์อาจเสียหายหรือไม่สมบูรณ์ กรุณาอัปโหลดใหม่หรือแปลงเป็นนามสกุล PNG / JPG",
    retryable: true,
  },
  UPLOAD_INVALID: {
    code: "UPLOAD_INVALID",
    severity: "error",
    source: "ui",
    messageTh: "ไฟล์ที่อัปโหลดไม่ถูกต้องหรือว่างเปล่า",
    hintTh: "กรุณาตรวจสอบว่าไฟล์มีขนาดไม่เกิน 15MB และเป็นนามสกุลภาพ (JPG, PNG, WEBP)",
    retryable: true,
  },

  // --- หมวด Gemini AI ---
  GEMINI_NO_KEY: {
    code: "GEMINI_NO_KEY",
    severity: "warning",
    source: "gemini",
    messageTh: "ยังไม่ได้ตั้งค่าคีย์สำหรับระบบ AI",
    hintTh: "ระบบจะสลับไปใช้ระบบเทมเพลตสำรองอัตโนมัติ หรือตั้งค่า GEMINI_API_KEY ในไฟล์ .env.local เพื่อใช้ AI เต็มรูปแบบ",
    retryable: false,
  },
  GEMINI_BAD_KEY: {
    code: "GEMINI_BAD_KEY",
    severity: "error",
    source: "gemini",
    messageTh: "คีย์สำหรับระบบ AI ไม่ถูกต้องหรือหมดอายุ",
    hintTh: "กรุณาตรวจสอบ GEMINI_API_KEY ในไฟล์ .env.local แล้วรีสตาร์ตเซิร์ฟเวอร์",
    retryable: false,
  },
  GEMINI_QUOTA: {
    code: "GEMINI_QUOTA",
    severity: "error",
    source: "gemini",
    messageTh: "โควตาการใช้งานระบบ AI เต็ม (429)",
    hintTh: "กรุณารอสักครู่ (ประมาณ 1 นาที) แล้วลองใหม่อีกครั้ง หรือใช้ระบบสร้างสคริปต์สำรอง",
    retryable: true,
  },
  GEMINI_TIMEOUT: {
    code: "GEMINI_TIMEOUT",
    severity: "error",
    source: "gemini",
    messageTh: "การเชื่อมต่อกับระบบ AI หมดเวลา",
    hintTh: "เครือข่ายอาจล่าช้า กรุณากดปุ่มลองใหม่อีกครั้ง",
    retryable: true,
  },
  GEMINI_BAD_JSON: {
    code: "GEMINI_BAD_JSON",
    severity: "warning",
    source: "gemini",
    messageTh: "AI ตอบกลับรูปแบบข้อมูลไม่ถูกต้อง",
    hintTh: "ระบบกำลังพยายามจัดโครงสร้างข้อมูลใหม่อัตโนมัติ หากยังพบปัญหาให้กดสร้างใหม่อีกครั้ง",
    retryable: true,
  },
  GEMINI_SAFETY_BLOCK: {
    code: "GEMINI_SAFETY_BLOCK",
    severity: "warning",
    source: "gemini",
    messageTh: "เนื้อหาสินค้าถูกบล็อกโดยนโยบายความปลอดภัยของ AI",
    hintTh: "กรุณาปรับลดหรือแก้ไขข้อความบรรยายสินค้าที่ไม่เหมาะสม แล้วลองใหม่อีกครั้ง",
    retryable: false,
  },
  FALLBACK_USED: {
    code: "FALLBACK_USED",
    severity: "warning",
    source: "gemini",
    messageTh: "ระบบสลับมาใช้เทมเพลตสำรองอัตโนมัติ",
    hintTh: "ระบบยังสามารถทำงานต่อและสร้างคลิปได้ตามปกติเนื่องจาก AI มีข้อจำกัดชั่วคราว",
    retryable: false,
  },

  // --- หมวด เสียงพากย์ & Voice ---
  VOICE_CONSENT_MISMATCH: {
    code: "VOICE_CONSENT_MISMATCH",
    severity: "error",
    source: "voice",
    messageTh: "การตรวจสอบเสียงยินยอมไม่ผ่าน (Consent Verification Failed)",
    hintTh: "ในขั้นตอนที่ 2 ต้องอ่านประโยคยินยอมคำต่อคำให้ตรงเป๊ะทุกคำ ห้ามพูดคำอื่น โดยใช้ไมโครโฟนเดียวกันกับขั้นตอนที่ 1",
    retryable: true,
  },
  VOICE_NOT_FOUND: {
    code: "VOICE_NOT_FOUND",
    severity: "error",
    source: "voice",
    messageTh: "ไม่พบโมเดลเสียงพากย์ที่เลือก (Voice Not Found)",
    hintTh: "โมเดลเสียงอาจถูกลบไปแล้ว กรุณาเลือกเสียงพากย์ใหม่ หรือสร้างเสียงโคลนใหม่อีกครั้ง",
    retryable: true,
  },
  TTS_QUOTA: {
    code: "TTS_QUOTA",
    severity: "error",
    source: "tts",
    messageTh: "โควตาเสียงพากย์ AI เต็มชั่วคราว",
    hintTh: "สามารถสลับไปใช้ 'ของฟรี (Edge-TTS)' ที่ใช้งานได้ไม่จำกัด หรือรอสักครู่แล้วลองใหม่",
    retryable: true,
  },
  TTS_TIMEOUT: {
    code: "TTS_TIMEOUT",
    severity: "error",
    source: "tts",
    messageTh: "การสร้างเสียงพากย์ใช้เวลานานเกินกำหนด (Timeout)",
    hintTh: "กรุณากดปุ่มลองใหม่อีกครั้ง หรือย่อบทพากย์ให้กระชับขึ้น",
    retryable: true,
  },
  VOICE_STYLE_UNSUPPORTED: {
    code: "VOICE_STYLE_UNSUPPORTED",
    severity: "error",
    source: "voice",
    messageTh: "โมเดลเสียงที่เลือกไม่รองรับสไตล์การพูดนี้",
    hintTh: "กรุณาเลือกสไตล์การพูดแบบมาตรฐาน หรือใช้เสียงมาตรฐานของระบบ",
    retryable: true,
  },
  PRONUNCIATION_UNVERIFIED: {
    code: "PRONUNCIATION_UNVERIFIED",
    severity: "warning",
    source: "tts",
    messageTh: "พบบทพูดที่มีชื่อแบรนด์หรือคำที่อาจอ่านออกเสียงเพี้ยน",
    hintTh: "แนะนำให้ลองฟังเสียงพากย์ก่อนเรนเดอร์ และสามารถแก้คำอ่านภาษาไทยในช่องบทพูดได้",
    retryable: false,
  },
  SCRIPT_TOO_LONG_FOR_DURATION: {
    code: "SCRIPT_TOO_LONG_FOR_DURATION",
    severity: "error",
    source: "tts",
    messageTh: "บทพากย์มีความยาวเกินระยะเวลาของวิดีโอ",
    hintTh: "กรุณาย่อบทพากย์ให้กระชับ (แนะนำ 160-220 ตัวอักษร) เพื่อให้จบพร้อมกับวิดีโอพอดี",
    retryable: true,
  },

  // --- หมวด FFmpeg ---
  FFMPEG_NOT_FOUND: {
    code: "FFMPEG_NOT_FOUND",
    severity: "error",
    source: "ffmpeg",
    messageTh: "ไม่พบโปรแกรมสำหรับประมวลผลไฟล์เสียง",
    hintTh: "กรุณาตรวจสอบว่าโฟลเดอร์ node_modules/@remotion/compositor-* มีอยู่ หรือรัน npm install ใหม่อีกครั้ง",
    retryable: false,
  },
  AUDIO_POLISH_FILTER_MISSING: {
    code: "AUDIO_POLISH_FILTER_MISSING",
    severity: "warning",
    source: "ffmpeg",
    messageTh: "ระบบประมวลผลเสียงขาดฟิลเตอร์ปรับแต่งเสียงบางตัว",
    hintTh: "ระบบข้ามฟิลเตอร์ที่ไม่รองรับและใช้การปรับเสียงเท่าที่มี เพื่อให้งานดำเนินต่อได้โดยไม่สะดุด",
    retryable: false,
  },

  // --- หมวด Render & Remotion ---
  RENDER_NO_BROWSER: {
    code: "RENDER_NO_BROWSER",
    severity: "error",
    source: "render",
    messageTh: "ไม่พบ Headless Chromium สำหรับเรนเดอร์วิดีโอ",
    hintTh: "กรุณารัน npx remotion browser ensure เพื่อดาวน์โหลดเบราว์เซอร์สำหรับเรนเดอร์",
    retryable: true,
  },
  RENDER_TIMEOUT: {
    code: "RENDER_TIMEOUT",
    severity: "error",
    source: "render",
    messageTh: "การเรนเดอร์วิดีโอใช้เวลานานเกินกำหนด (Render Timeout)",
    hintTh: "กรุณาลองเรนเดอร์ใหม่อีกครั้ง หรือปิดแอปพลิเคชันอื่นเพื่อคืนหน่วยความจำให้ระบบ",
    retryable: true,
  },
  RENDER_EXIT_NONZERO: {
    code: "RENDER_EXIT_NONZERO",
    severity: "error",
    source: "render",
    messageTh: "กระบวนการสร้างวิดีโอเกิดข้อผิดพลาด",
    hintTh: "ตรวจสอบข้อมูลสินค้า รูปภาพ และดูรายละเอียด Error Log ที่แนบไว้เพื่อแก้ไข",
    retryable: true,
  },
  FONT_LOAD_FAILED: {
    code: "FONT_LOAD_FAILED",
    severity: "error",
    source: "render",
    messageTh: "ไม่สามารถดาวน์โหลดฟอนต์ภาษาไทยสำหรับเรนเดอร์ได้",
    hintTh: "กรุณาตรวจสอบการเชื่อมต่ออินเทอร์เน็ตเพื่อให้ระบบโหลดฟอนต์ Google Fonts ได้",
    retryable: true,
  },
  DELAY_RENDER_TIMEOUT: {
    code: "DELAY_RENDER_TIMEOUT",
    severity: "error",
    source: "render",
    messageTh: "ภาพหรือทรัพยากรโหลดไม่ทันระหว่างเรนเดอร์เฟรม",
    hintTh: "กรุณาลดขนาดไฟล์ภาพหรือตรวจสอบว่าภาพทั้งหมดยังเข้าถึงได้",
    retryable: true,
  },

  // --- หมวด Storage & File System ---
  STORAGE_WRITE_FAILED: {
    code: "STORAGE_WRITE_FAILED",
    severity: "error",
    source: "storage",
    messageTh: "ไม่สามารถบันทึกไฟล์ลงในดิสก์ได้",
    hintTh: "กรุณาตรวจสอบสิทธิ์การเขียนไฟล์ในโฟลเดอร์ data/, public/uploads หรือ public/renders",
    retryable: true,
  },
  DISK_FULL: {
    code: "DISK_FULL",
    severity: "fatal",
    source: "storage",
    messageTh: "พื้นที่ฮาร์ดดิสก์เต็ม ไม่สามารถทำงานต่อได้",
    hintTh: "กรุณาเพิ่มพื้นที่ว่างในไดรฟ์อย่างน้อย 1GB เพื่อให้ระบบเรนเดอร์และบันทึกไฟล์ได้",
    retryable: false,
  },

  // --- หมวด Import ลิงก์ Shopee ---
  NO_URL: {
    code: "NO_URL",
    severity: "error",
    source: "import",
    messageTh: "ไม่ได้ระบุลิงก์สินค้า Shopee",
    hintTh: "กรุณาวางลิงก์สินค้าจาก Shopee ในช่องค้นหา",
    retryable: true,
  },
  DOMAIN_NOT_ALLOWED: {
    code: "DOMAIN_NOT_ALLOWED",
    severity: "error",
    source: "import",
    messageTh: "ลิงก์ที่ระบุไม่ใช่โดเมนของ Shopee",
    hintTh: "รองรับเฉพาะ shopee.co.th, th.shp.ee หรือ s.shopee.co.th เท่านั้น",
    retryable: true,
  },
  REDIRECT_FAILED: {
    code: "REDIRECT_FAILED",
    severity: "error",
    source: "import",
    messageTh: "ไม่สามารถแปลง Short Link ของ Shopee ได้",
    hintTh: "กรุณาเปิดลิงก์ในเบราว์เซอร์แล้วคัดลอก Full URL จากหน้าสินค้ามาวางแทน",
    retryable: true,
  },
  API_UNAVAILABLE: {
    code: "API_UNAVAILABLE",
    severity: "warning",
    source: "import",
    messageTh: "ระบบดึงข้อมูล Shopee อัตโนมัติขัดข้องชั่วคราว",
    hintTh: "สามารถกรอกข้อมูลสินค้าและอัปโหลดภาพด้วยตนเอง หรืออัปโหลดภาพหน้าจอเพื่อใช้ OCR",
    retryable: true,
  },
  PRODUCT_NOT_FOUND: {
    code: "PRODUCT_NOT_FOUND",
    severity: "error",
    source: "import",
    messageTh: "ไม่พบข้อมูลสินค้าจากลิงก์ที่ระบุ",
    hintTh: "สินค้าอาจถูกลบหรือหมดอายุ กรุณาตรวจสอบลิงก์อีกครั้ง",
    retryable: true,
  },

  // --- หมวด ข้อความบนจอ ---
  TEXT_OVERFLOW: {
    code: "TEXT_OVERFLOW",
    severity: "warning",
    source: "remotion",
    messageTh: "ข้อความบนจอมีความยาวเกินกรอบที่กำหนด",
    hintTh: "แนะนำให้ย่อข้อความใน Storyboard สั้นลงเพื่อให้อ่านง่ายบนจอมือถือ",
    retryable: true,
  },
  BAD_LINE_BREAK: {
    code: "BAD_LINE_BREAK",
    severity: "warning",
    source: "remotion",
    messageTh: "การตัดคำภาษาไทยอาจไม่เป็นธรรมชาติ",
    hintTh: "สามารถแก้ไขการเคาะบรรทัดใน Storyboard เพื่อให้อ่านกระชับขึ้น",
    retryable: false,
  },

  // --- หมวด เครือข่าย & ทั่วไป ---
  NETWORK_OFFLINE: {
    code: "NETWORK_OFFLINE",
    severity: "warning",
    source: "ui",
    messageTh: "การเชื่อมต่ออินเทอร์เน็ตขาดหาย",
    hintTh: "กรุณาตรวจสอบการเชื่อมต่อ Wi-Fi หรืออินเทอร์เน็ตของคุณ",
    retryable: true,
  },
  // --- หมวด Production Hardening (Preflight, Queue, DB, Export, Security) ---
  PREFLIGHT_BLOCKED: {
    code: "PREFLIGHT_BLOCKED",
    severity: "error",
    source: "preflight",
    messageTh: "การตรวจสอบก่อนเรนเดอร์ไม่ผ่าน (Preflight Blocked)",
    hintTh: "กรุณาแก้ไขรายการข้อผิดพลาดระดับบล็อกให้ครบถ้วนก่อนเริ่มเรนเดอร์",
    retryable: false,
  },
  QUEUE_JOB_FAILED: {
    code: "QUEUE_JOB_FAILED",
    severity: "error",
    source: "queue",
    messageTh: "งานในคิวเรนเดอร์ล้มเหลว",
    hintTh: "ระบบจะลองใหม่อัตโนมัติ หรือตรวจสอบรายละเอียดข้อผิดพลาดในหน้ารายการงาน",
    retryable: true,
  },
  DB_ERROR: {
    code: "DB_ERROR",
    severity: "fatal",
    source: "db",
    messageTh: "เกิดข้อผิดพลาดในการเชื่อมต่อหรือบันทึกฐานข้อมูล",
    hintTh: "ตรวจสอบสิทธิ์การเขียนไฟล์ฐานข้อมูล หรือเรียกคืนข้อมูลจากชุดสำรองล่าสุด",
    retryable: true,
  },
  AUTH_REQUIRED: {
    code: "AUTH_REQUIRED",
    severity: "error",
    source: "auth",
    messageTh: "จำเป็นต้องยืนยันตัวตนก่อนเข้าใช้งาน",
    hintTh: "กรุณาใส่รหัสผ่านเพื่อเข้าใช้งาน หรือตั้งค่า APP_PASSWORD ในไฟล์ .env",
    retryable: false,
  },
  QUOTA_CAP_REACHED: {
    code: "QUOTA_CAP_REACHED",
    severity: "warning",
    source: "api",
    messageTh: "โควตาการใช้งานรายวันถึงขีดจำกัดที่กำหนดแล้ว",
    hintTh: "สามารถปรับเพิ่มเพดานการใช้งานในระบบ หรือกดยืนยันปลดล็อกชั่วคราว",
    retryable: false,
  },
  VIDEO_INVALID: {
    code: "VIDEO_INVALID",
    severity: "error",
    source: "render",
    messageTh: "ไฟล์วิดีโอฟุตเทจไม่ถูกต้องหรือเสียหาย",
    hintTh: "รองรับเฉพาะไฟล์ MP4/MOV/WEBM ที่เปิดเล่นได้ปกติ กรุณาแปลงไฟล์หรืออัปโหลดใหม่",
    retryable: true,
  },
  AUDIO_LICENSE_MISSING: {
    code: "AUDIO_LICENSE_MISSING",
    severity: "error",
    source: "preflight",
    messageTh: "ไฟล์เสียงหรือเพลงไม่มีบันทึกใบอนุญาตสิทธิ์การใช้งาน",
    hintTh: "กรุณาระบุที่มาและบันทึกสิทธิ์การใช้งานในคลังเสียงก่อนนำมาใช้ในคลิป",
    retryable: false,
  },
  EXPORT_FAILED: {
    code: "EXPORT_FAILED",
    severity: "error",
    source: "export",
    messageTh: "การสร้าง Export Bundle ล้มเหลว",
    hintTh: "กรุณาตรวจสอบว่าเรนเดอร์วิดีโอสมบูรณ์แล้ว และมีพื้นที่ว่างในดิสก์เพียงพอ",
    retryable: true,
  },
  BACKUP_FAILED: {
    code: "BACKUP_FAILED",
    severity: "error",
    source: "storage",
    messageTh: "การสำรองข้อมูลอัตโนมัติล้มเหลว",
    hintTh: "ตรวจสอบพื้นที่ดิสก์และสิทธิ์การเข้าถึงโฟลเดอร์ backups/",
    retryable: true,
  },
  UNKNOWN: {
    code: "UNKNOWN",
    severity: "error",
    source: "api",
    messageTh: "เกิดข้อผิดพลาดไม่ทราบสาเหตุ",
    hintTh: "กรุณาลองใหม่อีกครั้ง หรือกด 'ดูรายละเอียด' เพื่อดาวน์โหลดรายงานปัญหา",
    retryable: true,
  },
};

/**
 * Gets a catalog entry by error code with fallback to UNKNOWN
 */
export function getCatalogItem(code: string): CatalogEntry {
  if (code in ERROR_CATALOG) {
    return ERROR_CATALOG[code];
  }
  return {
    ...ERROR_CATALOG.UNKNOWN,
    code,
  };
}
