"use client";

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Player, PlayerRef } from "@remotion/player";
import { ArrowDown, ArrowLeft, ArrowUp, Captions, Check, Download, Film, Plus, Save, Scissors, Trash2, Undo2, Upload, Volume2 } from "lucide-react";
import { CreatorVideo } from "../../../../remotion/CreatorVideo";
import { AssetSchema, clipFrames, FPS, parseSrt, ProjectSchema, projectFrames, speechRanges, StudioCaption, StudioProject, studioSrt, timelineCaptions } from "@/lib/studio";

const DRAFT_KEY = "creator-studio-draft-v1";
const JOB_KEY = "creator-studio-job-v1";
const freshProject = (): StudioProject => ({ id: crypto.randomUUID(), name: "คลิปสินค้าใหม่", assets: [], clips: [], audio: "original", captionStyle: "clean", headline: "", cta: "" });
type Job = { id: string; kind: "render" | "transcribe"; status: string; progress: number; message?: string; error?: string; assetId?: string; captions?: StudioCaption[]; videoUrl?: string; srtUrl?: string };
type SavedProject = { id: string; name: string };
async function request(url: string, init?: RequestInit) {
  const res = await fetch(url, init);
  const data = await res.json();
  if (!res.ok) throw Object.assign(new Error(data.error || "ทำรายการไม่ได้ กรุณาลองใหม่"), { status: res.status });
  return data;
}
function downloadText(text: string, name: string, type: string) {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const a = document.createElement("a"); a.href = url; a.download = name; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
}
const time = (s: number) => `${Math.floor(s / 60)}:${(s % 60).toFixed(1).padStart(4, "0")}`;

export default function StudioPage() {
  const [project, setProject] = useState<StudioProject | null>(null);
  const projectRef = useRef<StudioProject | null>(null);
  const [activeStep, setActiveStep] = useState("media");
  const [selected, setSelected] = useState<string>("");
  const [saved, setSaved] = useState<SavedProject[]>([]);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [uploading, setUploading] = useState(false);
  const [starting, setStarting] = useState(false);
  const [pollRevision, setPollRevision] = useState(0);
  const [saving, setSaving] = useState(false);
  const [job, setJob] = useState<Job | null>(null);
  const [result, setResult] = useState<Job | null>(null);
  const [saveState, setSaveState] = useState("กำลังเปิดแบบร่าง");
  const [historyCount, setHistoryCount] = useState(0);
  const history = useRef<StudioProject[]>([]);
  const sourceVideo = useRef<HTMLVideoElement>(null);
  const player = useRef<PlayerRef>(null);
  const [sourceTime, setSourceTime] = useState(0);
  const [srtInput, setSrtInput] = useState("");
  const [pendingAction, setPendingAction] = useState<string | null>(null);
  const currentClip = project?.clips.find(c => c.id === selected) || project?.clips[0];
  const asset = project?.assets.find(a => a.id === currentClip?.assetId);
  const busy = uploading || saving || starting || job?.status === "processing";
  const frames = project ? projectFrames(project) : 1;
  const validation = project ? ProjectSchema.safeParse(project) : null;
  const valid = validation?.success;

  function edit(next: StudioProject | ((p: StudioProject) => StudioProject)) {
    const prev = projectRef.current;
    if (!prev) return;
    history.current = [...history.current.slice(-29), prev]; setHistoryCount(history.current.length);
    const value = typeof next === "function" ? next(prev) : next;
    projectRef.current = value; setProject(value); setResult(null); setNotice("");
  }
  function replace(next: StudioProject) { history.current = []; setHistoryCount(0); projectRef.current = next; setProject(next); setSelected(next.clips[0]?.id || ""); setResult(null); setError(""); }
  useEffect(() => {
    let initial = freshProject();
    try { const raw = localStorage.getItem(DRAFT_KEY); if (raw) initial = ProjectSchema.parse(JSON.parse(raw)); }
    catch { setNotice("แบบร่างเดิมอ่านไม่ได้ เริ่มโปรเจกต์ใหม่ให้แล้ว"); }
    replace(initial);
    try { const rawJob = localStorage.getItem(JOB_KEY); if (rawJob) setJob(JSON.parse(rawJob)); } catch { /* A corrupt job never prevents opening the editor. */ }
    request("/api/studio/projects").then(d => setSaved(d.projects)).catch(e => setError(e.message));
  }, []);
  useEffect(() => {
    if (!project) return;
    setSaveState("กำลังบันทึกแบบร่าง");
    const timer = setTimeout(() => {
      try { localStorage.setItem(DRAFT_KEY, JSON.stringify(project)); setSaveState("เก็บแบบร่างในเครื่องแล้ว"); }
      catch { setSaveState("พื้นที่แบบร่างเต็ม — กดบันทึกโปรเจกต์"); }
    }, 500);
    return () => clearTimeout(timer);
  }, [project]);
  useEffect(() => {
    if (!job || job.status !== "processing") return;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout>;
    const poll = async () => {
      try {
        const next: Job = await request(`/api/studio/jobs?id=${job.id}`);
        if (cancelled) return;
        setJob(next);
        if (next.status === "complete") {
          localStorage.removeItem(JOB_KEY);
          if (next.kind === "transcribe" && next.captions) {
            const checked = next.captions.map(c => ({ ...c, id: String(c.id) }));
            edit(p => ({ ...p, assets: p.assets.map(a => a.id === next.assetId ? { ...a, captions: checked } : a) }));
            setNotice(checked.length ? "ถอดเสียงแล้ว ตรวจคำสินค้าและเวลาซับก่อนส่งออก" : "ไม่พบคำพูดในคลิปนี้ เพิ่มซับเองหรือนำเข้า SRT ได้");
          } else { setResult(next); setNotice("ส่งออกสำเร็จ ดาวน์โหลดวิดีโอและซับได้แล้ว"); }
        } else if (next.status === "error") { localStorage.removeItem(JOB_KEY); setError(next.error || "ประมวลผลไม่สำเร็จ"); }
        else timer = setTimeout(poll, 1500);
      } catch (e: any) {
        if (!cancelled) {
          if (e.status === 404) { localStorage.removeItem(JOB_KEY); setJob({ ...job, status: "error" }); setError("ไม่พบงานเดิม เริ่มประมวลผลใหม่ได้"); }
          else setError(`${e.message} — กดตรวจสถานะอีกครั้ง`);
        }
      }
    };
    poll();
    return () => { cancelled = true; clearTimeout(timer); };
  }, [job?.id, job?.status, pollRevision]);

  async function upload(files: FileList | null) {
    if (!files?.length || !project) return;
    setUploading(true); setError("");
    try {
      if (project.assets.length + files.length > 20) throw new Error("เพิ่มได้สูงสุด 20 คลิปต่อโปรเจกต์");
      for (const file of Array.from(files)) {
        if (file.size > 200 * 1024 * 1024) throw new Error(`${file.name}: ไฟล์ต้องไม่เกิน 200 MB`);
        const form = new FormData(); form.set("file", file);
        const data = await request("/api/studio/media", { method: "POST", body: form });
        const a = AssetSchema.parse(data.asset);
        const clip = { id: crypto.randomUUID(), assetId: a.id, in: 0, out: Math.min(a.duration, 5), position: "center" as const };
        edit(p => ({ ...p, assets: [...p.assets, a], clips: [...p.clips, clip] })); setSelected(clip.id);
      }
      setNotice("เพิ่มคลิปแล้ว เริ่มต้นด้วย 5 วินาทีแรก ปรับช่วงตัดได้ในแท็บจัดคลิป");
    } catch (e: any) { setError(e.message); } finally { setUploading(false); }
  }
  function updateClip(patch: Partial<NonNullable<typeof currentClip>>) {
    if (currentClip) edit(p => ({ ...p, clips: p.clips.map(c => c.id === currentClip.id ? { ...c, ...patch } : c) }));
  }
  function updateCue(id: string, patch: Partial<StudioCaption>) {
    if (asset) edit(p => ({ ...p, assets: p.assets.map(a => a.id === asset.id ? { ...a, captions: a.captions.map(c => c.id === id ? { ...c, ...patch } : c) } : a) }));
  }
  function move(index: number, direction: number) {
    edit(p => { const clips = [...p.clips]; [clips[index], clips[index + direction]] = [clips[index + direction], clips[index]]; return { ...p, clips }; });
  }
  function split() {
    if (!currentClip || sourceTime <= currentClip.in + 1 / FPS || sourceTime >= currentClip.out - 1 / FPS) { setError("เล่นต้นฉบับไปยังเวลาภายในช่วงตัด แล้วกดแยกช็อตอีกครั้ง"); return; }
    const cut = Math.round(sourceTime * FPS) / FPS;
    edit(p => ({ ...p, clips: p.clips.flatMap(c => c.id === currentClip.id ? [{ ...c, out: cut }, { ...c, id: crypto.randomUUID(), in: cut }] : [c]) }));
  }
  async function start(kind: "render" | "transcribe") {
    if (!project || !valid) { setError("แก้ข้อมูลและช่วงตัดให้ถูกต้องก่อนประมวลผล"); return; }
    setError(""); setResult(null);
    setStarting(true);
    try {
      const data = await request("/api/studio/jobs", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(kind === "render" ? { kind, project } : { kind, asset }) });
      const next: Job = { id: data.id, status: "processing", progress: 0, kind };
      localStorage.setItem(JOB_KEY, JSON.stringify(next)); setJob(next);
    } catch (e: any) { setError(e.message); } finally { setStarting(false); }
  }
  async function saveProject() {
    if (!project) return;
    setSaving(true); setError("");
    try { await request("/api/studio/projects", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(project) }); setSaved((await request("/api/studio/projects")).projects); setNotice("บันทึกโปรเจกต์แล้ว เปิดกลับมาแก้ต่อได้"); }
    catch (e: any) { setError(e.message); } finally { setSaving(false); }
  }
  async function openProject(id: string, confirmed = false) {
    if (!id) return;
    if (!confirmed && project?.clips.length && id !== project.id) { setPendingAction(id); return; }
    try { replace(ProjectSchema.parse((await request(`/api/studio/projects?id=${id}`)).project)); setNotice("เปิดโปรเจกต์แล้ว"); } catch (e: any) { setError(e.message); }
  }

  if (!project) return <main data-theme="dark" className="min-h-screen bg-base-100 p-8"><div className="skeleton mx-auto h-96 max-w-6xl" aria-label="กำลังเปิดพื้นที่ตัดต่อ" /></main>;
  const steps = [{ id: "media", label: "เพิ่มสื่อ", icon: Upload }, { id: "edit", label: "จัดคลิป", icon: Scissors }, { id: "captions", label: "เสียงและซับ", icon: Captions }, { id: "export", label: "ส่งออก", icon: Download }];
  return <main data-theme="dark" className="studio min-h-screen bg-base-100 text-base-content">
    {pendingAction && <div className="modal modal-open" role="dialog" aria-modal="true" aria-labelledby="draft-confirm-title" onKeyDown={e => { if (e.key === "Escape") setPendingAction(null); }}>
      <div className="modal-box rounded-2xl"><h2 id="draft-confirm-title" className="text-lg font-semibold">{pendingAction === "new" ? "เริ่มโปรเจกต์ใหม่?" : "เปิดโปรเจกต์อื่น?"}</h2><p className="mt-3 text-sm text-base-content/70">บันทึกโปรเจกต์ปัจจุบันก่อนหากต้องการเก็บการแก้ไข ไฟล์ต้นฉบับจะยังอยู่ในเครื่อง</p><div className="modal-action"><button autoFocus className="btn btn-ghost rounded-xl" onClick={() => setPendingAction(null)}>กลับไปบันทึก</button><button className="btn btn-primary rounded-xl" onClick={() => { const action = pendingAction; setPendingAction(null); if (action === "new") { replace(freshProject()); setActiveStep("media"); } else openProject(action, true); }}>ดำเนินการต่อ</button></div></div>
      <button className="modal-backdrop" aria-label="ปิดกล่องยืนยัน" onClick={() => setPendingAction(null)} />
    </div>}
    <header className="border-b border-base-300">
      <div className="mx-auto flex max-w-[1440px] flex-wrap items-center justify-between gap-4 px-4 py-4 sm:px-8">
        <div className="flex items-center gap-3"><Link href="/" className="btn btn-ghost btn-sm btn-square" aria-label="กลับหน้าสร้างคลิปจากรูป"><ArrowLeft size={18} /></Link><Film className="text-primary" size={24} /><div><h1 className="text-lg font-semibold">Creator Studio</h1><p className="text-xs text-base-content/60">ตัดต่อคลิปสินค้าจริง</p></div></div>
        <div className="flex flex-wrap items-center gap-2">
          <select aria-label="เปิดโปรเจกต์ที่บันทึก" className="select select-sm max-w-48 rounded-xl" value="" disabled={!!busy} onChange={e => openProject(e.target.value)}><option value="">เปิดโปรเจกต์…</option>{saved.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select>
          <button className="btn btn-ghost btn-sm" disabled={!!busy} onClick={() => { if (project.clips.length) { setPendingAction("new"); return; } replace(freshProject()); setActiveStep("media"); }}><Plus size={16} />ใหม่</button>
          <button className="btn btn-outline btn-sm rounded-xl" disabled={!!busy || !valid} onClick={saveProject}>{saving ? <span className="loading loading-spinner loading-xs" /> : <Save size={16} />}บันทึกโปรเจกต์</button>
        </div>
      </div>
    </header>
    <div className="mx-auto max-w-[1440px] px-4 py-6 sm:px-8 sm:py-8">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div><label htmlFor="project-name" className="mb-2 block text-sm text-base-content/60">ชื่อโปรเจกต์</label><input id="project-name" className="input input-ghost w-full max-w-lg px-0 text-2xl font-semibold sm:text-3xl" maxLength={120} value={project.name} disabled={!!busy} onChange={e => edit({ ...project, name: e.target.value })} /><p className="mt-2 text-xs text-base-content/60" role="status">{saveState}</p></div>
        <button className="btn btn-ghost btn-sm" disabled={!historyCount || !!busy} onClick={() => { const prev = history.current.pop(); if (prev) { projectRef.current = prev; setProject(prev); setHistoryCount(history.current.length); setResult(null); } }}><Undo2 size={16} />ย้อนกลับ</button>
      </div>
      {error && <div role="alert" className="alert alert-error mb-4 rounded-xl"><span>{error}</span><button className="btn btn-ghost btn-xs" onClick={() => setError("")}>ปิด</button></div>}
      {notice && <div role="status" className="alert mb-4 rounded-xl border-base-300 bg-base-200 text-sm"><Check size={18} /><span>{notice}</span></div>}
      {validation && !validation.success && <div className="alert alert-warning mb-4 rounded-xl text-sm" role="alert"><span>{validation.error.issues[0]?.message || "ตรวจข้อมูลโปรเจกต์อีกครั้ง"}</span></div>}
      {job?.status === "processing" && <section aria-live="polite" className="mb-6 space-y-3 rounded-2xl bg-base-200 p-4"><div className="flex items-center gap-3 text-sm"><span className="loading loading-spinner loading-sm" /><span>{job.message || (job.kind === "render" ? "กำลังเตรียมส่งออกวิดีโอ" : "กำลังเตรียมถอดเสียง")}</span><span className="ml-auto tabular-nums">{job.progress}%</span></div><progress className="progress progress-primary w-full" value={job.progress} max={100} /><p className="text-xs text-base-content/60">เปิดหน้านี้ใหม่ได้ ระบบจะตรวจสถานะงานต่อให้อัตโนมัติ</p>{error && <button className="btn btn-sm btn-outline" onClick={() => { setError(""); setPollRevision(v => v + 1); }}>ตรวจสถานะอีกครั้ง</button>}</section>}
      <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_360px] xl:grid-cols-[minmax(0,1fr)_420px]">
        <section className="min-w-0">
          <div role="tablist" aria-label="ขั้นตอนตัดต่อ" className="tabs tabs-border mb-6 flex flex-wrap">{steps.map(({ id, label, icon: Icon }) => <button key={id} role="tab" id={`tab-${id}`} aria-controls={`panel-${id}`} aria-selected={activeStep === id} className={`tab flex-1 gap-2 text-sm ${activeStep === id ? "tab-active" : ""}`} onClick={() => setActiveStep(id)}><Icon size={16} /><span>{label}</span></button>)}</div>
          <fieldset disabled={!!busy} className="min-w-0 space-y-6">
            {activeStep === "media" && <div role="tabpanel" id="panel-media" aria-labelledby="tab-media" className="space-y-6">
              <div><h2 className="text-xl font-semibold">เริ่มจากคลิปที่คุณถ่าย</h2><p className="mt-2 text-sm text-base-content/60">เพิ่มภาพใช้งานจริง รายละเอียดสินค้า หรือรีวิว ระบบจะเก็บไฟล์ต้นฉบับไว้</p></div>
              <label className="flex cursor-pointer flex-col items-center gap-3 rounded-2xl border border-dashed border-base-content/25 bg-base-200/40 p-8 text-center transition hover:border-primary"><Upload size={32} className="text-primary" /><span className="font-medium">เลือกคลิปสินค้าจากเครื่อง</span><span className="text-sm text-base-content/60">MP4, MOV, WebM • ไม่เกิน 200 MB และ 10 นาทีต่อไฟล์</span><input aria-label="อัปโหลดคลิปสินค้า" type="file" accept="video/mp4,video/quicktime,video/webm,.mp4,.mov,.webm" multiple className="file-input file-input-sm mt-2 w-full max-w-sm rounded-xl" onChange={e => { upload(e.target.files); e.target.value = ""; }} /></label>
              {uploading && <p className="flex items-center gap-2 text-sm" role="status"><span className="loading loading-spinner loading-sm" />กำลังอัปโหลดและตรวจไฟล์…</p>}
              {project.assets.length ? <div className="divide-y divide-base-300">{project.assets.map(a => <div key={a.id} className="flex flex-wrap items-center gap-4 py-4"><Film size={24} className="shrink-0 text-base-content/50" /><div className="min-w-0 flex-1"><p className="truncate text-sm font-medium">{a.name}</p><p className="mt-1 text-xs text-base-content/60">{time(a.duration)} • {a.width} × {a.height} • {a.hasAudio ? "มีเสียงต้นฉบับ" : "ไม่มีแทร็กเสียง"}</p></div><button className="btn btn-ghost btn-sm" onClick={() => { const c = { id: crypto.randomUUID(), assetId: a.id, in: 0, out: Math.min(a.duration, 5), position: "center" as const }; edit(p => ({ ...p, clips: [...p.clips, c] })); setSelected(c.id); setActiveStep("edit"); }}><Plus size={16} />เพิ่มช็อต</button><button className="btn btn-ghost btn-sm btn-square text-error" aria-label={`นำ ${a.name} ออกจากโปรเจกต์`} onClick={() => edit(p => ({ ...p, assets: p.assets.filter(x => x.id !== a.id), clips: p.clips.filter(c => c.assetId !== a.id) }))}><Trash2 size={16} /></button></div>)}</div> : <p className="text-sm text-base-content/60">ยังไม่มีสื่อ เพิ่มคลิปแรกเพื่อเริ่มตัดต่อ</p>}
              <button className="btn btn-primary rounded-xl" disabled={!project.clips.length} onClick={() => setActiveStep("edit")}>จัดคลิป<Scissors size={16} /></button>
            </div>}
            {activeStep === "edit" && <div role="tabpanel" id="panel-edit" aria-labelledby="tab-edit" className="space-y-6">
              <div><h2 className="text-xl font-semibold">จัดจังหวะของคลิป</h2><p className="mt-2 text-sm text-base-content/60">เลือกช็อต ปรับช่วงตัด และเรียงลำดับ วิดีโอแนวตั้งจะครอปตามตำแหน่งที่เลือก</p></div>
              <ShotList />
              {currentClip && asset ? <div className="space-y-4 border-t border-base-300 pt-6">
                <div className="flex items-center justify-between gap-3"><h3 className="min-w-0 truncate font-medium">ต้นฉบับ: {asset.name}</h3><span className="text-xs tabular-nums text-base-content/60">เวลาเล่น {sourceTime.toFixed(2)} วินาที</span></div>
                <video key={currentClip.id} ref={sourceVideo} src={asset.url} controls preload="metadata" className="max-h-64 w-full rounded-xl bg-neutral" onTimeUpdate={e => setSourceTime(e.currentTarget.currentTime)} onLoadedMetadata={e => { e.currentTarget.currentTime = currentClip.in; setSourceTime(currentClip.in); }} />
                <div className="grid grid-cols-2 gap-4"><label className="fieldset"><span className="fieldset-legend">เริ่ม (วินาที)</span><input className="input w-full rounded-xl" type="number" min={0} max={currentClip.out - 1 / FPS} step="0.01" value={Number(currentClip.in.toFixed(2))} onChange={e => updateClip({ in: Number(e.target.value) })} /><button className="btn btn-ghost btn-xs justify-start" disabled={sourceTime >= currentClip.out} onClick={() => updateClip({ in: Math.round(sourceTime * FPS) / FPS })}>ใช้เวลาเล่นเป็นจุดเริ่ม</button></label><label className="fieldset"><span className="fieldset-legend">จบ (วินาที)</span><input className="input w-full rounded-xl" type="number" min={currentClip.in + 1 / FPS} max={asset.duration} step="0.01" value={Number(currentClip.out.toFixed(2))} onChange={e => updateClip({ out: Number(e.target.value) })} /><button className="btn btn-ghost btn-xs justify-start" disabled={sourceTime <= currentClip.in} onClick={() => updateClip({ out: Math.round(sourceTime * FPS) / FPS })}>ใช้เวลาเล่นเป็นจุดจบ</button></label></div>
                <div className="flex flex-wrap items-center gap-3"><button className="btn btn-outline btn-sm rounded-xl" onClick={split}><Scissors size={16} />แยกช็อตตรงเวลาเล่น</button><label className="flex items-center gap-2 text-sm">ตำแหน่งครอป<select className="select select-sm rounded-xl" value={currentClip.position} onChange={e => updateClip({ position: e.target.value as "center" | "left" | "right" })}><option value="center">กลาง</option><option value="left">ซ้าย</option><option value="right">ขวา</option></select></label></div>
                <button className="btn btn-primary rounded-xl" onClick={() => setActiveStep("captions")}>ตั้งเสียงและซับ<Captions size={16} /></button>
              </div> : <EmptyClips />}
            </div>}
            {activeStep === "captions" && <div role="tabpanel" id="panel-captions" aria-labelledby="tab-captions" className="space-y-6">
              <div><h2 className="text-xl font-semibold">ให้เสียงและซับเล่าเรื่อง</h2><p className="mt-2 text-sm text-base-content/60">ซับผูกกับเวลาต้นฉบับ และจะตามช็อตเมื่อคุณตัดหรือเรียงใหม่</p></div>
              <div className="grid gap-4 sm:grid-cols-2"><label className="fieldset"><span className="fieldset-legend">เสียงวิดีโอ</span><select className="select w-full rounded-xl" value={project.audio} onChange={e => edit({ ...project, audio: e.target.value as "original" | "mute" })}><option value="original">ใช้เสียงต้นฉบับ</option><option value="mute">ปิดเสียง</option></select></label><label className="fieldset"><span className="fieldset-legend">รูปแบบซับ</span><select className="select w-full rounded-xl" value={project.captionStyle} onChange={e => edit({ ...project, captionStyle: e.target.value as StudioProject["captionStyle"] })}><option value="clean">เรียบ อ่านง่าย</option><option value="highlight">เน้นสีข้อความ</option><option value="none">ไม่ฝังซับในวิดีโอ</option></select></label></div>
              <label className="fieldset"><span className="fieldset-legend">เลือกคลิปต้นฉบับเพื่อแก้ซับ</span><select className="select w-full rounded-xl" value={currentClip?.id || ""} onChange={e => setSelected(e.target.value)}><option value="" disabled>ยังไม่มีช็อต</option>{project.clips.map((c, i) => <option key={c.id} value={c.id}>ช็อต {i + 1} — {project.assets.find(a => a.id === c.assetId)?.name}</option>)}</select></label>
              {asset ? <>
                <div className="flex flex-wrap gap-3"><button className="btn btn-primary rounded-xl" disabled={!asset.hasAudio} onClick={() => start("transcribe")}><Captions size={16} />{asset.captions.length ? "ถอดเสียงใหม่แทนซับเดิม" : "ถอดเสียงไทยอัตโนมัติ"}</button><button className="btn btn-outline rounded-xl" onClick={() => edit(p => ({ ...p, assets: p.assets.map(a => a.id === asset.id ? { ...a, captions: [...a.captions, { id: crypto.randomUUID(), start: currentClip?.in || 0, end: Math.min(asset.duration, (currentClip?.in || 0) + 2), text: "" }] } : a) }))}><Plus size={16} />เพิ่มซับเอง</button></div>
                <p className="text-xs leading-relaxed text-base-content/60">ถอดเสียงในเครื่อง ครั้งแรกใช้เวลาดาวน์โหลดโมเดล ตรวจชื่อสินค้าและคำไทยก่อนเผยแพร่{!asset.hasAudio ? " • คลิปนี้ไม่มีเสียง ใช้เพิ่มซับเองหรือนำเข้า SRT" : ""}</p>
                <div className="space-y-2 border-y border-base-300 py-4"><button className="btn btn-outline rounded-xl" disabled={!asset.captions.some(c => c.text.trim())} onClick={() => {
                  const ranges = speechRanges(asset);
                  if (!ranges.length) { setError("ไม่พบช่วงพูดที่จะใช้สร้างช็อต"); return; }
                  const clips = ranges.map(r => ({ ...r, id: crypto.randomUUID(), assetId: asset.id, position: currentClip!.position }));
                  const next = { ...project, clips: project.clips.flatMap(c => c.id === currentClip!.id ? clips : [c]) };
                  if (!ProjectSchema.safeParse(next).success) { setError("จำนวนช็อตหรือความยาวเกินกำหนด แบ่งต้นฉบับให้สั้นลงก่อน"); return; }
                  edit(next); setSelected(clips[0].id); setActiveStep("edit"); setNotice("สร้างช็อตตามช่วงพูดแล้ว ตรวจจังหวะและซับในพรีวิวได้ ย้อนกลับได้หากต้องการช่วงเดิม");
                }}><Scissors size={16} />สร้างช็อตจากช่วงพูดทั้งไฟล์</button><p className="text-xs leading-relaxed text-base-content/60">ใช้เวลาซับตัดช่วงว่างระหว่างคำพูด และแทนช็อตที่เลือกด้วยช่วงพูดจากต้นฉบับทั้งไฟล์ เหมาะกับคลิปรีวิวที่มีเสียงพูด</p></div>
                <details className="collapse collapse-arrow rounded-xl border border-base-300"><summary className="collapse-title text-sm font-medium">นำเข้าซับ SRT ของคลิปต้นฉบับ</summary><div className="collapse-content space-y-3"><label className="fieldset"><span className="fieldset-legend">วางเนื้อหาไฟล์ SRT</span><textarea className="textarea min-h-32 w-full rounded-xl" placeholder={"1\n00:00:00,000 --> 00:00:02,000\nข้อความซับ"} value={srtInput} onChange={e => setSrtInput(e.target.value)} /></label><button className="btn btn-outline btn-sm" disabled={!srtInput.trim()} onClick={() => { try { const captions = parseSrt(srtInput); if (captions.some(c => c.end > asset.duration)) throw new Error("เวลาซับเกินความยาวต้นฉบับ"); edit(p => ({ ...p, assets: p.assets.map(a => a.id === asset.id ? { ...a, captions } : a) })); setSrtInput(""); setNotice("นำเข้าซับแล้ว"); } catch (e: any) { setError(e.message); } }}>นำเข้าแทนซับเดิม</button></div></details>
                <div className="space-y-4">{asset.captions.length ? asset.captions.map((c, i) => <div key={c.id} className="grid grid-cols-[1fr_1fr_auto] gap-3 border-b border-base-300 pb-4"><label className="col-span-3 fieldset"><span className="fieldset-legend">ซับ {i + 1}</span><textarea className="textarea w-full rounded-xl" rows={2} maxLength={500} value={c.text} onChange={e => updateCue(c.id, { text: e.target.value })} /></label><label className="fieldset"><span className="fieldset-legend">เริ่ม (วินาทีต้นฉบับ)</span><input aria-label={`เวลาเริ่มซับ ${i + 1}`} type="number" min={0} max={asset.duration} step="0.01" className="input w-full rounded-xl" value={c.start} onChange={e => updateCue(c.id, { start: Number(e.target.value) })} /></label><label className="fieldset"><span className="fieldset-legend">จบ (วินาทีต้นฉบับ)</span><input aria-label={`เวลาจบซับ ${i + 1}`} type="number" min={0} max={asset.duration} step="0.01" className="input w-full rounded-xl" value={c.end} onChange={e => updateCue(c.id, { end: Number(e.target.value) })} /></label><button className="btn btn-ghost btn-square self-end text-error" aria-label={`ลบซับ ${i + 1}`} onClick={() => edit(p => ({ ...p, assets: p.assets.map(a => a.id === asset.id ? { ...a, captions: a.captions.filter(x => x.id !== c.id) } : a) }))}><Trash2 size={16} /></button></div>) : <p className="rounded-xl bg-base-200 p-4 text-sm text-base-content/60">ยังไม่มีซับ ถอดเสียงหรือนำเข้าซับเพื่อเริ่มต้น</p>}</div>
                <button className="btn btn-outline rounded-xl" onClick={() => { const mapped = timelineCaptions(project).find(c => c.id.startsWith(`${currentClip?.id}:`)); if (mapped) player.current?.seekTo(Math.round(mapped.start * FPS)); }}>พรีวิวซับช็อตนี้</button>
              </> : <EmptyClips />}
            </div>}
            {activeStep === "export" && <div role="tabpanel" id="panel-export" aria-labelledby="tab-export" className="space-y-6">
              <div><h2 className="text-xl font-semibold">พร้อมเผยแพร่</h2><p className="mt-2 text-sm text-base-content/60">ตรวจการครอปและซับในพรีวิว แล้วส่งออกวิดีโอแนวตั้ง</p></div>
              <label className="fieldset"><span className="fieldset-legend">ข้อความเปิดคลิป (ไม่บังคับ)</span><textarea className="textarea w-full rounded-xl" rows={2} maxLength={100} placeholder="ประโยคสั้น ๆ ที่ทำให้คนอยากดูต่อ" value={project.headline} onChange={e => edit({ ...project, headline: e.target.value })} /><span className="fieldset-label">แสดงใน 3 วินาทีแรก เว้นว่างเพื่อให้ฟุตเทจเล่าเรื่อง</span></label>
              <label className="fieldset"><span className="fieldset-legend">ข้อความปิดคลิป (ไม่บังคับ)</span><input className="input w-full rounded-xl" maxLength={100} placeholder="ดูรายละเอียดสินค้าในตะกร้า" value={project.cta} onChange={e => edit({ ...project, cta: e.target.value })} /></label>
              <dl className="grid grid-cols-2 gap-4 border-y border-base-300 py-4 text-sm"><div><dt className="text-base-content/60">รูปแบบ</dt><dd className="mt-1">MP4 • 1080 × 1920 • 30 fps</dd></div><div><dt className="text-base-content/60">ความยาว</dt><dd className="mt-1 tabular-nums">{time(frames / FPS)} • {project.clips.length} ช็อต</dd></div><div><dt className="text-base-content/60">เสียง</dt><dd className="mt-1">{project.audio === "original" ? "เสียงต้นฉบับ" : "ปิดเสียง"}</dd></div><div><dt className="text-base-content/60">ซับ</dt><dd className="mt-1">{timelineCaptions(project).length} รายการ{project.captionStyle === "none" ? " • ไฟล์ SRT เท่านั้น" : " • ฝังในวิดีโอ + SRT"}</dd></div></dl>
              <div className="flex flex-wrap gap-3"><button className="btn btn-primary rounded-xl" disabled={!project.clips.length || !valid} onClick={() => start("render")}><Download size={18} />ส่งออกวิดีโอ</button><button className="btn btn-outline rounded-xl" disabled={!timelineCaptions(project).length || !valid} onClick={() => downloadText(studioSrt(project), "captions.srt", "text/plain;charset=utf-8")}>ดาวน์โหลดซับ SRT</button></div>
              <p className="text-xs text-base-content/60">ส่งออกได้สูงสุด 5 นาทีต่อโปรเจกต์ ระยะเวลาประมวลผลขึ้นอยู่กับเครื่องและความยาวคลิป</p>
            </div>}
          </fieldset>
          {result?.videoUrl && <section className="mt-6 space-y-4 rounded-2xl border border-success/30 bg-base-200 p-5" aria-label="ผลการส่งออก"><h3 className="flex items-center gap-2 font-medium"><Check size={18} className="text-success" />วิดีโอพร้อมดาวน์โหลด</h3><video src={result.videoUrl} controls className="max-h-96 w-full rounded-xl bg-neutral" /><div className="flex flex-wrap gap-3"><a className="btn btn-primary rounded-xl" href={result.videoUrl} download><Download size={16} />ดาวน์โหลด MP4</a><a className="btn btn-outline rounded-xl" href={result.srtUrl} download>ดาวน์โหลด SRT</a></div></section>}
        </section>
        <aside className="space-y-4 lg:sticky lg:top-6">
          <div className="flex items-center justify-between"><h2 className="font-semibold">พรีวิว</h2><span className="badge badge-ghost badge-sm">9:16</span></div>
          <div className="mx-auto aspect-[9/16] w-full max-w-[340px] overflow-hidden rounded-2xl bg-neutral">
            {project.clips.length && valid ? <Player ref={player} component={CreatorVideo} inputProps={{ project }} durationInFrames={frames} compositionWidth={1080} compositionHeight={1920} fps={FPS} controls acknowledgeRemotionLicense style={{ width: "100%", height: "100%" }} errorFallback={() => <div className="flex h-full items-center justify-center p-8 text-center text-sm text-white">เล่นพรีวิวไม่ได้ ตรวจไฟล์ต้นฉบับแล้วโหลดหน้านี้ใหม่</div>} /> : <div className="flex h-full flex-col items-center justify-center gap-4 p-8 text-center text-neutral-content/60"><Film size={40} /><p className="text-sm">{project.clips.length ? "แก้ช่วงตัดคลิปเพื่อดูพรีวิว" : "เพิ่มคลิปสินค้าจริง\nเพื่อเริ่มเห็นวิดีโอของคุณ"}</p></div>}
          </div>
          <div className="flex items-center justify-between text-xs text-base-content/60"><span className="tabular-nums">{time(frames / FPS)} • {project.clips.length} ช็อต</span><span className="flex items-center gap-1"><Volume2 size={14} />{project.audio === "original" ? "เสียงต้นฉบับ" : "ปิดเสียง"}</span></div>
          <p className="text-xs leading-relaxed text-base-content/60">พรีวิวและไฟล์ส่งออกใช้ไทม์ไลน์เดียวกัน ซับเว้นพื้นที่ด้านขวาและด้านล่างสำหรับปุ่มของแพลตฟอร์ม</p>
          <button className="btn btn-outline w-full rounded-xl" disabled={!project.clips.length || !!busy} onClick={() => setActiveStep("export")}>ตรวจและส่งออก<Download size={16} /></button>
        </aside>
      </div>
    </div>
  </main>;

  function EmptyClips() { return <div className="space-y-3 rounded-xl bg-base-200 p-6"><p className="text-sm text-base-content/60">ยังไม่มีช็อตในไทม์ไลน์</p><button className="btn btn-outline btn-sm" onClick={() => setActiveStep("media")}><Upload size={16} />เพิ่มสื่อก่อน</button></div>; }
  function ShotList() { return <ol className="space-y-2" aria-label="ลำดับช็อต">{project!.clips.map((c, i) => <li key={c.id} className={`flex items-center gap-2 rounded-xl border p-3 ${currentClip?.id === c.id ? "border-primary bg-primary/5" : "border-base-300"}`}><button className="min-w-0 flex-1 text-left" aria-pressed={currentClip?.id === c.id} onClick={() => { setSelected(c.id); setSourceTime(c.in); const start = project!.clips.slice(0, i).reduce((n, x) => n + clipFrames(x), 0); player.current?.seekTo(start); }}><span className="block truncate text-sm font-medium">{i + 1}. {project!.assets.find(a => a.id === c.assetId)?.name}</span><span className="text-xs tabular-nums text-base-content/60">{time(c.in)} – {time(c.out)} • {(clipFrames(c) / FPS).toFixed(1)} วินาที</span></button><button className="btn btn-ghost btn-sm btn-square" aria-label={`เลื่อนช็อต ${i + 1} ขึ้น`} disabled={i === 0} onClick={() => move(i, -1)}><ArrowUp size={16} /></button><button className="btn btn-ghost btn-sm btn-square" aria-label={`เลื่อนช็อต ${i + 1} ลง`} disabled={i === project!.clips.length - 1} onClick={() => move(i, 1)}><ArrowDown size={16} /></button><button className="btn btn-ghost btn-sm btn-square text-error" aria-label={`ลบช็อต ${i + 1}`} onClick={() => edit(p => ({ ...p, clips: p.clips.filter(x => x.id !== c.id) }))}><Trash2 size={16} /></button></li>)}</ol>; }
}

