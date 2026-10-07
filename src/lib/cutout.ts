import fs from "fs/promises";
import path from "path";

/**
 * Attempts to remove background from an image file and save a cutout PNG.
 * Gracefully falls back to null if processing is not possible or fails.
 */
export async function generateProductCutout(
  inputFilePath: string,
  outputFileName: string
): Promise<string | null> {
  const ext = path.extname(inputFilePath).toLowerCase();

  // SVGs are already transparent vector illustrations
  if (ext === ".svg") {
    return null;
  }

  const uploadsDir = path.join(process.cwd(), "public", "uploads");
  const outputPath = path.join(uploadsDir, outputFileName);

  try {
    const { removeBackground } = await import("@imgly/background-removal-node");
    const blob = await removeBackground(inputFilePath);
    const arrayBuffer = await blob.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    await fs.writeFile(outputPath, buffer);
    return `/uploads/${outputFileName}`;
  } catch (err) {
    console.warn(`[Cutout Pipeline] Background removal skipped for ${inputFilePath}:`, err);
    return null;
  }
}
