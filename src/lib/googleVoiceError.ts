/**
 * Extracts and clarifies Google Gemini Voice Replication errors
 */
export function parseGoogleVoiceError(error: any): string {
  const raw = String(error?.message || error || "");

  if (
    raw.includes("Consent flow failed") ||
    raw.includes("FINISH_REASON_INPUT_VR_TAKEDOWN") ||
    raw.includes("didn't match the text on screen")
  ) {
    return "การตรวจสอบเสียงยินยอมไม่ผ่าน (Consent Verification Failed):\nเสียงใน 'ขั้นตอนที่ 2' ไม่ตรงกับข้อความยินยอมที่ระบบกำหนด หรือระบบ AI ตรวจจับคำพูดไม่ชัดเจน\n\nวิธีแก้ไข:\n1. ในขั้นตอนที่ 2 ต้องอ่านประโยคยินยอมคำต่อคำให้ตรงเป๊ะทุกคำ ห้ามพูดคำอื่น ห้ามสรุป หรือข้ามคำ\n2. ต้องเป็นเสียงของผู้พูดคนเดียวกันกับในขั้นตอนที่ 1\n3. บันทึกในที่เงียบและใช้ไมโครโฟนเดียวกัน";
  }

  if (raw.includes("RESOURCE_EXHAUSTED") || raw.includes("quota")) {
    return "โควตา Gemini API เต็ม หรือเครดิตไม่เพียงพอสำหรับสร้างโมเดลเสียง";
  }

  if (raw.includes("API_KEY_INVALID") || raw.includes("invalid api key")) {
    return "API Key ของ Google Gemini ไม่ถูกต้อง กรุณาตรวจสอบ GEMINI_API_KEY ใน .env.local";
  }

  return raw;
}
