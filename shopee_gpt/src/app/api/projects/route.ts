import { route } from "@/lib/http";
import { createProject, listProjects } from "@/lib/db";
import { projectInput } from "@/lib/schema";
export const runtime = "nodejs";
export const GET = route(req => ({ projects: listProjects(req.nextUrl.searchParams.get("archived") === "1") }));
export const POST = route(async req => ({ project: createProject(projectInput.parse(await req.json())) }));
