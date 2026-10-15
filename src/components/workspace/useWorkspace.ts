'use client';
import {useEffect,useRef,useState} from 'react';
import {freshWorkspace,newScene,parseWorkspace,Scene,WorkspaceProject} from '@/lib/workspace/types';
import {prepareSpeech} from '@/lib/workspace/pronunciation';import {narrationHash} from '@/lib/workspace/hash';
const DRAFT='unified-workspace-v2',JOB='unified-workspace-job-v2';
export async function request(url:string,body?:unknown){const r=await fetch(url,body===undefined?undefined:{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});const data=await r.json();if(!r.ok)throw new Error(data.error||'ดำเนินการไม่สำเร็จ');return data;}
type Job={id:string;projectId:string;kind:'narration'|'render'|'sample';progress:number;message:string};
export function useWorkspace(){
 const [project,setProject]=useState<WorkspaceProject|null>(null),[selected,setSelected]=useState(''),[notice,setNotice]=useState(''),[error,setError]=useState(''),[busy,setBusy]=useState(''),[job,setJob]=useState<Job|null>(null),[output,setOutput]=useState<any>(null),[sample,setSample]=useState(''),[saved,setSaved]=useState(''),[history,setHistory]=useState<WorkspaceProject[]>([]);
 const current=useRef(project);current.current=project;
 useEffect(()=>{let p=freshWorkspace();try{const raw=localStorage.getItem(DRAFT);if(raw)p=parseWorkspace(JSON.parse(raw));}catch{setError('แบบร่างเดิมอ่านไม่ได้ เปิดโปรเจกต์ที่บันทึกไว้ได้จากรายการ');}setProject(p);setSelected(p.scenes[0]?.id||'');try{const j=JSON.parse(localStorage.getItem(JOB)||'null');if(j?.projectId===p.id)setJob(j);}catch{}},[]);
 useEffect(()=>{if(!project)return;try{localStorage.setItem(DRAFT,JSON.stringify(project));}catch{setError('พื้นที่แบบร่างเต็ม กรุณากดบันทึกโปรเจกต์');}},[project]);
 useEffect(()=>{if(!job)return;localStorage.setItem(JOB,JSON.stringify(job));let stopped=false;const poll=async()=>{try{const data=await request(`/api/studio/jobs?id=${job.id}`);if(stopped)return;if(data.status==='processing'){setJob(j=>j?{...j,progress:data.progress||0,message:data.message||'กำลังทำงาน'}:null);return;}
 localStorage.removeItem(JOB);setJob(null);if(data.status==='error'){setError(data.error);return;}
 if(job.kind==='render'){setOutput(data);setNotice('ส่งออกสำเร็จ พร้อมดาวน์โหลด');return;}
 if(job.kind==='sample'){setSample(data.artifacts?.[0]?.artifact?.url||'');if(data.errors?.length)setError(data.errors[0].message);return;}
 setProject(p=>{if(!p||p.id!==job.projectId)return p;return {...p,revision:p.revision+1,scenes:p.scenes.map(s=>{const found=data.artifacts?.find((a:any)=>a.sceneId===s.id)?.artifact;return found&&found.inputHash===narrationHash(s,p.voice,prepareSpeech(s.displayText,p.pronunciation))?{...s,narration:found}:s;})};});
 if(data.errors?.length)setError(data.errors.map((e:any)=>e.message).join(' • '));else setNotice('สร้างเสียงแล้ว ลองฟังก่อนส่งออก');
 }catch(e:any){if(!stopped)setError(`ตรวจสถานะงานไม่ได้: ${e.message} ระบบจะลองอีกครั้ง`);}};void poll();const timer=setInterval(poll,2000);return()=>{stopped=true;clearInterval(timer);};},[job?.id]);
 function edit(change:Partial<WorkspaceProject>|((p:WorkspaceProject)=>WorkspaceProject)){const p=current.current;if(!p)return;setHistory(h=>[...h.slice(-19),p]);const next=typeof change==='function'?change(p):{...p,...change};next.revision=p.revision+1;current.current=next;setProject(next);setSaved('');setOutput(null);}
 function updateScene(id:string,patch:Partial<Scene>){edit(p=>({...p,scenes:p.scenes.map(s=>s.id===id?{...s,...patch}:s)}));}
 async function run(fn:()=>Promise<void>,label:string){setError('');setBusy(label);try{await fn();}catch(e:any){setError(e.message);}finally{setBusy('');}}
 async function upload(files:FileList|null){if(!files||!project)return;await run(async()=>{for(const file of Array.from(files)){if((current.current?.assets.length||0)>=20)throw Error('เพิ่มได้สูงสุด 20 ไฟล์');const form=new FormData();form.append('file',file);const r=await fetch('/api/workspace/media',{method:'POST',body:form}),data=await r.json();if(!r.ok)throw Error(data.error);const scene=newScene(data.asset);edit(p=>({...p,assets:[...p.assets,data.asset],scenes:[...p.scenes,scene]}));setSelected(scene.id);}setNotice('เพิ่มสื่อแล้ว เลือกฉากเพื่อเขียนบทหรือจัดร่างจากข้อมูลสินค้า');},'กำลังเพิ่มสื่อ');}
 async function save(){if(project)await run(async()=>{await request('/api/workspace/projects',project);setSaved('บันทึกแล้ว');setNotice('บันทึกโปรเจกต์แล้ว');},'กำลังบันทึก');}
 async function load(id:string,source:string){await run(async()=>{const data=await request(`/api/workspace/projects?id=${encodeURIComponent(id)}&source=${source}`);const p=parseWorkspace(data.project);setProject(p);current.current=p;setSelected(p.scenes[0]?.id||'');setHistory([]);setOutput(null);setNotice(data.warnings?.join(' • ')||'เปิดโปรเจกต์แล้ว');},'กำลังเปิดโปรเจกต์');}
 async function start(kind:'narration'|'render'|'sample',ids?:string[],sampleText?:string){if(!project)return;await run(async()=>{let p=project,sceneIds=ids||project.scenes.filter(s=>s.audioMode!=='original'&&s.displayText.trim()&&s.narration?.inputHash!==narrationHash(s,project.voice,prepareSpeech(s.displayText,project.pronunciation))).map(s=>s.id);
 if(kind==='sample'){const asset=project.assets[0]||{id:'preview',name:'preview',url:'/uploads/preview.png',kind:'image' as const,width:1080,height:1080,durationFrames:0,hasAudio:false,captions:[]};const s={...newScene(asset),displayText:sampleText||'สวัสดีค่ะ นี่คือตัวอย่างเสียงสำหรับคลิปสินค้าของคุณ',audioMode:'narration' as const};p={...project,assets:[asset],scenes:[s],legacyAudio:undefined};sceneIds=[s.id];}
 if(kind!=='render'&&!sceneIds.length){setNotice('เสียงทุกฉากเป็นเวอร์ชันล่าสุดแล้ว หรือยังไม่มีบทพากย์');return;}
 const data=await request(kind==='render'?'/api/workspace/render':'/api/workspace/narration',kind==='render'?{project:p}:{project:p,sceneIds});setJob({id:data.id,projectId:project.id,kind,progress:0,message:kind==='render'?'กำลังเตรียมส่งออก':'กำลังเตรียมเสียง'});setOutput(null);
 },'กำลังเริ่มงาน');}
 function undo(){const prev=history.at(-1);if(prev){setProject(prev);current.current=prev;setHistory(h=>h.slice(0,-1));setOutput(null);setSaved('');}}
 return {project,selected,setSelected,edit,updateScene,upload,save,load,start,run,undo,canUndo:!!history.length,notice,setNotice,error,setError,busy,job,output,sample,saved,reset:()=>{const p=freshWorkspace();setProject(p);current.current=p;setSelected('');setHistory([]);setOutput(null);}};
}
