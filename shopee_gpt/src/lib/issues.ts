import fs from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { dataDir, StudioError } from "./db";
export type Issue={id:string;code:string;source:string;severity:"error"|"warning";message:string;hint:string;details:string;createdAt:string;resolved:boolean};
const issueFile=()=>path.join(dataDir,"diagnostics","issues.jsonl");
export function redact(value:unknown):string {
  let text=String(value??"");
  for(const [name,secret] of Object.entries(process.env))if(/KEY|TOKEN|SECRET|PASSWORD/.test(name)&&secret&&secret.length>=8)text=text.split(secret).join("[REDACTED]");
  return text.replace(/AIza[\w-]{20,}/g,"[REDACTED]").replace(/(Bearer\s+)[\w.\-/+=]+/gi,"$1[REDACTED]").replace(/([?&](?:key|token|secret|code|access_token)=)[^&\s]+/gi,"$1[REDACTED]").replace(/"(?:source_audio|consent_audio)"\s*:\s*\{[^}]+\}/g,'"audio":"[REDACTED]"').slice(0,1800);
}
export function classify(error:unknown,source="system"):Omit<Issue,"id"|"createdAt"|"resolved"> {
  const e=error as {message?:string;code?:string;status?:number;stderr?:string;hint?:string};
  const raw=redact(e?.message||error),detail=redact(e?.stderr||raw);
  let code=e?.code||"INTERNAL_ERROR",message=error instanceof StudioError?raw:"ระบบทำรายการไม่สำเร็จ",hint=e?.hint||"ลองอีกครั้ง หากยังเกิดซ้ำ เปิดศูนย์ข้อผิดพลาดแล้วคัดลอกรายงาน";
  if(/quota|RESOURCE_EXHAUSTED|429/i.test(raw)){code="PROVIDER_QUOTA";message="โควตาหรือเครดิตของผู้ให้บริการไม่เพียงพอ";hint="ตรวจโควตาและ billing ของบัญชี หรือเลือกผู้ให้บริการอื่น ระบบยังไม่ได้สร้างงานสำเร็จ";}
  else if(/API_KEY_INVALID|API key not valid|invalid api key/i.test(raw)){code="GEMINI_KEY_INVALID";message="API key ของ Gemini ไม่ถูกต้อง";hint="ตรวจ GEMINI_API_KEY ใน .env.local แล้วรีสตาร์ตโปรเจกต์";}
  else if(/Consent flow failed|VR_TAKEDOWN|didn't match|consent verification/i.test(raw)){code="VOICE_CONSENT_MISMATCH";message="Google ตรวจเสียงยินยอมไม่ผ่าน";hint="ให้ผู้ใหญ่เจ้าของเสียงคนเดียวกันอ่านประโยคยินยอมที่กำหนดทุกคำ บันทึกในที่เงียบแล้วลองใหม่";}
  else if(/NoAudioReceived|ไม่ส่งไฟล์|ไม่มีข้อมูลเสียง/i.test(raw)){code="TTS_NO_AUDIO";message="ผู้ให้บริการไม่ส่งเสียงกลับมา";hint="ลองเสียงอีกตัว ตรวจสคริปต์ หรือใช้ Gemini/ไฟล์เสียงที่อัดเอง ไม่มีการบันทึกว่าเสียงสำเร็จ";}
  else if(/database is locked|SQLITE_BUSY/i.test(raw)){code="DATABASE_BUSY";message="ฐานข้อมูลกำลังถูกใช้งานจากอีก process";hint="รอสักครู่แล้วบันทึกใหม่ อย่าเปิดสตูดิโอหลาย process ที่ใช้ฐานข้อมูลเดียวกัน";}
  else if(/malformed|not a database|SQLITE_CORRUPT/i.test(raw)){code="DATABASE_CORRUPT";message="อ่านฐานข้อมูลไม่ได้ อาจมีไฟล์เสียหาย";hint="หยุดโปรเจกต์ สำรอง data ทั้งโฟลเดอร์ และกู้คืนจาก backup ห้ามสร้างไฟล์ใหม่ทับข้อมูลเดิม";}
  else if(/ENOSPC|disk.*full/i.test(raw)){code="DISK_FULL";message="พื้นที่ดิสก์ไม่เพียงพอ";hint="เพิ่มพื้นที่ว่างหรือย้าย STUDIO_DATA_DIR แล้วลองบันทึก/อัปโหลดใหม่";}
  else if(/EACCES|EPERM|permission denied/i.test(raw)){code="FILE_PERMISSION";message="ไม่มีสิทธิ์อ่านหรือเขียนไฟล์ที่จำเป็น";hint="ตรวจสิทธิ์โฟลเดอร์ data และโปรแกรมรักษาความปลอดภัย ไม่ต้องส่งข้อมูลลับในรายงาน";}
  else if(/ENOENT|not found.*(?:python|ffmpeg|codex)|No module named.*edge_tts/i.test(raw+detail)){code="DEPENDENCY_MISSING";message="ไม่พบไฟล์หรือเครื่องมือที่ระบบต้องใช้";hint="ตรวจ PYTHON_PATH, CODEX_CLI, FFmpeg และโฟลเดอร์ต้นฉบับในหน้าการเชื่อมต่อ";}
  else if(/fetch failed|ECONNREFUSED|ENOTFOUND|EAI_AGAIN|ETIMEDOUT|timeout|aborted|หมดเวลา/i.test(raw)){code="NETWORK_TIMEOUT";message="ติดต่อบริการไม่สำเร็จหรือหมดเวลารอ";hint="ตรวจอินเทอร์เน็ตและสถานะผู้ให้บริการ หากเป็นเซิร์ฟเวอร์ในเครื่อง ให้รัน npm run dev แล้วลองใหม่";}
  else if(e?.status===401||e?.status===403){code="PROVIDER_ACCESS";message=error instanceof StudioError?raw:"บัญชีหรือคีย์ไม่มีสิทธิ์ใช้บริการนี้";hint="ตรวจบัญชี API key และการอนุญาตปลั๊กอินในหน้าการเชื่อมต่อ";}
  else if(e?.status===404&&/model|voice/i.test(raw)){code="MODEL_OR_VOICE_UNAVAILABLE";message="ไม่พบโมเดลหรือ voice ID ในบัญชีนี้";hint="ใช้ Gemini 3.8 Flash TTS และเสียงที่อยู่ใน Google project ของ API key เดียวกัน แล้วโหลดรายการเสียงใหม่";}
  else if(e?.status===409){code="EDIT_CONFLICT";hint="โหลดข้อมูลล่าสุดแล้วแก้และบันทึกอีกครั้ง เพื่อไม่เขียนทับข้อมูลจากอีกหน้าต่าง";}
  return {code,source,severity:"error",message:redact(message),hint:redact(hint),details:detail};
}
export function recordIssue(input:Omit<Issue,"id"|"createdAt"|"resolved">):Issue {
  const issue={...input,id:randomUUID(),message:redact(input.message),hint:redact(input.hint),details:redact(input.details),createdAt:new Date().toISOString(),resolved:false};
  try{fs.mkdirSync(path.dirname(issueFile()),{recursive:true});fs.appendFileSync(issueFile(),JSON.stringify(issue)+"\n","utf8");}catch{console.error(`[studio:${issue.code}] ${issue.message}`);}
  return issue;
}
export function listIssues():Issue[]{
  try{
    const file=issueFile(),size=fs.statSync(file).size,offset=Math.max(0,size-1024*1024),buffer=Buffer.alloc(size-offset),fd=fs.openSync(file,"r");
    try{fs.readSync(fd,buffer,0,buffer.length,offset);}finally{fs.closeSync(fd);}
    const lines=buffer.toString("utf8").split("\n");if(offset)lines.shift();
    let resolved:string[]=[];try{resolved=JSON.parse(fs.readFileSync(path.join(path.dirname(file),"resolved.json"),"utf8"));}catch{}
    return lines.filter(Boolean).slice(-200).flatMap(line=>{try{const i=JSON.parse(line) as Issue;return [{...i,resolved:resolved.includes(i.id)}];}catch{return [];}}).reverse();
  }catch{return [];}
}
export function resolveIssues(ids:string[]){
  const file=path.join(dataDir,"diagnostics","resolved.json");fs.mkdirSync(path.dirname(file),{recursive:true});
  let previous:string[]=[];try{previous=JSON.parse(fs.readFileSync(file,"utf8"));}catch{}
  const temp=`${file}.${randomUUID()}.tmp`;fs.writeFileSync(temp,JSON.stringify([...new Set([...previous,...ids])].slice(-2000)));fs.renameSync(temp,file);
}
