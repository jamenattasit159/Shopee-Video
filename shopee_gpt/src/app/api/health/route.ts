import { route } from "@/lib/http";
import { capcutHealth } from "@/lib/capcut";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import {db,dataDir} from "@/lib/db";
import fs from "node:fs";
import {classify,recordIssue} from "@/lib/issues";
const exec=promisify(execFile);
let voiceCheck: {at:number;ok:boolean}|undefined;
let lastDatabaseError="";
export const GET=route(async(req)=>{
  if(!voiceCheck || Date.now()-voiceCheck.at>60000) {
    let ok=false; try {await exec(process.env.PYTHON_PATH || "python",["-c","import edge_tts"],{timeout:5000,windowsHide:true});ok=true;}catch{}
    voiceCheck={at:Date.now(),ok};
  }
  let database={ok:true,message:"ฐานข้อมูลพร้อม"};
  try{db.prepare("SELECT 1").get();lastDatabaseError="";}catch(error){const issue=classify(error,"database-health");database={ok:false,message:issue.message};if(lastDatabaseError!==issue.code){recordIssue(issue);lastDatabaseError=issue.code;}}
  let storage={ok:true,message:"เขียนไฟล์ได้"};try{fs.accessSync(dataDir,fs.constants.W_OK);}catch{storage={ok:false,message:"เขียนโฟลเดอร์ข้อมูลไม่ได้"};}
  return {capcut:await capcutHealth(req.nextUrl.searchParams.get("refresh")==="1"),ai:!!process.env.GEMINI_API_KEY,voice:voiceCheck.ok,localOnly:true,database,storage,geminiTtsModel:"gemini-3.8-flash-tts",runtime:{node:process.versions.node,uptime:Math.floor(process.uptime()),mode:process.env.NODE_ENV}};
});
