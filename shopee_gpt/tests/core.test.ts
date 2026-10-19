import { test, after } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";
import ffmpeg from "ffmpeg-static";

const isolated=mkdtempSync(path.join(os.tmpdir(),"shopee-gpt-test-"));
process.env.STUDIO_DATA_DIR=isolated;
const {db,createProject,getProject,updateProject,listProjects,deleteAsset,StudioError}=await import("../src/lib/db");
const {projectInput,projectPatch,readiness}=await import("../src/lib/schema");
const {ingest,mediaResponse}=await import("../src/lib/media");
const {prepareJob,completeJob,cancelJob,validCapcutUrl}=await import("../src/lib/capcut");
const {subtitles}=await import("../src/lib/export");
const {classify,recordIssue,listIssues}=await import("../src/lib/issues");
const {decodeGeminiAudio,geminiSpeech,GEMINI_TTS_MODEL}=await import("../src/lib/google-voice");
after(()=>{db.close();rmSync(isolated,{recursive:true,force:true});});

test("partial validation does not insert creation defaults and erase scripts",()=>{
  assert.deepEqual(projectPatch.parse({voice:"male"}),{voice:"male"});
  assert.deepEqual(projectPatch.parse({price:"199"}),{price:"199"});
  assert.deepEqual(projectPatch.parse({}),{});
});

test("durable CRUD preserves creation time and rejects stale writes",()=>{
  const p=createProject(projectInput.parse({name:"สินค้าทดสอบ"}));
  const updated=updateProject(p.id,{price:"590"},p.revision);
  assert.equal(updated.createdAt,p.createdAt);
  assert.equal(updated.revision,2);
  assert.throws(()=>updateProject(p.id,{price:"1"},1),e=>e instanceof StudioError&&e.status===409);
  updateProject(p.id,{archived:true});
  assert.equal(listProjects().some(x=>x.id===p.id),false);
  assert.equal(getProject(p.id).price,"590");
});
test("uploads inspect bytes, reject disguised files, and support video seek ranges",async()=>{
  const p=createProject(projectInput.parse({name:"ทดสอบไฟล์"}));
  await assert.rejects(ingest(p.id,"fake.mp4",Buffer.from("<script>alert(1)</script>")));
  const sample=path.join(isolated,"sample.mp4");
  execFileSync(ffmpeg!,["-y","-f","lavfi","-i","color=c=gray:s=240x426:d=4","-f","lavfi","-i","anullsrc=r=44100:cl=mono","-shortest","-c:v","libx264","-pix_fmt","yuv420p","-c:a","aac",sample],{stdio:"ignore"});
  const fs=await import("node:fs/promises");
  const asset=await ingest(p.id,"test.mp4",await fs.readFile(sample));
  assert.equal(asset.kind,"video");assert.ok(asset.duration!>=4);assert.equal(asset.width,240);
  const range=await mediaResponse(asset.id,"bytes=0-99",false);
  assert.equal(range.status,206);assert.equal((await range.arrayBuffer()).byteLength,100);
  assert.equal((await mediaResponse(asset.id,"bytes=999999999-",false)).status,416);
  const suffix=await mediaResponse(asset.id,"bytes=-64",false);assert.equal((await suffix.arrayBuffer()).byteLength,64);
  deleteAsset(asset.id);
});
test("CapCut job is blocked until real media, script, rights and facts exist",async()=>{
  const p=createProject(projectInput.parse({name:"ยังไม่พร้อม"}));
  assert.ok(readiness(p).some(c=>!c.ok&&!c.optional));
  await assert.rejects(prepareJob(p.id),/ยังไม่พร้อม/);
});
test("CapCut completion validates URLs and never treats a prepared brief as completed",async()=>{
  assert.equal(validCapcutUrl("https://www.capcut.com/editor/real-provider-draft"),true);
  for(const bad of ["https://evil.test/editor/a","https://capcut.com.evil.test/editor/a","http://www.capcut.com/editor/a","javascript:alert(1)","https://www.capcut.com/"]) assert.equal(validCapcutUrl(bad),false);
  const p=createProject(projectInput.parse({name:"ทดสอบ CapCut"}));
  const sample=path.join(isolated,"image.png");
  execFileSync(ffmpeg!,["-y","-f","lavfi","-i","color=c=gray:s=240x426","-frames:v","1",sample],{stdio:"ignore"});
  const fs=await import("node:fs/promises");const a=await ingest(p.id,"qa.png",await fs.readFile(sample));
  updateProject(p.id,{verified:true,rightsConfirmed:true,voice:"original",scenes:["hook","demo","cta"].map((role,i)=>({id:String(i),role:role as "hook"|"demo"|"cta",title:role,narration:"บททดสอบ",overlay:"",shot:"",duration:5,assetId:a.id,inPoint:0}))});
  const job=await prepareJob(p.id);assert.equal(job.state,"prepared");
  await assert.rejects(prepareJob(p.id),/มีงาน/);
  assert.throws(()=>completeJob(job.id,"not-real","https://evil.test/editor/1","bad"));
  await cancelJob(job.id);
  assert.throws(()=>completeJob(job.id,"not-real","https://www.capcut.com/editor/test","bad"),/ปิดไปแล้ว/);
});
test("SRT carries ordered millisecond timestamps",()=>{
  const srt=subtitles([{duration:1.25,narration:"หนึ่ง"},{duration:2,narration:"สอง"}]);
  assert.match(srt,/00:00:00,000 --> 00:00:01,250/);
  assert.match(srt,/00:00:01,250 --> 00:00:03,250/);
});
test("diagnostics identify actionable failures and redact keys",()=>{
  const previous=process.env.STUDIO_TEST_API_KEY;process.env.STUDIO_TEST_API_KEY="private-test-credential-12345";
  try{
    const issue=recordIssue(classify(new StudioError("RESOURCE_EXHAUSTED quota private-test-credential-12345",429),"gemini-tts"));
    assert.equal(issue.code,"PROVIDER_QUOTA");assert.ok(!JSON.stringify(listIssues()).includes("private-test-credential-12345"));
    assert.match(issue.details,/REDACTED/);
    assert.equal(classify(new Error("database is locked")).code,"DATABASE_BUSY");
    assert.equal(classify(new Error("Consent flow failed")).code,"VOICE_CONSENT_MISMATCH");
  }finally{if(previous===undefined)delete process.env.STUDIO_TEST_API_KEY;else process.env.STUDIO_TEST_API_KEY=previous;}
});
test("Gemini 3.8 TTS uses exact model, separate style metadata and cloned voice ID",async()=>{
  const oldFetch=globalThis.fetch,oldKey=process.env.GEMINI_API_KEY;process.env.GEMINI_API_KEY="test-key-never-sent";
  const wav=Buffer.alloc(48);wav.write("RIFF");wav.write("WAVE",8);
  let captured:any;
  globalThis.fetch=async(_url,init)=>{captured=JSON.parse(String(init?.body));return Response.json({steps:[{type:"model_output",content:[{type:"audio",data:wav.toString("base64")}]}]});};
  try{
    const result=await geminiSpeech("บทพูดทดสอบ","voice_existing123","อบอุ่น ไม่เร่งขาย");
    assert.equal(captured.model,GEMINI_TTS_MODEL);assert.equal(captured.model,"gemini-3.8-flash-tts");
    assert.equal(captured.generation_config.speech_config[0].voice,"voice_existing123");
    assert.equal(captured.input[0].content[0].text,"บทพูดทดสอบ");
    assert.equal(captured.input[0].content[0].annotations[0].style,"อบอุ่น ไม่เร่งขาย");
    assert.deepEqual(result,wav);assert.throws(()=>decodeGeminiAudio({steps:[]}),/ไม่มีข้อมูลเสียง/);
  }finally{globalThis.fetch=oldFetch;if(oldKey===undefined)delete process.env.GEMINI_API_KEY;else process.env.GEMINI_API_KEY=oldKey;}
});
