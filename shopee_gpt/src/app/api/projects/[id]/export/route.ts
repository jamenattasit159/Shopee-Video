import { route } from "@/lib/http";
import { exportProject } from "@/lib/export";
export const GET = route((_req,{id})=>exportProject(id));
