import {
  StyleDNA,
  PackId,
  StructureId,
  HookFormulaId,
  StickerShape,
  SfxKitId,
  TempoType,
  TransitionType,
  SceneLayout,
} from "../../remotion/types";
import { derivePalette } from "./paletteDeriver";
import {
  ALL_PACK_IDS,
  ALL_STRUCTURES,
  ALL_HOOKS,
  ALL_STICKER_SHAPES,
  ALL_SFX_KITS,
  ALL_TEMPOS,
  ALL_FONT_PAIRS,
  ALL_TRANSITIONS,
  DIVERSE_LAYOUT_SETS,
  PACK_PALETTE_MAP,
} from "./styleConstants";

export interface HistoryItem {
  productId: string;
  createdAt: string;
  dna: StyleDNA;
}

export {
  ALL_PACK_IDS,
  ALL_STRUCTURES,
  ALL_HOOKS,
  ALL_STICKER_SHAPES,
  ALL_SFX_KITS,
  ALL_TEMPOS,
  ALL_FONT_PAIRS,
  ALL_TRANSITIONS,
};

export const ALL_LAYOUT_SETS: SceneLayout[][] = DIVERSE_LAYOUT_SETS;

// Seeded PRNG: Mulberry32
export function mulberry32(a: number): () => number {
  return function () {
    let t = (a += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Simple deterministic string hash
export function hash(str: string): number {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = (Math.imul(31, h) + str.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

export function isToday(dateStr: string): boolean {
  const d = new Date(dateStr);
  const now = new Date();
  return (
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate()
  );
}

function getHistoryFilePath(): string | null {
  if (typeof window !== "undefined") return null;
  try {
    const path = require("path");
    return path.join(process.cwd(), "data", "style-history.json");
  } catch {
    return null;
  }
}

export function loadStyleHistory(): HistoryItem[] {
  const filePath = getHistoryFilePath();
  if (!filePath) return [];
  try {
    const fs = require("fs");
    if (fs.existsSync(filePath)) {
      const data = fs.readFileSync(filePath, "utf-8");
      return JSON.parse(data);
    }
  } catch (err) {
    console.warn("Failed to read style history:", err);
  }
  return [];
}

export function saveStyleHistory(item: HistoryItem): void {
  const filePath = getHistoryFilePath();
  if (!filePath) return;
  try {
    const fs = require("fs");
    const path = require("path");
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    const history = loadStyleHistory();
    history.push(item);
    const trimmed = history.slice(-200);
    fs.writeFileSync(filePath, JSON.stringify(trimmed, null, 2), "utf-8");
  } catch (err) {
    console.warn("Failed to save style history:", err);
  }
}

export function pickAvoiding<T>(pool: T[], recent: T[], rng: () => number): T {
  const fresh = pool.filter((p) => !recent.includes(p));
  const list = fresh.length > 0 ? fresh : pool;
  return list[Math.floor(rng() * list.length)];
}

export function countDnaDifferences(a: StyleDNA, b?: StyleDNA): number {
  if (!b) return 10;
  let diff = 0;
  if (a.pack !== b.pack) diff++;
  if (a.palette !== b.palette) diff++;
  if (a.structure !== b.structure) diff++;
  if (a.hookFormula !== b.hookFormula) diff++;
  if (a.tempo !== b.tempo) diff++;
  if (a.stickerShape !== b.stickerShape) diff++;
  if (a.sfxKit !== b.sfxKit) diff++;
  if (a.fontPair !== b.fontPair) diff++;
  if (JSON.stringify(a.layouts) !== JSON.stringify(b.layouts)) diff++;
  if (JSON.stringify(a.transitions) !== JSON.stringify(b.transitions)) diff++;
  return diff;
}

export function pickStyleDNA(opts: {
  productId: string;
  batchIndex?: number;
  history?: HistoryItem[];
  dominantColors?: string[];
  lockedPack?: PackId;
  seed?: number;
}): StyleDNA {
  const batchIndex = opts.batchIndex ?? 0;
  const history = opts.history ?? loadStyleHistory();
  const dominant =
    opts.dominantColors && opts.dominantColors.length > 0
      ? opts.dominantColors
      : ["#EE4D2D"];

  const seed = opts.seed ?? hash(`${opts.productId}|${Date.now()}|${batchIndex}`);
  const rng = mulberry32(seed);

  const recent = history.slice(-10).map((h) => h.dna);
  const todays = history.filter((h) => isToday(h.createdAt)).map((h) => h.dna);
  const lastDna = history.slice(-1)[0]?.dna;

  let bestDna: StyleDNA | null = null;
  let maxDiff = -1;

  for (let attempt = 0; attempt < 20; attempt++) {
    const pack =
      opts.lockedPack ??
      pickAvoiding(
        ALL_PACK_IDS,
        todays.map((d) => d.pack).concat(recent.slice(-3).map((d) => d.pack)),
        rng
      );

    const packPalette = PACK_PALETTE_MAP[pack];
    const derived =
      opts.dominantColors && opts.dominantColors.length > 0
        ? derivePalette(dominant, pack, recent.map((d) => d.palette), rng)
        : {
            id: `${pack}-signature`,
            primary: packPalette.primary,
            secondary: packPalette.secondary,
            accent: packPalette.accent,
            bg: packPalette.bg,
          };

    const structure = pickAvoiding(
      ALL_STRUCTURES,
      recent.map((d) => d.structure),
      rng
    );

    const hookFormula = pickAvoiding(
      ALL_HOOKS,
      recent.map((d) => d.hookFormula),
      rng
    );

    const tempo = pickAvoiding(
      ALL_TEMPOS,
      recent.map((d) => d.tempo),
      rng
    );

    const stickerShape = pickAvoiding(
      ALL_STICKER_SHAPES,
      recent.map((d) => d.stickerShape),
      rng
    );

    const sfxKit = pickAvoiding(
      ALL_SFX_KITS,
      recent.map((d) => d.sfxKit),
      rng
    );

    const fontPair = pickAvoiding(
      ALL_FONT_PAIRS,
      recent.map((d) => d.fontPair),
      rng
    );

    const layouts = ALL_LAYOUT_SETS[Math.floor(rng() * ALL_LAYOUT_SETS.length)];

    const t1 = pickAvoiding(ALL_TRANSITIONS, [], rng);
    const t2 = pickAvoiding(ALL_TRANSITIONS, [t1], rng);
    const transitions: TransitionType[] = [t1, t2];

    const candidate: StyleDNA = {
      seed,
      pack,
      palette: derived.id,
      primaryColor: derived.primary,
      secondaryColor: derived.secondary,
      accentColor: derived.accent,
      bgColor: packPalette?.bg || derived.bg,
      fontPair,
      structure,
      hookFormula,
      layouts,
      transitions,
      tempo,
      stickerShape,
      sfxKit,
    };

    const diff = countDnaDifferences(candidate, lastDna);
    if (diff >= 6) {
      return candidate;
    }

    if (diff > maxDiff) {
      maxDiff = diff;
      bestDna = candidate;
    }
  }

  return bestDna!;
}
