import { NextRequest, NextResponse } from "next/server";
import { withErrorHandling } from "@/lib/serverError";
import { loadPronunciationMap, savePronunciationMap } from "@/lib/speechText";

export const GET = withErrorHandling(async () => {
  const map = loadPronunciationMap();
  return NextResponse.json({
    ok: true,
    success: true,
    map,
  });
});

export const POST = withErrorHandling(async (req: NextRequest) => {
  const body = await req.json();
  const { map, replaceAll } = body;
  if (!map || typeof map !== "object") {
    const err: any = new Error("ข้อมูล pronunciation map ไม่ถูกต้อง");
    err.code = "UPLOAD_INVALID";
    err.status = 400;
    throw err;
  }

  const currentMap = replaceAll ? {} : loadPronunciationMap();
  const updatedMap = { ...currentMap, ...map };
  savePronunciationMap(updatedMap);

  return NextResponse.json({
    ok: true,
    success: true,
    map: updatedMap,
  });
});

export const DELETE = withErrorHandling(async (req: NextRequest) => {
  const url = new URL(req.url);
  const term = url.searchParams.get("term");
  const currentMap = loadPronunciationMap();

  if (term) {
    for (const k of Object.keys(currentMap)) {
      if (k.toLowerCase() === term.toLowerCase()) {
        delete currentMap[k];
      }
    }
    savePronunciationMap(currentMap);
  }

  return NextResponse.json({
    ok: true,
    success: true,
    map: currentMap,
  });
});
