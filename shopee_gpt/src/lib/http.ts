import { NextRequest, NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { ZodError } from "zod";
import { StudioError } from "./db";
import { classify, recordIssue } from "./issues";

export function guard(req: NextRequest) {
  const host = req.headers.get("host") || "";
  if (!/^(localhost|127\.0\.0\.1|\[::1\])(?::\d+)?$/.test(host)) throw new StudioError("ระบบรุ่นนี้ใช้เฉพาะบนเครื่องของคุณ", 403);
  const origin = req.headers.get("origin");
  if (origin && new URL(origin).host !== host) throw new StudioError("ไม่อนุญาตคำขอจากเว็บไซต์อื่น", 403);
  if (req.headers.get("sec-fetch-site") === "cross-site") throw new StudioError("ไม่อนุญาตคำขอข้ามเว็บไซต์", 403);
  const token = process.env.STUDIO_API_TOKEN;
  if (!origin && token && req.method !== "GET") {
    const provided = Buffer.from(req.headers.get("authorization")?.replace(/^Bearer /, "") || "");
    const expected = Buffer.from(token);
    if (provided.length !== expected.length || !timingSafeEqual(provided, expected)) throw new StudioError("กรุณาใช้ API token ที่ถูกต้อง", 401);
  }
}
export function route(fn: (req: NextRequest, params: Record<string,string>) => Promise<unknown> | unknown) {
  return async (req: NextRequest, context: {params: Promise<Record<string,string>>}) => {
    try {
      guard(req);
      const result = await fn(req, await context.params);
      return result instanceof Response ? result : NextResponse.json(result, { headers: { "Cache-Control": "no-store" } });
    } catch (error) {
      const status = error instanceof StudioError ? error.status : error instanceof ZodError ? 400 : 500;
      const message = error instanceof ZodError ? error.issues.map(i => `${i.path.join(".")}: ${i.message}`).join("; ") : error instanceof StudioError ? error.message : "ระบบทำรายการไม่สำเร็จ กรุณาลองอีกครั้ง";
      const issue=recordIssue(error instanceof ZodError?{code:"VALIDATION_ERROR",source:req.nextUrl.pathname,severity:"warning",message,hint:"ตรวจช่องที่ระบุแล้วลองใหม่",details:message}:classify(error,req.nextUrl.pathname));
      return NextResponse.json({ error: issue.message, issue }, { status });
    }
  };
}
