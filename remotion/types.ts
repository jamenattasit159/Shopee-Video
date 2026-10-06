export interface HookData {
  headline: string;
  subheadline?: string;
  badgeText?: string;
  durationSec: number;
}

export interface SceneData {
  highlightTitle: string;
  highlightDesc: string;
  stickerText?: string;
  imageIndex: number;
  durationSec: number;
}

export interface CTAData {
  ctaTitle: string;
  ctaSubtitle?: string;
  buttonText: string;
  basketNote?: string;
  durationSec: number;
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
}

export interface ShopeeProductVideoProps {
  [key: string]: any;
  productName: string;
  price: string;
  images: string[];
  hook: HookData;
  scenes: SceneData[];
  cta: CTAData;
  theme?: Partial<ThemeData>;
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
  storyboard: StoryboardPlan;
  createdAt: string;
  renderedVideoUrl?: string;
  voiceoverUrl?: string;
}
