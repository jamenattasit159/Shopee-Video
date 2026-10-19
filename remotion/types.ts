export type PaperTheme = "kraft" | "cream-grid" | "halftone-orange" | "pastel-mint";
export type SceneLayout =
  | "hero-center"
  | "polaroid-stack"
  | "callout-circle"
  | "fullscreen-broll"
  | "split-showcase"
  | "bento-grid"
  | "magazine-editorial";

export type TransitionType = "slap-strip" | "torn-wipe" | "page-shuffle";
export type SFXType = "pop" | "slap" | "tear" | "sparkle" | "cash";

export type PackId =
  | "pro-minimal-luxury"
  | "pro-flash-sale"
  | "pro-ugc-creator"
  | "pro-cyber-slate"
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

export type CaptionStyleId = "tiktok-pop" | "karaoke-pill" | "clean-bar" | "minimal-outline";
export type CaptionPosition = "bottom" | "center" | "top";

export interface CaptionSettings {
  enabled: boolean;
  style: CaptionStyleId;
  position: CaptionPosition;
  language: "th" | "both" | "en";
  highlightColor?: string;
  fontSize?: number;
}

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
  voicePresetId?: string;
}

export interface VoiceLine {
  sceneId: string;
  role: "hook" | "body" | "cta";
  text: string;
  textForSpeech?: string;
  styleOverride?: string;
  audioUrl?: string;
  rawAudioUrl?: string;
  durationSec?: number;
  polished?: boolean;
}

export interface CaptionCue { text: string; startSec: number; endSec: number; en?: string; }

export interface HookData {
  headline: string;
  headlineLines?: string[];
  subheadline?: string;
  captionLines?: string[];
  badgeText?: string;
  highlightWord?: string;
  paperTheme?: PaperTheme;
  transitionOut?: TransitionType;
  durationSec: number;
  imageIndex?: number;
  videoStartSec?: number;
  videoEndSec?: number;
  videoFillMode?: "freeze" | "error";
  durationMode?: "voice" | "manual";
  videoAudioMode?: "mute" | "mix";
  customCaption?: string;
  /** 2–3 short checklist items that pop in beside the product frame. */
  popPoints?: string[];
  /** Mascot gesture for this scene; picked automatically when unset. */
  mascotPose?: import("./lib/mascotAnimation").MascotPose;
}

export interface SceneData {
  highlightTitle: string;
  headlineLines?: string[];
  highlightDesc: string;
  captionLines?: string[];
  stickerText?: string;
  highlightWord?: string;
  imageIndex: number;
  layout?: SceneLayout;
  paperTheme?: PaperTheme;
  transitionOut?: TransitionType;
  sfx?: SFXType[];
  durationSec: number;
  videoStartSec?: number;
  videoEndSec?: number;
  videoFillMode?: "freeze" | "error";
  durationMode?: "voice" | "manual";
  videoAudioMode?: "mute" | "mix";
  customCaption?: string;
  /** 2–3 short checklist items that pop in beside the product frame. */
  popPoints?: string[];
  /** Mascot gesture for this scene; picked automatically when unset. */
  mascotPose?: import("./lib/mascotAnimation").MascotPose;
}

export interface CTAData {
  ctaTitle: string;
  headlineLines?: string[];
  ctaSubtitle?: string;
  captionLines?: string[];
  buttonText: string;
  basketNote?: string;
  badgeText?: string;
  paperTheme?: PaperTheme;
  durationSec: number;
  imageIndex?: number;
  videoStartSec?: number;
  videoEndSec?: number;
  videoFillMode?: "freeze" | "error";
  durationMode?: "voice" | "manual";
  videoAudioMode?: "mute" | "mix";
  customCaption?: string;
  /** 2–3 short checklist items that pop in beside the product frame. */
  popPoints?: string[];
  /** Mascot gesture for this scene; picked automatically when unset. */
  mascotPose?: import("./lib/mascotAnimation").MascotPose;
}

export interface CollageScene {
  type: "hook" | "feature" | "cta";
  headline: string;
  headlineLines?: string[];
  captionLines?: string[];
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
  mascotAnimation?: import("./lib/mascotAnimation").MascotAnimation;
  presentationStyle?: "notebook-presenter" | "original";
  mascotUrl?: string;
  hook: HookData;
  scenes: SceneData[];
  cta: CTAData;
  theme: ThemeData;
  audioSuggestion: AudioSuggestion;
  narrationScript?: string;
  styleDNA?: StyleDNA;
  voiceLines?: VoiceLine[];
  voicePresetId?: string;
  voiceIntensity?: "low" | "mid" | "high";
  captionSettings?: CaptionSettings;
}

export interface ShopeeProductVideoProps {
  mascotAnimation?: import("./lib/mascotAnimation").MascotAnimation;
  [key: string]: any;
  presentationStyle?: "notebook-presenter" | "original";
  mascotUrl?: string;
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
  voiceoverDurationSec?: number;
  voiceLines?: VoiceLine[];
  bgmUrl?: string;
  showSafeZone?: boolean;
  captionSettings?: CaptionSettings;
  captionCues?: CaptionCue[];
  mediaDurations?: Record<string, number>;
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
  voiceoverUrl?: string;
  voiceoverDurationSec?: number;
  voiceLines?: VoiceLine[];
  voicePresetId?: string;
  voiceIntensity?: "low" | "mid" | "high";
  aiVoiceDisclaimer?: boolean;
  styleDNA?: StyleDNA;
  createdAt: string;
  renderedVideoUrl?: string;
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
