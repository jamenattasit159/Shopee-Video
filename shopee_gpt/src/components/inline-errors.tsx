"use client";
import {useEffect,useRef,useState} from "react";
import {AlertTriangle,X} from "lucide-react";
import type {ClientIssue} from "@/lib/client-api";
export default function InlineErrors(){
  const container=useRef<HTMLDivElement>(null),[issue,setIssue]=useState<ClientIssue|null>(null);
  useEffect(()=>{const dialog=container.current?.closest("dialog");const receive=(event:Event)=>{if(dialog?.open)setIssue((event as CustomEvent<ClientIssue>).detail);};const clear=()=>setIssue(null);window.addEventListener("studio:issue",receive);dialog?.addEventListener("close",clear);return()=>{window.removeEventListener("studio:issue",receive);dialog?.removeEventListener("close",clear);};},[]);
  return <div ref={container}>{issue&&<div className="alert alert-error alert-soft mb-5 items-start text-sm" role="alert"><AlertTriangle className="mt-0.5 size-4"/><div><p>{issue.message}</p><p className="mt-2 text-xs leading-relaxed">{issue.hint}</p><p className="mt-2 text-[10px]">{issue.code}</p></div><button className="btn btn-ghost btn-square btn-xs" aria-label="ปิดข้อผิดพลาดในหน้าต่าง" onClick={()=>setIssue(null)}><X className="size-3"/></button></div>}</div>;
}
