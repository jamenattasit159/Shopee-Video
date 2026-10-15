/**
 * Single source of truth for default video look & feel, safe zones, and motion timing.
 * StyleDNA and PackId dynamically override colors and backgrounds when respectProductColors is true.
 */
import { SAFE_ZONE } from './lib/layoutGuard';

export const THEME = {
  colors: {
    bg: "#020617", // slate-950 fallback
    surface: "#0f172a", // slate-900 — dark card / caption backing
    surfaceRaised: "#1e293b", // slate-800
    border: "#334155", // slate-700
    text: "#f8fafc", // slate-50
    textMuted: "#cbd5e1", // slate-300
    accent: "#EE4D2D", // Shopee Orange default accent
    accentSoft: "#FF8A65",
    accentDeep: "#C2410C",
    glow: "rgba(238, 77, 45, 0.24)",
  },

  /** Enabled so every video uses its StyleDNA / PackId colors and backgrounds instead of looking identical. */
  respectProductColors: true,

  captions: {
    fontWeight: 800,
    fontSize: 62, // px on a 1080×1920 canvas
    englishFontSize: 34,
    lineHeight: 1.35,
    activeScale: 1.12, // pop size of the word being spoken
    strokeWidth: 0.06, // em, outline around letters
    backingOpacity: 0.92, // solid plate behind the caption
    // Safe zone (px from canvas edges) — clear of Shopee/TikTok UI
    safeBottom: 1920 - SAFE_ZONE.bottom + 24,
    safeLeft: SAFE_ZONE.left,
    safeRight: 1080 - SAFE_ZONE.right,
  },

  motion: {
    transitionFrames: 10,
    sceneEnterFrames: 12,
    sceneExitFrames: 8,
    kenBurnsZoom: 0.08, // +8% scale over a scene
    hookPunchScale: 1.16, // first-frame zoom punch in the hook
  },

  audio: {
    bgmVolume: 0.18,
    bgmVolumeUnderVoice: 0.08, // ducked when narration is playing
    sfxVolume: 0.45,
    transitionSfx: "/sfx/sfx-whoosh.mp3",
    hookSfx: "/sfx/sfx-pop.mp3",
    ctaSfx: "/sfx/sfx-cash.mp3",
  },
} as const;

export type Theme = typeof THEME;
