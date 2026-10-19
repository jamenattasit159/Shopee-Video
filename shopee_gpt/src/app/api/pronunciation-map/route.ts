import {z} from "zod";
import {route} from "@/lib/http";
import {loadPronunciationMap,savePronunciationMap} from "@/lib/speech-text";
export const GET=route(()=>({map:loadPronunciationMap()}));
export const POST=route(async req=>{const {map}=z.object({map:z.record(z.string().max(100),z.string().max(200)).refine(m=>Object.keys(m).length<=500)}).parse(await req.json());savePronunciationMap(map);return {map};});
