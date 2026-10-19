import {z} from "zod";
import {route} from "@/lib/http";
import {listIssues,recordIssue,resolveIssues} from "@/lib/issues";
export const GET=route(()=>({issues:listIssues()}));
export const POST=route(async req=>{
  const input=z.object({code:z.string().max(100),source:z.string().max(240),severity:z.enum(["error","warning"]),message:z.string().max(1800),hint:z.string().max(1800),details:z.string().max(1800)}).parse(await req.json());
  return {issue:recordIssue(input)};
});
export const PATCH=route(async req=>{const {ids}=z.object({ids:z.array(z.string().uuid()).max(200)}).parse(await req.json());resolveIssues(ids);return {resolved:true};});
