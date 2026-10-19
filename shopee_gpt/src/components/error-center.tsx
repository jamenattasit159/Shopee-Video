"use client";
import {useEffect,useRef,useState} from "react";
import {AlertTriangle,Check,Copy,RefreshCw,WifiOff,X} from "lucide-react";
import {flushIssues,pendingIssues,reportClientIssue,type ClientIssue} from "@/lib/client-api";

export default function ErrorCenter(){
  const [issues,setIssues]=useState<ClientIssue[]>([]),[offline,setOffline]=useState(false),[loading,setLoading]=useState(false),[copied,setCopied]=useState(false),[systemProblem,setSystemProblem]=useState("");
  const dialog=useRef<HTMLDialogElement>(null),online=useRef(true),lastAssetError=useRef("");
  const refresh=async()=>{
    setLoading(true);
    try{
      const response=await fetch("/api/health",{signal:AbortSignal.timeout(8000),cache:"no-store"});if(!response.ok)throw new Error(`HTTP ${response.status}`);
      const health=await response.json();setSystemProblem([health.database?.ok===false?health.database.message:"",health.storage?.ok===false?health.storage.message:""].filter(Boolean).join(" · "));setOffline(false);online.current=true;await flushIssues();
      const errors=await fetch("/api/errors",{signal:AbortSignal.timeout(5000),cache:"no-store"});if(errors.ok){const data=await errors.json();setIssues([...data.issues,...pendingIssues()]);}
    }catch(error){
      setOffline(true);
      if(online.current){online.current=false;reportClientIssue({code:"SERVER_UNREACHABLE",source:"health-monitor",message:"ขาดการเชื่อมต่อกับสตูดิโอ",hint:"เปิด terminal ที่ shopee_gpt แล้วรัน npm run dev จากนั้นกดตรวจอีกครั้ง ข้อมูลที่บันทึกแล้วอยู่ใน data",details:String(error)});}
    }finally{setLoading(false);}
  };
  useEffect(()=>{
    setIssues(pendingIssues());void refresh();
    const receive=(event:Event)=>{const issue=(event as CustomEvent<ClientIssue>).detail;setIssues(previous=>[issue,...previous.filter(i=>i.id!==issue.id)].slice(0,200));};
    const crash=(event:ErrorEvent)=>{
      const target=event.target as HTMLElement|null;
      if(target&&target!==document.documentElement&&target.tagName){
        const url=(target as HTMLScriptElement).src||(target as HTMLLinkElement).href||"";
        if(!url||lastAssetError.current===url)return;lastAssetError.current=url;
        reportClientIssue({code:"ASSET_LOAD_FAILED",source:"browser-resource",message:"โหลดไฟล์หน้าเว็บหรือสื่อไม่สำเร็จ",hint:"ถ้าเพิ่งอัปเดตระบบ ให้โหลดหน้าใหม่ หากเป็นวิดีโอ ให้ตรวจ codec หรือไฟล์ต้นฉบับ",details:url.split("?")[0]});return;
      }
      reportClientIssue({code:/chunk|dynamically imported/i.test(event.message)?"BUILD_CHUNK_MISMATCH":"BROWSER_CRASH",source:"browser",message:event.message||"หน้าเว็บเกิดข้อผิดพลาด",hint:"บันทึกรายงานแล้วโหลดหน้าใหม่ ถ้าเพิ่ง build ให้รีสตาร์ต npm start เพื่อใช้ build รุ่นเดียวกัน",details:event.error?.stack||""});
    };
    const rejected=(event:PromiseRejectionEvent)=>reportClientIssue({code:"UNHANDLED_REJECTION",source:"browser",message:String(event.reason?.message||event.reason),details:event.reason?.stack||""});
    const connection=()=>void refresh();
    window.addEventListener("studio:issue",receive);window.addEventListener("error",crash,true);window.addEventListener("unhandledrejection",rejected);window.addEventListener("online",connection);window.addEventListener("offline",connection);
    const timer=setInterval(()=>void refresh(),15000);
    return()=>{clearInterval(timer);window.removeEventListener("studio:issue",receive);window.removeEventListener("error",crash,true);window.removeEventListener("unhandledrejection",rejected);window.removeEventListener("online",connection);window.removeEventListener("offline",connection);};
  },[]);
  const unresolved=issues.filter(i=>!i.resolved);
  return <>
    {(offline||systemProblem)&&<div className="fixed inset-x-0 bottom-0 z-40 border-t border-error/40 bg-base-100 p-4 shadow-sm" role="alert"><div className="mx-auto flex max-w-5xl flex-wrap items-center gap-3"><WifiOff className="size-5 text-error"/><div className="flex-1"><p className="text-sm font-medium">{offline?"ติดต่อสตูดิโอไม่ได้":systemProblem}</p><p className="mt-1 text-xs text-base-content/75">{offline?"เปิด terminal ของ shopee_gpt แล้วรัน npm run dev · ข้อมูลที่บันทึกไว้ยังอยู่บนเครื่อง":"เปิดศูนย์ข้อผิดพลาดเพื่อดูสาเหตุและวิธีแก้ อย่าสร้างข้อมูลใหม่ทับฐานข้อมูลเดิม"}</p></div><button className="btn btn-outline btn-sm" disabled={loading} onClick={()=>void refresh()}><RefreshCw className="size-4"/>ตรวจอีกครั้ง</button></div></div>}
    <button className={`btn btn-sm gap-2 ${unresolved.length?"btn-warning":"btn-ghost"}`} aria-label={`ศูนย์ข้อผิดพลาด ${unresolved.length} รายการ`} onClick={()=>{dialog.current?.showModal();void refresh();}}><AlertTriangle className="size-4"/><span className="hidden sm:inline">ข้อผิดพลาด</span>{unresolved.length>0&&<span className="badge badge-sm">{unresolved.length}</span>}</button>
    <dialog className="modal" ref={dialog}><div className="modal-box max-w-3xl rounded-2xl"><div className="mb-5 flex items-start justify-between gap-4"><div><h2 className="text-xl font-semibold">เกิดอะไรขึ้นกับระบบ</h2><p className="mt-2 text-xs leading-relaxed text-base-content/70">สาเหตุ ขั้นตอนที่เกิด และแนวทางแก้ · ตัด API key และข้อมูลลับออกจากรายงาน</p></div><button className="btn btn-ghost btn-square btn-sm" aria-label="ปิดศูนย์ข้อผิดพลาด" onClick={()=>dialog.current?.close()}><X className="size-4"/></button></div>
      <div className="mb-5 flex flex-wrap gap-2"><button className="btn btn-outline btn-sm" disabled={loading} onClick={()=>void refresh()}><RefreshCw className="size-4"/>โหลดสถานะ</button><button className="btn btn-outline btn-sm" onClick={()=>void navigator.clipboard.writeText(JSON.stringify({time:new Date().toISOString(),online:!offline,issues},null,2)).then(()=>setCopied(true)).catch(()=>setCopied(false))}>{copied?<Check className="size-4"/>:<Copy className="size-4"/>}{copied?"คัดลอกแล้ว":"คัดลอกรายงาน"}</button></div>
      <div className="max-h-[60vh] space-y-3 overflow-y-auto">{!issues.length?<div className="rounded-xl bg-base-200 p-8 text-center text-sm text-base-content/70">ยังไม่พบข้อผิดพลาดที่บันทึกไว้</div>:issues.map(issue=><article key={issue.id} className={`rounded-xl border p-4 ${issue.resolved?"border-base-300/60 opacity-65":"border-warning/35"}`}><div className="mb-2 flex flex-wrap items-center gap-2"><span className="badge badge-ghost badge-xs">{issue.code}</span><span className="text-[11px] text-base-content/65">{new Date(issue.createdAt).toLocaleString("th-TH")}</span><span className="ml-auto text-[11px]">{issue.resolved?"รับทราบแล้ว":"ยังไม่รับทราบ"}</span></div><h3 className="text-sm font-medium">{issue.message}</h3><p className="mt-2 text-xs leading-relaxed text-base-content/75">วิธีแก้: {issue.hint}</p><p className="mt-2 break-all text-[11px] text-base-content/65">ขั้นตอน: {issue.source}</p><details className="mt-3"><summary className="cursor-pointer text-xs text-base-content/70">รายละเอียดสำหรับตรวจสอบ</summary><pre className="mt-2 overflow-auto whitespace-pre-wrap break-all rounded-xl bg-base-200 p-3 text-xs">{issue.details||"ไม่มีรายละเอียดเพิ่มเติม"}</pre></details>{!issue.resolved&&<button className="btn btn-ghost btn-xs mt-3" onClick={()=>void(async()=>{try{if(!issue.local){const r=await fetch("/api/errors",{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({ids:[issue.id]})});if(!r.ok)throw new Error("ack failed");}else localStorage.setItem("studio.pendingIssues",JSON.stringify(pendingIssues().filter(i=>i.id!==issue.id)));setIssues(prev=>prev.map(i=>i.id===issue.id?{...i,resolved:true}:i));}catch{reportClientIssue({code:"ACK_FAILED",source:"error-center",message:"รับทราบข้อผิดพลาดไม่ได้ เพราะเซิร์ฟเวอร์ยังไม่พร้อม"});}})()}><Check className="size-3"/>รับทราบ</button>}</article>)}</div>
    </div><form method="dialog" className="modal-backdrop"><button>ปิด</button></form></dialog>
  </>;
}
