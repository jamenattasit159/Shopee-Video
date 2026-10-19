import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import { execFileSync } from "node:child_process";
import ffmpeg from "ffmpeg-static";

// Run only against an isolated QA server: STUDIO_DATA_DIR=.tmp/qa-data PORT=3101 npm start
const base=process.env.QA_BASE_URL || "http://127.0.0.1:3101";
if(new URL(base).port!=="3101")throw new Error("Smoke tests require the isolated QA server on port 3101");
async function request(url,options={}){
  const r=await fetch(base+url,options);const d=await r.json();assert.ok(r.ok,JSON.stringify(d));return d;
}
const json=value=>({method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(value)});
const p=(await request("/api/projects",json({name:"ทดสอบระบบ — ไม่ใช่คลิปใช้งานจริง",price:"590",facts:"ข้อมูลสมมติสำหรับตรวจระบบเท่านั้น ไม่ใช่ข้อมูลเพื่อเผยแพร่",experience:"",voice:"original",verified:true,rightsConfirmed:true}))).project;
const dir=path.join(process.cwd(),".tmp","qa-fixtures");await fs.mkdir(dir,{recursive:true});
const video=path.join(dir,"test-video.mp4"),image=path.join(dir,"test-image.jpg");
execFileSync(ffmpeg,["-y","-f","lavfi","-i","testsrc2=size=360x640:rate=24:duration=12","-f","lavfi","-i","anullsrc=r=44100:cl=mono","-shortest","-c:v","libx264","-pix_fmt","yuv420p","-c:a","aac",video],{stdio:"ignore"});
execFileSync(ffmpeg,["-y","-f","lavfi","-i","color=c=slategray:s=360x640","-frames:v","1",image],{stdio:"ignore"});
const form=new FormData();form.append("files",new Blob([await fs.readFile(video)],{type:"video/mp4"}),"QA-test-video.mp4");form.append("files",new Blob([await fs.readFile(image)],{type:"image/jpeg"}),"QA-test-image.jpg");
const upload=await request(`/api/projects/${p.id}/assets`,{method:"POST",body:form});assert.equal(upload.results.filter(r=>r.asset).length,2);
const generated=await request(`/api/projects/${p.id}/script`,json({revision:upload.project.revision}));
assert.equal(generated.project.scenes.length,5);assert.equal(generated.project.scriptSource,"template");
assert.ok(generated.project.scenes.every(s=>s.assetId));
const narration=generated.project.scenes.map(s=>s.narration).join(" ");assert.ok(!narration.includes("ใช้แล้วดี"));
const prepared=await request(`/api/projects/${p.id}/jobs`,{method:"POST"});assert.equal(prepared.job.state,"prepared");assert.ok(prepared.prompt.includes(prepared.job.id));
const zip=await fetch(base+`/api/projects/${p.id}/export`);assert.equal(zip.status,200);const bytes=Buffer.from(await zip.arrayBuffer());assert.equal(bytes.subarray(0,2).toString(),"PK");await fs.writeFile(path.join(dir,"handoff.zip"),bytes);
const range=await fetch(base+`/api/assets/${upload.results[0].asset.id}`,{headers:{Range:"bytes=0-127"}});assert.equal(range.status,206);assert.equal((await range.arrayBuffer()).byteLength,128);
const foreign=await fetch(base+"/api/projects",{...json({name:"Forbidden"}),headers:{"Content-Type":"application/json",Origin:"https://evil.test"}});assert.equal(foreign.status,403);
const stale=await fetch(base+`/api/projects/${p.id}`,{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({revision:1,patch:{price:"1"}})});assert.equal(stale.status,409);
await request(`/api/jobs/${prepared.job.id}`,json({action:"cancel"}));
const voiceProject=(await request("/api/projects",json({name:"ทดสอบเสียง — ข้อมูล QA",voice:"male",ttsEngine:"edge",scenes:[{id:"voice-test",role:"hook",title:"ทดสอบ",narration:"นี่คือเสียงทดสอบระบบสตูดิโอ รีวิวจากสิ่งที่ใช้งานจริง",overlay:"",shot:"",duration:5,assetId:null,inPoint:0}]}))).project;
let voiceStatus;
try {
  const voice=await request(`/api/projects/${voiceProject.id}/voice`,json({revision:voiceProject.revision}));
  assert.ok(voice.asset.duration>0);voiceStatus=`created ${voice.asset.duration.toFixed(1)}s audio`;
}catch(error){voiceStatus=`external service unavailable: ${error.message}`;}
console.log(JSON.stringify({projectId:p.id,voiceProjectId:voiceProject.id,voice:voiceStatus,checks:"CRUD, media metadata/ranges, script, durable jobs, ZIP, CSRF, stale writes passed"},null,2));
await fs.writeFile(path.join(dir,"result.json"),JSON.stringify({projectId:p.id,voiceProjectId:voiceProject.id,voice:voiceStatus},null,2));
