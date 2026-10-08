import { loadFont as loadKanit } from "@remotion/google-fonts/Kanit";
import { loadFont as loadMali } from "@remotion/google-fonts/Mali";
import { loadFont as loadPrompt } from "@remotion/google-fonts/Prompt";

// Preload fonts for Thai typography in Remotion
// RULE V2: Prompt (700-800), Kanit (600-700, FORBID 900), Mali (700)
const promptData = loadPrompt("normal", {
  weights: ["700", "800"],
  subsets: ["thai", "latin"],
});

const kanitData = loadKanit("normal", {
  weights: ["600", "700"],
  subsets: ["thai", "latin"],
});

const maliData = loadMali("normal", {
  weights: ["700"],
  subsets: ["thai", "latin"],
});

export const FONTS = {
  heading: `${promptData.fontFamily}, ${kanitData.fontFamily}, sans-serif`,
  body: `${kanitData.fontFamily}, sans-serif`,
  handwriting: `${maliData.fontFamily}, cursive, sans-serif`,
};

export const waitForFonts = async () => {
  try {
    await Promise.all([
      promptData.waitUntilDone?.(),
      kanitData.waitUntilDone?.(),
      maliData.waitUntilDone?.(),
    ]);
  } catch (err) {
    console.warn("[waitForFonts] Font loading warning:", err);
  }
};


export const PALETTE = {
  shopeeOrange: "#EE4D2D",
  sunnyYellow: "#FFD23F",
  cream: "#FFF4E0",
  kraft: "#D9B382",
  ink: "#1B1B1B",
  mint: "#7ED9B7",
  pink: "#FF8FB1",
  sky: "#8EC9FF",
  white: "#FFFFFF",
  tapeBeige: "rgba(250, 240, 215, 0.88)",
  tapeYellow: "rgba(255, 235, 100, 0.88)",
  // Solid fluorescent highlighter markers (Rule A2)
  markerYellow: "#FFE14D",
  markerPink: "#FF9ECF",
  markerMint: "#8DF0C8",
};

export type ToneType = "exciting" | "minimal" | "problem_solving" | "promo";

export interface ToneTheme {
  primary: string;
  secondary: string;
  accent: string;
  backgroundType: "kraft" | "cream-grid" | "halftone-orange" | "pastel-mint";
  name: string;
}

export const TONE_THEMES: Record<string, ToneTheme> = {
  exciting: {
    primary: PALETTE.shopeeOrange,
    secondary: PALETTE.sunnyYellow,
    accent: PALETTE.pink,
    backgroundType: "halftone-orange",
    name: "ตื่นเต้น / ป้ายยา",
  },
  minimal: {
    primary: PALETTE.ink,
    secondary: PALETTE.kraft,
    accent: PALETTE.cream,
    backgroundType: "cream-grid",
    name: "มินิมอล / คลีน",
  },
  problem_solving: {
    primary: PALETTE.sky,
    secondary: PALETTE.sunnyYellow,
    accent: PALETTE.white,
    backgroundType: "pastel-mint",
    name: "ชี้ทางออก / แก้ปัญหา",
  },
  promo: {
    primary: PALETTE.shopeeOrange,
    secondary: PALETTE.sunnyYellow,
    accent: PALETTE.ink,
    backgroundType: "halftone-orange",
    name: "จัดโปร / ลดแรง",
  },
};
