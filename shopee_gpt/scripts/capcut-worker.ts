import { spawn } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";
import { db, dataDir, getJob, listJobs, saveJob, updateProject } from "../src/lib/db";
import { codexExecutable, completeJob, jobPrompt } from "../src/lib/capcut";
import { resultSchema } from "../src/lib/schema";
import {classify,recordIssue} from "../src/lib/issues";

const id=process.argv[2];
let claimed=false;
try {
  db.exec("BEGIN IMMEDIATE");
  const job=getJob(id);
  if(job.state!=="prepared" || listJobs().some(j=>j.state==="running")) throw new Error("Job already claimed");
  saveJob({...job,state:"running",message:"Codex กำลังอ่าน brief และเชื่อม CapCut"});
  db.exec("COMMIT");claimed=true;
  updateProject(job.projectId,{status:"editing"});
  const cli=codexExecutable();if(!cli) throw new Error("ไม่พบ Codex CLI");
  const dir=path.join(dataDir,"jobs",id);
  const schemaFile=path.join(dir,"result-schema.json"),resultFile=path.join(dir,"result.json");
  await fs.writeFile(schemaFile,JSON.stringify({type:"object",additionalProperties:false,properties:{success:{type:"boolean"},draftId:{type:["string","null"]},editUrl:{type:["string","null"]},message:{type:"string"}},required:["success","draftId","editUrl","message"]}));
  const child=spawn(cli,["exec","--json","--skip-git-repo-check","--sandbox","workspace-write","--cd",process.cwd(),"--output-schema",schemaFile,"--output-last-message",resultFile,"-"],{cwd:process.cwd(),windowsHide:true,env:process.env,stdio:["pipe","pipe","pipe"]});
  child.stdin.end(jobPrompt(job));
  let text="",toolEvidence="",stderrSeen=false;
  child.stderr.on("data",()=>{stderrSeen=true;});
  child.stdout.on("data",buffer=>{
    text+=buffer.toString();
    let index;
    while((index=text.indexOf("\n"))>=0){
      const line=text.slice(0,index);text=text.slice(index+1);
      try {
        const event=JSON.parse(line),item=event.item;
        if(item?.type==="mcp_tool_call" && /capcut/i.test(item.server || item.tool || "")) {
          if(item.status==="completed" && !item.error) toolEvidence+=JSON.stringify(item.result).slice(0,100000);
          const latest=getJob(id);
          if(latest.state==="running") saveJob({...latest,message:"Codex กำลังทำงานกับเครื่องมือ CapCut"});
        }
      }catch{}
    }
  });
  let timedOut=false,cancelled=false;
  const stop=()=>{
    if(process.platform==="win32" && child.pid) {
      spawn("taskkill.exe",["/PID",String(child.pid),"/T","/F"],{windowsHide:true,stdio:"ignore"});
    } else child.kill("SIGTERM");
  };
  const timer=setTimeout(()=>{timedOut=true;stop();},20*60*1000);
  const poll=setInterval(()=>{ if(getJob(id).state==="cancelled"){cancelled=true;stop();} },2000);
  const code=await new Promise<number|null>((resolve,reject)=>{child.once("close",resolve);child.once("error",reject);}).finally(()=>{clearTimeout(timer);clearInterval(poll);});
  if(cancelled) process.exit(0);
  if(timedOut) throw new Error("หมดเวลารอ 20 นาที ตรวจ CapCut ก่อนเริ่มซ้ำเพื่อป้องกันงานซ้ำ");
  if(code!==0) throw new Error(`Codex หยุดก่อนส่งผล (exit ${code}) ${stderrSeen ? "ตรวจ CLI และสิทธิ์ CapCut ในแชต" : "ลองตรวจการเชื่อมต่อ"}`);
  const result=resultSchema.parse(JSON.parse(await fs.readFile(resultFile,"utf8")));
  if(!result.success || !result.draftId || !result.editUrl) throw new Error(result.message || "CapCut ยังไม่คืน draft ที่บันทึกสำเร็จ");
  if(!toolEvidence.includes(result.editUrl) || !toolEvidence.includes(result.draftId)) throw new Error("ยังยืนยันลิงก์ draft จากผลเครื่องมือ CapCut ไม่ได้ เปิดแชต Codex เพื่อตรวจและบันทึกผลจริง");
  completeJob(id,result.draftId,result.editUrl,result.message);
}catch(error){
  if(claimed)recordIssue(classify(error,"capcut-worker"));
  try{db.exec("ROLLBACK");}catch{}
  if(claimed){const job=getJob(id);if(job.state==="running"){saveJob({...job,state:"failed",message:error instanceof Error ? error.message.slice(0,1000) : "ตัวเชื่อมหยุดทำงาน"});updateProject(job.projectId,{status:"draft"});}}
  process.exitCode=1;
}
