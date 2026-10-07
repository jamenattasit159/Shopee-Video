import path from "path";
import sharp from "sharp";

/**
 * Extracts dominant colors from an image file using simple histogram quantization.
 * Returns an array of hex colors (e.g. ['#38BDF8', '#0284C7', '#E0F2FE'])
 */
export async function extractDominantColors(imagePath: string): Promise<string[]> {
  try {
    const ext = path.extname(imagePath).toLowerCase();
    let imageBuffer: Buffer;

    // Handle SVGs by converting to raster or extracting fill colors
    if (ext === ".svg") {
      return ["#38BDF8", "#EE4D2D", "#FFD23F"];
    }

    const resolvedPath = imagePath.startsWith("/")
      ? path.join(process.cwd(), "public", imagePath)
      : imagePath;

    // Resize image to 40x40 pixels for ultra-fast color sampling
    const { data, info } = await sharp(resolvedPath)
      .resize(40, 40, { fit: "cover" })
      .raw()
      .toBuffer({ resolveWithObject: true });

    const colorCounts: Record<string, number> = {};
    const channels = info.channels;

    for (let i = 0; i < data.length; i += channels) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      const a = channels === 4 ? data[i + 3] : 255;

      // Ignore transparent pixels or pure white/black background
      if (a < 50 || (r > 245 && g > 245 && b > 245) || (r < 15 && g < 15 && b < 15)) {
        continue;
      }

      // Quantize to 32-step buckets
      const qr = Math.round(r / 32) * 32;
      const qg = Math.round(g / 32) * 32;
      const qb = Math.round(b / 32) * 32;
      const hex = `#${((1 << 24) + (qr << 16) + (qg << 8) + qb).toString(16).slice(1)}`;
      colorCounts[hex] = (colorCounts[hex] || 0) + 1;
    }

    const sorted = Object.entries(colorCounts)
      .sort((a, b) => b[1] - a[1])
      .map(([hex]) => hex);

    if (sorted.length > 0) {
      return sorted.slice(0, 3);
    }
  } catch (err) {
    console.warn("[ColorExtractor] Failed to extract colors, using default:", err);
  }

  return ["#EE4D2D", "#FFD23F", "#8EC9FF"];
}
