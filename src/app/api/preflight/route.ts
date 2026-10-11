import { NextRequest, NextResponse } from "next/server";
import { runPreflight, getPreflightSummary } from "@/lib/preflight";
import { withErrorHandling } from "@/lib/serverError";

export const dynamic = "force-dynamic";

export const POST = withErrorHandling(async (req: NextRequest) => {
  const body = await req.json();
  const { project, options } = body;

  if (!project) {
    return NextResponse.json(
      { success: false, error: "Missing project payload for preflight check" },
      { status: 400 }
    );
  }

  const results = await runPreflight(project, options);
  const summary = getPreflightSummary(results);

  return NextResponse.json({
    success: true,
    summary,
    results,
  });
});
