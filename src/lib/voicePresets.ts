export interface VoicePreset {
  id: string;
  nameTh: string;
  descriptionTh: string;
  stylePrompt: string; // สั้น ภาษาไทย <= 2 ประโยค ห้ามมีชื่อสินค้า/เนื้อหาบท
  polish: {
    atempo: number;
    compressor: boolean;
    presenceDb: number;
    targetLufs: number;
  };
  bestFor: string[]; // หมวดสินค้า เช่น 'baby','beauty','kitchen','general','gadget','fashion'
  roleDefault?: Partial<Record<'hook' | 'body' | 'cta', true>>;
}

export type VoiceIntensity = 'low' | 'mid' | 'high';

export const VOICE_PRESETS: VoicePreset[] = [
  {
    id: 'vendor-live',
    nameTh: 'พ่อค้าไลฟ์สด',
    descriptionTh: 'พลังงานสูง ยิ้มในน้ำเสียง เน้นคำสำคัญและราคา ชวนซื้อเป็นกันเอง',
    stylePrompt: 'พลังงานสูง ยิ้มในน้ำเสียง พูดเร็วขึ้นเล็กน้อย เน้นคำสำคัญและราคา เหมือนพ่อค้าชวนลูกค้าหน้าร้านอย่างเป็นกันเอง',
    polish: { atempo: 1.08, compressor: true, presenceDb: 3, targetLufs: -14 },
    bestFor: ['general', 'kitchen', 'gadget'],
    roleDefault: { hook: true },
  },
  {
    id: 'market-hype',
    nameTh: 'ตลาดนัดตื่นเต้น',
    descriptionTh: 'ตื่นเต้นกระตือรือร้น จังหวะกระชับ เว้นจังหวะสั้นๆ ก่อนบอกราคา',
    stylePrompt: 'ตื่นเต้นกระตือรือร้น จังหวะกระชับ เว้นจังหวะสั้นๆ ก่อนบอกราคา',
    polish: { atempo: 1.10, compressor: true, presenceDb: 3, targetLufs: -14 },
    bestFor: ['general', 'fashion'],
    roleDefault: { hook: true },
  },
  {
    id: 'friendly-trust',
    nameTh: 'เพื่อนแนะนำของ',
    descriptionTh: 'อบอุ่น เป็นกันเอง ไม่เร่งขาย เหมาะกับสินค้าเด็ก ผิวพรรณ และความน่าเชื่อถือ',
    stylePrompt: 'อบอุ่น เป็นกันเอง ไม่เร่งขาย เหมือนแนะนำให้เพื่อนสนิท',
    polish: { atempo: 1.03, compressor: true, presenceDb: 2, targetLufs: -14 },
    bestFor: ['baby', 'beauty', 'health-adjacent'],
  },
  {
    id: 'whisper-secret',
    nameTh: 'กระซิบของดี',
    descriptionTh: 'กระซิบเล่าความลับน่ารัก เสียงใกล้ไมค์ พลังงานต่ำแต่น่าสนใจ',
    stylePrompt: 'กระซิบเล่าความลับน่ารัก เสียงใกล้ไมค์ พลังงานต่ำแต่ตื่นเต้น',
    polish: { atempo: 1.00, compressor: true, presenceDb: 2, targetLufs: -14 },
    bestFor: ['beauty', 'general'],
  },
  {
    id: 'calm-reviewer',
    nameTh: 'รีวิวจริงจัง',
    descriptionTh: 'นิ่ง มั่นใจ ชัดเจน เหมือนผู้รีวิวที่ใช้จริงและเชี่ยวชาญ',
    stylePrompt: 'นิ่ง มั่นใจ ชัดเจน เหมือนผู้รีวิวที่ใช้จริง',
    polish: { atempo: 1.02, compressor: true, presenceDb: 2, targetLufs: -14 },
    bestFor: ['gadget', 'kitchen'],
  },
  {
    id: 'flash-close',
    nameTh: 'เร่งปิดการขาย',
    descriptionTh: 'ชัดเจนมั่นใจ เร่งจังหวะเล็กน้อย ชวนกดตะกร้าส้มทันที',
    stylePrompt: 'ชัดเจนมั่นใจ เร่งจังหวะเล็กน้อย ชวนกดตะกร้าส้มทันที',
    polish: { atempo: 1.08, compressor: true, presenceDb: 3, targetLufs: -14 },
    bestFor: ['general'],
    roleDefault: { cta: true },
  },
];

/**
 * Builds the effective style prompt considering preset and intensity level
 */
export function buildEffectiveStylePrompt(
  presetId: string,
  intensity: VoiceIntensity = 'mid',
  customStyleOverride?: string
): string {
  if (customStyleOverride && customStyleOverride.trim()) {
    return customStyleOverride.trim();
  }

  const preset = VOICE_PRESETS.find((p) => p.id === presetId) || VOICE_PRESETS[0];
  let prompt = preset.stylePrompt;

  if (intensity === 'low') {
    prompt += ' ให้เบาและเป็นธรรมชาติ';
  } else if (intensity === 'high') {
    prompt += ' จัดเต็มขึ้นอีกนิด ชัดเจน';
  }

  return prompt;
}

/**
 * Returns the recommended voice preset based on product category
 */
export function getRecommendedPresetForCategory(category?: string): VoicePreset {
  if (!category) return VOICE_PRESETS[0]; // vendor-live default

  const catLower = category.toLowerCase();
  if (catLower.includes('baby') || catLower.includes('เด็ก') || catLower.includes('แม่') || catLower.includes('health')) {
    return VOICE_PRESETS.find((p) => p.id === 'friendly-trust') || VOICE_PRESETS[2];
  }
  if (catLower.includes('beauty') || catLower.includes('ผิว') || catLower.includes('skincare')) {
    return VOICE_PRESETS.find((p) => p.id === 'friendly-trust') || VOICE_PRESETS[2];
  }
  if (catLower.includes('gadget') || catLower.includes('it') || catLower.includes('หูฟัง')) {
    return VOICE_PRESETS.find((p) => p.id === 'calm-reviewer') || VOICE_PRESETS[4];
  }
  if (catLower.includes('fashion') || catLower.includes('เสื้อผ้า')) {
    return VOICE_PRESETS.find((p) => p.id === 'market-hype') || VOICE_PRESETS[1];
  }

  return VOICE_PRESETS[0];
}
