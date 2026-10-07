export type PaperTheme = "kraft" | "cream-grid" | "halftone-orange" | "pastel-mint";
export type SceneLayout = "hero-center" | "polaroid-stack" | "callout-circle";
export type TransitionType = "slap-strip" | "torn-wipe" | "page-shuffle";
export type SFXType = "pop" | "slap" | "tear" | "sparkle" | "cash";

export type PackId =
  | "kraft-scrapbook"
  | "notebook-doodle"
  | "zine-newspaper"
  | "sticker-bomb"
  | "pinboard-corkboard"
  | "comic-popart"
  | "supermarket-flyer"
  | "soft-kawaii";

export type StructureId =
  | "listicle"
  | "problem-solution"
  | "price-first"
  | "unboxing-vibe"
  | "pov-story"
  | "compare";

export type HookFormulaId =
  | "question"
  | "pov"
  | "price-shock"
  | "listicle-number"
  | "secret"
  | "relatable-pain"
  | "seasonal"
  | "reaction";

export type StickerShape = "starburst" | "cloud" | "tag" | "wavy-circle" | "torn-rect";
export type SfxKitId = "tactile-pop" | "playful-cartoon" | "retro-paper";
export type TempoType = "chill" | "snappy" | "hyper";

export interface StyleDNA {
  seed: number;
  pack: PackId;
  palette: string; // e.g. "complementary", "warm-kraft", "pop-contrast"
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  bgColor: string;
  fontPair: string;
  structure: StructureId;
  hookFormula: HookFormulaId;
  layouts: SceneLayout[];
  transitions: TransitionType[];
  tempo: TempoType;
  stickerShape: StickerShape;
  sfxKit: SfxKitId;
}

export interface HookData {
  headline: string;
  subheadline?: string;
  badgeText?: string;
  highlightWord?: string;
  paperTheme?: PaperTheme;
  transitionOut?: TransitionType;
  durationSec: number;
}

export interface SceneData {
  highlightTitle: string;
  highlightDesc: string;
  stickerText?: string;
  highlightWord?: string;
  imageIndex: number;
  layout?: SceneLayout;
  paperTheme?: PaperTheme;
  transitionOut?: TransitionType;
  sfx?: SFXType[];
  durationSec: number;
}

export interface CTAData {
  ctaTitle: string;
  ctaSubtitle?: string;
  buttonText: string;
  basketNote?: string;
  badgeText?: string;
  paperTheme?: PaperTheme;
  durationSec: number;
}

export interface CollageScene {
  type: "hook" | "feature" | "cta";
  headline: string; // ≤ 24 Thai chars
  highlightWord?: string;
  sticker?: string;
  emoji?: string;
  layout: SceneLayout;
  imageIndex: number;
  paperTheme: PaperTheme;
  transitionOut: TransitionType;
  sfx?: SFXType[];
}

export interface ThemeData {
  primaryColor: string;
  accentColor: string;
  bgColor: string;
  textColor: string;
  styleName?: string;
}

export interface AudioSuggestion {
  mood: string;
  musicGenre: string;
  soundEffectTips: string;
}

export interface StoryboardPlan {
  hook: HookData;
  scenes: SceneData[];
  cta: CTAData;
  theme: ThemeData;
  audioSuggestion: AudioSuggestion;
  narrationScript?: string;
  styleDNA?: StyleDNA;
}

export interface ShopeeProductVideoProps {
  [key: string]: any;
  productName: string;
  price: string;
  images: string[];
  cutoutImages?: string[];
  hook: HookData;
  scenes: SceneData[];
  cta: CTAData;
  theme?: Partial<ThemeData>;
  styleDNA?: StyleDNA;
  voiceoverUrl?: string;
  bgmUrl?: string;
  showSafeZone?: boolean;
}

export interface ProductRecord {
  id: string;
  name: string;
  price: string;
  highlights: string;
  tone: string;
  cta: string;
  images: string[];
  cutoutImages?: string[];
  dominantColors?: string[];
  storyboard: StoryboardPlan;
  styleDNA?: StyleDNA;
  createdAt: string;
  renderedVideoUrl?: string;
  voiceoverUrl?: string;
  import?: {
    originalUrl: string;
    shopId?: string | null;
    itemId?: string | null;
    fetchedAt: string;
    confirmedAt?: string;
  };
  category?: string;
  promoTag?: string;
  facts?: {
    brand?: string;
    productType?: string;
    count?: string;
    pack?: string;
    claimsInTitle?: string[];
  };
}
