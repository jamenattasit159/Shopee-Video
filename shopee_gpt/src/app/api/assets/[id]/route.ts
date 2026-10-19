import { z } from "zod";
import fs from "node:fs/promises";
import path from "node:path";
import { route } from "@/lib/http";
import { deleteAsset, getAsset, storageDir, updateAsset } from "@/lib/db";
import { assetPath, mediaResponse } from "@/lib/media";
export const runtime = "nodejs";
export const GET = route((req,{id})=>mediaResponse(id,req.headers.get("range"),req.nextUrl.searchParams.get("thumb") === "1"));
export const PATCH = route(async (req,{id})=>{ const {role} = z.object({role:z.enum(["hook","demo","detail","cta","voiceover","music"])}).parse(await req.json()); updateAsset(id,role); return {asset:getAsset(id)}; });
export const DELETE = route(async (_req,{id})=>{
  const asset = deleteAsset(id);
  await fs.unlink(assetPath(asset)).catch(()=>{});
  if(asset.thumbnail) await fs.unlink(path.join(storageDir,path.basename(asset.thumbnail))).catch(()=>{});
  return {deleted:true};
});
