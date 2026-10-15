import {
  HookFormulaId,
  PackId,
  SceneLayout,
  SfxKitId,
  StickerShape,
  StructureId,
  StyleDNA,
  TempoType,
  TransitionType,
} from "../../remotion/types";

export const ALL_PACK_IDS: PackId[] = [
  "pro-minimal-luxury",
  "pro-flash-sale",
  "pro-ugc-creator",
  "pro-cyber-slate",
  "kraft-scrapbook",
  "notebook-doodle",
  "zine-newspaper",
  "sticker-bomb",
  "pinboard-corkboard",
  "comic-popart",
  "supermarket-flyer",
  "soft-kawaii",
];

export const ALL_SCENE_LAYOUTS: Array<{ id: SceneLayout; label: string; desc: string }> = [
  { id: "fullscreen-broll", label: "เต็มจอ 9:16 (Full-bleed Reel)", desc: "โชว์คลิปหรือภาพเต็มเฟรมพร้อมป้ายลอย เหมาะกับฟุตเทจรีวิว" },
  { id: "split-showcase", label: "แบ่งครึ่งจอ (Split Showcase)", desc: "ครึ่งบนโชว์สินค้าใหญ่ ครึ่งล่างสรุปจุดเด่น + ภาพมุมรอง" },
  { id: "bento-grid", label: "เบนโตะกริด (Bento Grid)", desc: "จัดวาง 2 มุมมองสินค้าพร้อมการ์ดจุดขายสไตล์โมเดิร์น" },
  { id: "magazine-editorial", label: "นิตยสาร (Editorial Cover)", desc: "พาดหัวใหญ่พร้อมกรอบโค้งหรูหราและป้ายการันตี" },
  { id: "hero-center", label: "สินค้าเด่นกลางจอ (Hero Spotlight)", desc: "โชว์สินค้ากลางจอพร้อมกรอบโฟกัสและสติกเกอร์เด้ง" },
  { id: "polaroid-stack", label: "โพลารอยด์ซ้อน (Dual Polaroid)", desc: "กรอบโพลารอยด์ 2 มุมมองวางซ้อนพร้อมคำบรรยาย" },
  { id: "callout-circle", label: "ซูมเจาะจุดเด่น (Detail Callout)", desc: "ตีกรอบชี้เป้าจุดสำคัญของสินค้าพร้อมป้ายกำกับ" },
];

export const ALL_STRUCTURES: StructureId[] = [
  "listicle",
  "problem-solution",
  "price-first",
  "unboxing-vibe",
  "pov-story",
  "compare",
];

export const ALL_HOOKS: HookFormulaId[] = [
  "question",
  "pov",
  "price-shock",
  "listicle-number",
  "secret",
  "relatable-pain",
  "seasonal",
  "reaction",
];

export const ALL_STICKER_SHAPES: StickerShape[] = [
  "starburst",
  "cloud",
  "tag",
  "wavy-circle",
  "torn-rect",
];

export const ALL_SFX_KITS: SfxKitId[] = [
  "tactile-pop",
  "playful-cartoon",
  "retro-paper",
];

export const ALL_TEMPOS: TempoType[] = ["chill", "snappy", "hyper"];

export const ALL_FONT_PAIRS = [
  "prompt-heavy",
  "kanit-punch",
  "mali-handwritten",
  "prompt-clean",
  "kanit-modern",
  "mali-playful",
];

export const ALL_TRANSITIONS: TransitionType[] = [
  "slap-strip",
  "torn-wipe",
  "page-shuffle",
];

export const PACK_INFO: Record<
  PackId,
  { name: string; emoji: string; desc: string; defaultBg: string; tempo: TempoType; category: "pro" | "collage" }
> = {
  "pro-minimal-luxury": {
    name: "Pro Minimal Studio",
    emoji: "💎",
    desc: "สตูดิโอคลีนหรูหรา แสงนุ่ม กรอบกระจก เหมาะกับบิวตี้/ของใช้พรีเมียม",
    defaultBg: "#F8F5F0",
    tempo: "chill",
    category: "pro",
  },
  "pro-flash-sale": {
    name: "Pro Flash Deal",
    emoji: "⚡",
    desc: "ดีลเดือดพาณิชย์ โทนส้ม-ทอง พลังงานสูง กระตุ้นยอดกดตะกร้า",
    defaultBg: "#1A0805",
    tempo: "hyper",
    category: "pro",
  },
  "pro-ugc-creator": {
    name: "Pro UGC Reel",
    emoji: "🎬",
    desc: "สไตล์ครีเอเตอร์รีวิวของจริง เน้นโชว์คลิป/ภาพชัดพร้อมป้ายลอย",
    defaultBg: "#0F1419",
    tempo: "snappy",
    category: "pro",
  },
  "pro-cyber-slate": {
    name: "Pro Tech Slate",
    emoji: "🚀",
    desc: "โทนมืดพรีเมียม Slate & Indigo กริดดิจิทัลและแสง Glow ทันสมัย",
    defaultBg: "#020617",
    tempo: "snappy",
    category: "pro",
  },
  "kraft-scrapbook": {
    name: "Kraft Scrapbook",
    emoji: "📦",
    desc: "กระดาษคราฟต์ โพลารอยด์ เทปกาว โทนอุ่นสบายตา",
    defaultBg: "#DDB88C",
    tempo: "snappy",
    category: "collage",
  },
  "notebook-doodle": {
    name: "Notebook Doodle",
    emoji: "✏️",
    desc: "หน้าสมุดกริด ปากกาเน้นข้อความ เส้นวาดมือลูกศร",
    defaultBg: "#FFF8EA",
    tempo: "snappy",
    category: "collage",
  },
  "zine-newspaper": {
    name: "Zine Newspaper",
    emoji: "📰",
    desc: "หนังสือพิมพ์ทำมือ ขาวดำตัดแปะ พาดหัวข่าวเด่น",
    defaultBg: "#EDE8DF",
    tempo: "hyper",
    category: "collage",
  },
  "sticker-bomb": {
    name: "Sticker Bomb",
    emoji: "💥",
    desc: "สติกเกอร์ระเบิดสีสด Memphis ขอบหนาดำ วัยรุ่นสตรีท",
    defaultBg: "#70E4EF",
    tempo: "hyper",
    category: "collage",
  },
  "pinboard-corkboard": {
    name: "Pinboard Corkboard",
    emoji: "📌",
    desc: "บอร์ดไม้ก๊อก หมุดปัก โน้ตกระดาษเหลือง สืบสวนไอเทมเด็ด",
    defaultBg: "#B58450",
    tempo: "chill",
    category: "collage",
  },
  "comic-popart": {
    name: "Comic Pop-Art",
    emoji: "🎨",
    desc: "การ์ตูนป๊อปอาร์ต ฮาล์ฟโทนใหญ่ กรอบเส้นดำ BAM/POW!",
    defaultBg: "#FFEB3B",
    tempo: "hyper",
    category: "collage",
  },
  "supermarket-flyer": {
    name: "Supermarket Flyer",
    emoji: "🔥",
    desc: "ใบปลิวห้าง ป้ายราคาตลาดสีแดงเหลือง ดาวระเบิดดีลเดือด",
    defaultBg: "#FFE500",
    tempo: "hyper",
    category: "collage",
  },
  "soft-kawaii": {
    name: "Soft Kawaii",
    emoji: "✨",
    desc: "พาสเทลนุ่ม เมฆ ดาว หัวใจ สดใสน่ารักละมุนใจ",
    defaultBg: "#FCE7F3",
    tempo: "chill",
    category: "collage",
  },
};

export const DIVERSE_LAYOUT_SETS: SceneLayout[][] = [
  ["fullscreen-broll", "split-showcase", "bento-grid"],
  ["split-showcase", "magazine-editorial", "callout-circle"],
  ["magazine-editorial", "bento-grid", "polaroid-stack"],
  ["hero-center", "fullscreen-broll", "split-showcase"],
  ["bento-grid", "callout-circle", "polaroid-stack"],
  ["fullscreen-broll", "polaroid-stack", "magazine-editorial"],
  ["hero-center", "polaroid-stack", "callout-circle"],
];

export const PACK_PALETTE_MAP: Record<
  PackId,
  { primary: string; secondary: string; accent: string; bg: string }
> = {
  "pro-minimal-luxury": { primary: "#9A3412", secondary: "#78350F", accent: "#B45309", bg: "#F8F5F0" },
  "pro-flash-sale": { primary: "#EE4D2D", secondary: "#F59E0B", accent: "#DC2626", bg: "#1A0805" },
  "pro-ugc-creator": { primary: "#10B981", secondary: "#0EA5E9", accent: "#059669", bg: "#0F1419" },
  "pro-cyber-slate": { primary: "#6366F1", secondary: "#818CF8", accent: "#4F46E5", bg: "#020617" },
  "kraft-scrapbook": { primary: "#EE4D2D", secondary: "#D97706", accent: "#C2410C", bg: "#DDB88C" },
  "notebook-doodle": { primary: "#2563EB", secondary: "#10B981", accent: "#1D4ED8", bg: "#FFF8EA" },
  "zine-newspaper": { primary: "#1B1B1B", secondary: "#4B5563", accent: "#DC2626", bg: "#EDE8DF" },
  "sticker-bomb": { primary: "#FF007A", secondary: "#00F0FF", accent: "#DB2777", bg: "#70E4EF" },
  "pinboard-corkboard": { primary: "#8C5E2E", secondary: "#D97706", accent: "#B45309", bg: "#B58450" },
  "comic-popart": { primary: "#FF1744", secondary: "#2979FF", accent: "#D50000", bg: "#FFF59D" },
  "supermarket-flyer": { primary: "#D50000", secondary: "#FF6D00", accent: "#B91C1C", bg: "#FFF9C4" },
  "soft-kawaii": { primary: "#EC4899", secondary: "#A78BFA", accent: "#DB2777", bg: "#FCE7F3" },
};

export function rerollClientStyleDNA(current?: StyleDNA, lockedPack?: PackId): StyleDNA {
  const packChoices = ALL_PACK_IDS.filter((p) => (lockedPack ? p === lockedPack : p !== current?.pack));
  const pack = lockedPack || packChoices[Math.floor(Math.random() * packChoices.length)] || "pro-minimal-luxury";
  const info = PACK_INFO[pack];

  const structChoices = ALL_STRUCTURES.filter((s) => s !== current?.structure);
  const structure = structChoices[Math.floor(Math.random() * structChoices.length)] || "listicle";

  const hookChoices = ALL_HOOKS.filter((h) => h !== current?.hookFormula);
  const hookFormula = hookChoices[Math.floor(Math.random() * hookChoices.length)] || "question";

  const fontChoices = ALL_FONT_PAIRS.filter((f) => f !== current?.fontPair);
  const fontPair = fontChoices[Math.floor(Math.random() * fontChoices.length)] || "prompt-heavy";

  const shapeChoices = ALL_STICKER_SHAPES.filter((s) => s !== current?.stickerShape);
  const stickerShape = shapeChoices[Math.floor(Math.random() * shapeChoices.length)] || "starburst";

  const layoutChoices = DIVERSE_LAYOUT_SETS.filter(
    (set) => JSON.stringify(set) !== JSON.stringify(current?.layouts)
  );
  const layouts: SceneLayout[] =
    layoutChoices[Math.floor(Math.random() * layoutChoices.length)] || DIVERSE_LAYOUT_SETS[0];

  const transitions: TransitionType[] = [
    ALL_TRANSITIONS[Math.floor(Math.random() * ALL_TRANSITIONS.length)],
    ALL_TRANSITIONS[Math.floor(Math.random() * ALL_TRANSITIONS.length)],
  ];

  const pal = PACK_PALETTE_MAP[pack];

  return {
    seed: Math.floor(Math.random() * 1000000),
    pack,
    palette: `${pack}-vibrant`,
    primaryColor: pal.primary,
    secondaryColor: pal.secondary,
    accentColor: pal.accent,
    bgColor: pal.bg,
    fontPair,
    structure,
    hookFormula,
    layouts,
    transitions,
    tempo: info.tempo,
    stickerShape,
    sfxKit: "tactile-pop",
  };
}
