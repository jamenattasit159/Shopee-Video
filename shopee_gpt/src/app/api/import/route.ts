import { z } from "zod";
import { route } from "@/lib/http";
import { importLink } from "@/lib/creative";
export const POST = route(async req=>importLink(z.object({input:z.string().min(1).max(4000)}).parse(await req.json()).input));
