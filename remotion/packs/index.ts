import { PackId } from "../types";
import { PackDefinition } from "./types";
import { kraftScrapbookPack } from "./kraftScrapbook";
import { notebookDoodlePack } from "./notebookDoodle";
import { zineNewspaperPack } from "./zineNewspaper";
import { stickerBombPack } from "./stickerBomb";
import { pinboardCorkboardPack } from "./pinboardCorkboard";
import { comicPopartPack } from "./comicPopart";
import { supermarketFlyerPack } from "./supermarketFlyer";
import { softKawaiiPack } from "./softKawaii";

export * from "./types";
export {
  kraftScrapbookPack,
  notebookDoodlePack,
  zineNewspaperPack,
  stickerBombPack,
  pinboardCorkboardPack,
  comicPopartPack,
  supermarketFlyerPack,
  softKawaiiPack,
};

export const ALL_PACKS: PackDefinition[] = [
  kraftScrapbookPack,
  notebookDoodlePack,
  zineNewspaperPack,
  stickerBombPack,
  pinboardCorkboardPack,
  comicPopartPack,
  supermarketFlyerPack,
  softKawaiiPack,
];

export const PACK_MAP: Record<PackId, PackDefinition> = {
  "kraft-scrapbook": kraftScrapbookPack,
  "notebook-doodle": notebookDoodlePack,
  "zine-newspaper": zineNewspaperPack,
  "sticker-bomb": stickerBombPack,
  "pinboard-corkboard": pinboardCorkboardPack,
  "comic-popart": comicPopartPack,
  "supermarket-flyer": supermarketFlyerPack,
  "soft-kawaii": softKawaiiPack,
};

export function getPack(packId?: PackId | string): PackDefinition {
  if (packId && packId in PACK_MAP) {
    return PACK_MAP[packId as PackId];
  }
  return kraftScrapbookPack;
}
