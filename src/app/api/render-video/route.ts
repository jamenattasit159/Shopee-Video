import { spawn } from "child_process";
import fs from "fs/promises";
import { NextRequest, NextResponse } from "next/server";
import path from "path";
import { updateProductVideo } from "../../../lib/storage";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { productId, props } = body;

    if (!props) {
      return NextResponse.json(
        { success: false, error: "Video props are required" },
        { status: 400 }
      );
    }

    const id = productId || `prod_${Date.now()}`;
    const filename = `shopee_${id}_${Date.now()}.mp4`;
    const outputPublicPath = path.join(process.cwd(), "public", "renders", filename);

    // Guarantee that preview guides like showSafeZone are NEVER rendered into the video
    delete props.showSafeZone;

    // Write temp props file for the render worker
    const tempDir = path.join(process.cwd(), ".tmp");
    await fs.mkdir(tempDir, { recursive: true });
    const tempPropsFile = path.join(tempDir, `props_${Date.now()}.json`);
    await fs.writeFile(tempPropsFile, JSON.stringify(props, null, 2), "utf-8");

    const renderScriptPath = path.join(process.cwd(), "scripts", "render.mjs");

    // Execute render script via Node child process
    const renderPromise = new Promise<{ success: boolean; error?: string }>(
      (resolve) => {
        const child = spawn(
          "node",
          [
            renderScriptPath,
            "--props-file",
            tempPropsFile,
            "--output",
            outputPublicPath,
          ],
          {
            cwd: process.cwd(),
            env: process.env,
          }
        );

        let errorOutput = "";

        child.stdout.on("data", (data) => {
          const lines = data.toString();
          console.log(`[Render Worker] ${lines.trim()}`);
        });

        child.stderr.on("data", (data) => {
          const lines = data.toString();
          errorOutput += lines;
          console.error(`[Render Worker Err] ${lines.trim()}`);
        });

        child.on("close", (code) => {
          // Cleanup temp file
          fs.unlink(tempPropsFile).catch(() => {});

          if (code === 0) {
            resolve({ success: true });
          } else {
            resolve({
              success: false,
              error: errorOutput || `Render process exited with code ${code}`,
            });
          }
        });
      }
    );

    const result = await renderPromise;

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error || "Rendering failed" },
        { status: 500 }
      );
    }

    const videoUrl = `/renders/${filename}`;
    if (productId) {
      await updateProductVideo(productId, videoUrl);
    }

    return NextResponse.json({
      success: true,
      videoUrl,
      filename,
      message: "Video rendered successfully",
    });
  } catch (error: any) {
    console.error("Render API error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to trigger video render" },
      { status: 500 }
    );
  }
}
