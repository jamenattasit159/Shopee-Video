"use client";
import { useId } from "react";
import { Film, ImageIcon, Music2, Play, Inbox, LoaderCircle } from "lucide-react";
import type { Asset } from "@/lib/schema";

export function Field({label,hint,children}:{label:string;hint?:string;children:React.ReactNode}){
  const id=useId();
  return <fieldset className="fieldset min-w-0 gap-2 p-0"><legend className="fieldset-legend pb-2 text-sm font-medium">{label}</legend>{children}{hint&&<p id={id} className="text-xs leading-relaxed text-base-content/70">{hint}</p>}</fieldset>;
}
export function Empty({title,description,children}:{title:string;description:string;children?:React.ReactNode}){
  return <div className="flex min-h-56 flex-col items-center justify-center px-6 py-12 text-center"><Inbox className="mb-5 size-8 text-base-content/50" strokeWidth={1.5}/><h3 className="text-lg font-semibold">{title}</h3><p className="mt-2 max-w-md text-sm leading-relaxed text-base-content/70">{description}</p>{children&&<div className="mt-6">{children}</div>}</div>;
}
export function Spinner(){return <LoaderCircle className="size-4 animate-spin" aria-hidden="true"/>;}
export function MediaThumb({asset,className=""}:{asset?:Asset;className?:string}){
  return <div className={`relative flex shrink-0 items-center justify-center overflow-hidden rounded-xl bg-base-300/40 ${className}`}>
    {asset?.thumbnail ? <img src={`/api/assets/${asset.id}?thumb=1`} alt={asset.name} loading="lazy" className="size-full object-cover"/> : asset?.kind==="image" ? <img src={`/api/assets/${asset.id}`} alt={asset.name} loading="lazy" className="size-full object-cover"/> : asset?.kind==="audio" ? <Music2 className="size-6 text-base-content/50"/> : asset?.kind==="video" ? <Film className="size-6 text-base-content/50"/> : <ImageIcon className="size-6 text-base-content/40"/>}
    {asset?.kind==="video"&&<span className="absolute right-1 bottom-1 flex items-center gap-1 rounded-lg bg-neutral/90 px-1.5 py-1 text-[10px] text-neutral-content"><Play className="size-2.5"/>{asset.duration ? `${asset.duration.toFixed(0)}s` : "วิดีโอ"}</span>}
  </div>;
}
export function fmtTime(seconds:number){return `${Math.floor(seconds/60)}:${Math.floor(seconds%60).toString().padStart(2,"0")}`;}
export function fileSize(size:number){return size<1024*1024?`${(size/1024).toFixed(0)} KB`:`${(size/1024/1024).toFixed(1)} MB`;}
