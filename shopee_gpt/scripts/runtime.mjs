import { existsSync,readFileSync,writeFileSync,mkdirSync,unlinkSync,appendFileSync } from "node:fs";
import path from "node:path";
import os from "node:os";
import { spawn, execFileSync } from "node:child_process";

const task = process.argv[2];
const runtimeDir=path.join(process.cwd(),".tmp");mkdirSync(runtimeDir,{recursive:true});
const productionLock=path.join(runtimeDir,"runtime-start.json");
if(task==="build"&&existsSync(productionLock)){
  let running=false;try{process.kill(JSON.parse(readFileSync(productionLock,"utf8")).pid,0);running=true;}catch{}
  if(running){console.error("BUILD_BLOCKED: production server is running. Stop npm start before npm run build, then restart it. npm run dev uses a separate output directory and can stay running.");process.exit(1);}
}
let node = process.execPath;
if (Number(process.versions.node.split(".")[0]) < 22) {
  const candidate = path.join(os.homedir(), ".cache", "codex-runtimes", "codex-primary-runtime", "dependencies", "node", "bin", process.platform === "win32" ? "node.exe" : "node");
  if (existsSync(candidate) && Number(execFileSync(candidate,["-p","process.versions.node.split('.')[0]"],{encoding:"utf8"}).trim()) >= 22) node = candidate;
  else { console.error("shopee_gpt requires Node.js 22.13+ (24 LTS recommended). Install Node LTS and retry."); process.exit(1); }
}
const args = {
  dev:["node_modules/next/dist/bin/next","dev","--hostname","127.0.0.1","--port",process.env.PORT || "3100"],
  start:["node_modules/next/dist/bin/next","start","--hostname","127.0.0.1","--port",process.env.PORT || "3100"],
  build:["node_modules/next/dist/bin/next","build"],
  typecheck:["node_modules/typescript/bin/tsc","--noEmit"],
  test:["--import","tsx","--test","tests/core.test.ts"],
  mcp:["--import","tsx","scripts/mcp.ts"]
}[task];
if(!args){console.error("Unknown runtime task");process.exit(1);}
const child=spawn(node,args,{stdio:["inherit","pipe","pipe"],windowsHide:true,env:{...process.env,STUDIO_DIST_DIR:task==="dev"?".next-dev":".next-production",PATH:`${path.dirname(node)}${path.delimiter}${process.env.PATH || ""}`}});
let tail="",intentional=false;
const pass=(chunk,output)=>{output.write(chunk);tail=(tail+chunk.toString()).slice(-1800);};
child.stdout.on("data",chunk=>pass(chunk,process.stdout));child.stderr.on("data",chunk=>pass(chunk,process.stderr));
if(task==="start")writeFileSync(productionLock,JSON.stringify({pid:process.pid,childPid:child.pid,startedAt:new Date().toISOString()}));
const cleanup=()=>{if(task==="start")try{const lock=JSON.parse(readFileSync(productionLock,"utf8"));if(lock.pid===process.pid)unlinkSync(productionLock);}catch{}};
child.on("error",error=>{console.error(error.message);process.exit(1);});
child.on("exit",code=>{
  cleanup();
  if(code!==0&&!intentional&&["dev","start"].includes(task)){
    const dir=path.join(process.env.STUDIO_DATA_DIR||path.join(process.cwd(),"data"),"diagnostics");
    try{mkdirSync(dir,{recursive:true});appendFileSync(path.join(dir,"issues.jsonl"),JSON.stringify({id:crypto.randomUUID(),code:/EADDRINUSE/.test(tail)?"PORT_IN_USE":"SERVER_EXIT",source:"runtime",severity:"error",message:/EADDRINUSE/.test(tail)?"พอร์ตถูกใช้โดยโปรแกรมอื่น":"เซิร์ฟเวอร์หยุดทำงาน",hint:"ตรวจข้อความ terminal และรัน npm run dev ใหม่ หากพอร์ตซ้ำ ให้ปิด process ของสตูดิโอเดิมก่อน",details:tail.replace(/AIza[\w-]{20,}/g,"[REDACTED]"),createdAt:new Date().toISOString(),resolved:false})+"\n");}catch{}
  }
  process.exit(code ?? 1);
});
process.on("SIGINT",()=>{intentional=true;child.kill("SIGINT");});
process.on("SIGTERM",()=>{intentional=true;child.kill("SIGTERM");});
process.on("exit",cleanup);
