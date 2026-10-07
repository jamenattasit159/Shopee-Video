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
  "kraft-scrapbook",
  "notebook-doodle",
  "zine-newspaper",
  "sticker-bomb",
  "pinboard-corkboard",
  "comic-popart",
  "supermarket-flyer",
  "soft-kawaii",
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
  { name: string; emoji: string; desc: string; defaultBg: string; tempo: TempoType }
> = {
  "kraft-scrapbook": {
    name: "Kraft Scrapbook",
    emoji: "📦",
    desc: "กระดาษคราฟต์ โพลารอยด์ เทปกาว โทนอุ่นสบายตา",
    defaultBg: "#DDB88C",
    tempo: "snappy",
  },
  "notebook-doodle": {
    name: "Notebook Doodle",
    emoji: "✏️",
    desc: "หน้าสมุดกริด ปากกาเน้นข้อความ เส้นวาดมือลูกศร",
    defaultBg: "#FFF8EA",
    tempo: "snappy",
  },
  "zine-newspaper": {
    name: "Zine Newspaper",
    emoji: "📰",
    desc: "หนังสือพิมพ์ทำมือ ขาวดำตัดแปะ พาดหัวข่าวเด่น",
    defaultBg: "#EDE8DF",
    tempo: "hyper",
  },
  "sticker-bomb": {
    name: "Sticker Bomb",
    emoji: "⚡",
    desc: "สติกเกอร์ระเบิดสีสด Memphis ขอบหนาดำ วัยรุ่นสตรีท",
    defaultBg: "#70E4EF",
    tempo: "hyper",
  },
  "pinboard-corkboard": {
    name: "Pinboard Corkboard",
    emoji: "📌",
    desc: "บอร์ดไม้ก๊อก หมุดปัก โน้ตกระดาษเหลือง สืบสวนไอเทมเด็ด",
    defaultBg: "#B58450",
    tempo: "chill",
  },
  "comic-popart": {
    name: "Comic Pop-Art",
    emoji: "💥",
    desc: "การ์ตูนป๊อปอาร์ต ฮาล์ฟโทนใหญ่ กรอบเส้นดำ BAM/POW!",
    defaultBg: "#FFEB3B",
    tempo: "hyper",
  },
  "supermarket-flyer": {
    name: "Supermarket Flyer",
    emoji: "🔥",
    desc: "ใบปลิวห้าง ป้ายราคาตลาดสีแดงเหลือง ดาวระเบิดดีลเดือด",
    defaultBg: "#FFE500",
    tempo: "hyper",
  },
  "soft-kawaii": {
    name: "Soft Kawaii",
    emoji: "✨",
    desc: "พาสเทลนุ่ม เมฆ ดาว หัวใจ สดใสน่ารักละมุนใจ",
    defaultBg: "#FCE7F3",
    tempo: "chill",
  },
};

export function rerollClientStyleDNA(current?: StyleDNA, lockedPack?: PackId): StyleDNA {
  const packChoices = ALL_PACK_IDS.filter((p) => (lockedPack ? p === lockedPack : p !== current?.pack));
  const pack = lockedPack || packChoices[Math.floor(Math.random() * packChoices.length)] || "kraft-scrapbook";
  const info = PACK_INFO[pack];

  const structChoices = ALL_STRUCTURES.filter((s) => s !== current?.structure);
  const structure = structChoices[Math.floor(Math.random() * structChoices.length)] || "listicle";

  const hookChoices = ALL_HOOKS.filter((h) => h !== current?.hookFormula);
  const hookFormula = hookChoices[Math.floor(Math.random() * hookChoices.length)] || "question";

  const fontChoices = ALL_FONT_PAIRS.filter((f) => f !== current?.fontPair);
  const fontPair = fontChoices[Math.floor(Math.random() * fontChoices.length)] || "prompt-heavy";

  const shapeChoices = ALL_STICKER_SHAPES.filter((s) => s !== current?.stickerShape);
  const stickerShape = shapeChoices[Math.floor(Math.random() * shapeChoices.length)] || "starburst";

  const layouts: SceneLayout[] = [
    ["hero-center", "polaroid-stack", "callout-circle"],
    ["polaroid-stack", "hero-center", "hero-center"],
    ["callout-circle", "hero-center", "polaroid-stack"],
  ][Math.floor(Math.random() * 3)] as SceneLayout[];

  const transitions: TransitionType[] = [
    ALL_TRANSITIONS[Math.floor(Math.random() * ALL_TRANSITIONS.length)],
    ALL_TRANSITIONS[Math.floor(Math.random() * ALL_TRANSITIONS.length)],
  ];

  const paletteMap: Record<PackId, { primary: string; secondary: string; accent: string; bg: string }> = {
    "kraft-scrapbook": { primary: "#EE4D2D", secondary: "#D97706", accent: "#FFE14D", bg: "#DDB88C" },
    "notebook-doodle": { primary: "#2563EB", secondary: "#10B981", accent: "#FFE14D", bg: "#FFF8EA" },
    "zine-newspaper": { primary: "#1B1B1B", secondary: "#4B5563", accent: "#DC2626", bg: "#EDE8DF" },
    "sticker-bomb": { primary: "#FF007A", secondary: "#00F0FF", accent: "#FFE600", bg: "#70E4EF" },
    "pinboard-corkboard": { primary: "#8C5E2E", secondary: "#D97706", accent: "#FEF08A", bg: "#B58450" },
    "comic-popart": { primary: "#FF1744", secondary: "#2979FF", accent: "#FFEB3B", bg: "#FFF59D" },
    "supermarket-flyer": { primary: "#D50000", secondary: "#FF6D00", accent: "#FFE500", bg: "#FFF9C4" },
    "soft-kawaii": { primary: "#F472B6", secondary: "#A78BFA", accent: "#FDE047", bg: "#FCE7F3" },
  };

  const pal = paletteMap[pack];

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
