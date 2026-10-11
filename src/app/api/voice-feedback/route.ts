import { NextRequest, NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";
import { withErrorHandling } from "@/lib/serverError";

const FEEDBACK_FILE = path.join(process.cwd(), "data", "voice-feedback.json");

export const GET = withErrorHandling(async () => {
  try {
    const data = await fs.readFile(FEEDBACK_FILE, "utf-8");
    return NextResponse.json({
      ok: true,
      feedback: JSON.parse(data),
    });
  } catch {
    return NextResponse.json({
      ok: true,
      feedback: [],
    });
  }
});

export const POST = withErrorHandling(async (req: NextRequest) => {
  const body = await req.json();
  const { presetId, intensity, rating, comment } = body;

  if (!presetId || typeof rating !== "number" || rating < 1 || rating > 5) {
    const err: any = new Error("ข้อมูล feedback ไม่ถูกต้อง (rating ต้องอยู่ระหว่าง 1 ถึง 5)");
    err.code = "UPLOAD_INVALID";
    err.status = 400;
    throw err;
  }

  let list: any[] = [];
  try {
    const raw = await fs.readFile(FEEDBACK_FILE, "utf-8");
    list = JSON.parse(raw);
  } catch {
    list = [];
  }

  const entry = {
    id: `fb_${Date.now()}`,
    presetId,
    intensity: intensity || "mid",
    rating,
    comment: comment || "",
    timestamp: new Date().toISOString(),
  };

  list.push(entry);

  // Keep last 200 entries
  if (list.length > 200) {
    list = list.slice(-200);
  }

  await fs.mkdir(path.dirname(FEEDBACK_FILE), { recursive: true });
  await fs.writeFile(FEEDBACK_FILE, JSON.stringify(list, null, 2), "utf-8");

  return NextResponse.json({
    ok: true,
    success: true,
    entry,
  });
});
