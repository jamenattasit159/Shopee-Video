/**
 * Single source of truth for the video look & feel.
 * Edit colors, caption style, motion timing and audio levels here.
 * Palette = Tailwind Slate (dark surfaces) + Indigo (accent).
 */
export const THEME = {
  colors: {
    bg: "#020617", // slate-950 — solid page background
    surface: "#0f172a", // slate-900 — cards / caption backing
    surfaceRaised: "#1e293b", // slate-800
    border: "#334155", // slate-700
    text: "#f8fafc", // slate-50
    textMuted: "#cbd5e1", // slate-300
    accent: "#6366f1", // indigo-500 — highlight / active word
    accentSoft: "#818cf8", // indigo-400
    accentDeep: "#4338ca", // indigo-700
    glow: "rgba(99, 102, 241, 0.22)", // indigo glow behind product
  },

  /** When false, product styleDNA / theme colors are ignored so every video stays Slate + Indigo. */
  respectProductColors: false,

  captions: {
    fontWeight: 800,
    fontSize: 64, // px on a 1080×1920 canvas
    englishFontSize: 36,
    lineHeight: 1.35,
    activeScale: 1.12, // pop size of the word being spoken
    strokeWidth: 0.06, // em, outline around letters
    backingOpacity: 0.94, // solid plate behind the caption
    // Safe zone (px from canvas edges) — clear of Shopee/TikTok UI
    safeBottom: 430,
    safeLeft: 70,
    safeRight: 170,
  },

  motion: {
    transitionFrames: 10,
    sceneEnterFrames: 12,
    sceneExitFrames: 8,
    kenBurnsZoom: 0.08, // +8% scale over a scene
    hookPunchScale: 1.18, // first-frame zoom punch in the hook
  },

  audio: {
    bgmVolume: 0.2,
    bgmVolumeUnderVoice: 0.1, // ducked when narration is playing
    sfxVolume: 0.5,
    transitionSfx: "/sfx/sfx-whoosh.mp3",
    hookSfx: "/sfx/sfx-pop.mp3",
    ctaSfx: "/sfx/sfx-cash.mp3",
  },
} as const;

export type Theme = typeof THEME;
