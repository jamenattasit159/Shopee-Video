import type { Metadata } from "next";
import { VoiceStudio } from "@/components/voice/VoiceStudio";

export const metadata: Metadata = {
  title: "Voice Studio · ระบบพากย์เสียง AI",
  description: "สร้างเสียงพากย์ภาษาไทยสำหรับคลิปขายของ เลือกสไตล์ เสียง และดาวน์โหลดไฟล์พร้อมใช้",
};

export default function VoicePage() {
  return <VoiceStudio />;
}
