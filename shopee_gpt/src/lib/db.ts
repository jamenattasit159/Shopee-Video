import { DatabaseSync } from "node:sqlite";
import { mkdirSync } from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import type { Asset, Job, Project, ProjectInput } from "./schema";
import {projectInput} from "./schema";

export const dataDir = path.resolve(/* turbopackIgnore: true */ process.env.STUDIO_DATA_DIR || path.join(process.cwd(), "data"));
export const storageDir = path.join(dataDir, "media");
const globalDb = globalThis as typeof globalThis & { studioDb?: DatabaseSync };
function database(): DatabaseSync {
  if(globalDb.studioDb) return globalDb.studioDb;
  mkdirSync(storageDir, { recursive: true });
  const instance=new DatabaseSync(path.join(dataDir,"studio.sqlite"));
  instance.exec("PRAGMA busy_timeout=10000;");
  instance.exec(`PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON;
CREATE TABLE IF NOT EXISTS projects(id TEXT PRIMARY KEY, body TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS assets(id TEXT PRIMARY KEY, project_id TEXT NOT NULL REFERENCES projects(id), body TEXT NOT NULL);
CREATE INDEX IF NOT EXISTS assets_project ON assets(project_id);
CREATE TABLE IF NOT EXISTS jobs(id TEXT PRIMARY KEY, project_id TEXT NOT NULL REFERENCES projects(id), body TEXT NOT NULL);
CREATE INDEX IF NOT EXISTS jobs_project ON jobs(project_id);
CREATE TABLE IF NOT EXISTS activity(id INTEGER PRIMARY KEY AUTOINCREMENT, project_id TEXT NOT NULL, message TEXT NOT NULL, created_at TEXT NOT NULL);`);
  globalDb.studioDb=instance;
  return instance;
}
export const db=new Proxy({} as DatabaseSync,{get(_target,key){const instance=database();const value=Reflect.get(instance,key);return typeof value==="function"?value.bind(instance):value;}});

export class StudioError extends Error {
  constructor(message: string, public status = 400) { super(message); }
}
function decode<T>(row: unknown): T | null { return row ? JSON.parse((row as { body: string }).body) : null; }
export function listAssets(id: string): Asset[] {
  return (db.prepare("SELECT body FROM assets WHERE project_id=? ORDER BY rowid").all(id)).map(r => decode<Asset>(r)!);
}
export function getProject(id: string): Project {
  const project = decode<Project>(db.prepare("SELECT body FROM projects WHERE id=?").get(id));
  if (!project) throw new StudioError("ไม่พบโปรเจกต์นี้", 404);
  return { ...projectInput.parse(project), ...project, assets: listAssets(id) };
}
export function listProjects(includeArchived = false): Project[] {
  return db.prepare("SELECT body FROM projects ORDER BY rowid DESC").all().map(r => decode<Project>(r)!).filter(p => includeArchived || !p.archived).map(p => ({ ...projectInput.parse(p), ...p, assets: listAssets(p.id) }));
}
export function activity(id: string, message: string) {
  db.prepare("INSERT INTO activity(project_id,message,created_at) VALUES(?,?,?)").run(id, message, new Date().toISOString());
}
export function getActivity(id: string) {
  return db.prepare("SELECT message,created_at AS createdAt FROM activity WHERE project_id=? ORDER BY id DESC LIMIT 25").all(id);
}
export function createProject(input: ProjectInput): Project {
  const now = new Date().toISOString();
  const project: Project = { ...input, id: randomUUID(), revision: 1, createdAt: now, updatedAt: now, status: "draft", archived: false, capcutUrl: null, assets: [] };
  db.prepare("INSERT INTO projects VALUES(?,?)").run(project.id, JSON.stringify({ ...project, assets: undefined }));
  activity(project.id, "สร้างโปรเจกต์");
  return project;
}
export function updateProject(id: string, patch: Partial<ProjectInput> & { archived?: boolean; status?: Project["status"]; capcutUrl?: string | null }, revision?: number): Project {
  db.exec("BEGIN IMMEDIATE");
  try {
    const current = getProject(id);
    if (revision !== undefined && current.revision !== revision) throw new StudioError("ข้อมูลถูกแก้จากอีกหน้าต่างแล้ว กรุณาโหลดโปรเจกต์ใหม่ก่อนบันทึก", 409);
    const updated = { ...current, ...patch, id, revision: current.revision + 1, updatedAt: new Date().toISOString() };
    db.prepare("UPDATE projects SET body=? WHERE id=?").run(JSON.stringify({ ...updated, assets: undefined }), id);
    db.exec("COMMIT");
    return updated;
  } catch (e) { db.exec("ROLLBACK"); throw e; }
}
export function getAsset(id: string): Asset {
  const asset = decode<Asset>(db.prepare("SELECT body FROM assets WHERE id=?").get(id));
  if (!asset) throw new StudioError("ไม่พบไฟล์นี้", 404);
  return asset;
}
export function addAsset(asset: Asset) {
  db.prepare("INSERT INTO assets VALUES(?,?,?)").run(asset.id, asset.projectId, JSON.stringify(asset));
  activity(asset.projectId, `เพิ่มไฟล์ ${asset.name}`);
}
export function updateAsset(id: string, role: string) {
  const asset = getAsset(id);
  db.prepare("UPDATE assets SET body=? WHERE id=?").run(JSON.stringify({ ...asset, role }), id);
}
export function deleteAsset(id: string) {
  const asset = getAsset(id);
  const project = getProject(asset.projectId);
  if (listJobs(project.id).some(j => j.state === "running" || j.state === "prepared")) throw new StudioError("ยกเลิกงาน CapCut ที่ค้างอยู่ก่อนนำไฟล์ออก", 409);
  updateProject(project.id, { scenes: project.scenes.map(s => s.assetId === id ? { ...s, assetId: null } : s), voiceAssetId: project.voiceAssetId === id ? null : project.voiceAssetId });
  db.prepare("DELETE FROM assets WHERE id=?").run(id);
  activity(project.id, `นำไฟล์ ${asset.name} ออกจากโปรเจกต์`);
  return asset;
}
export function listJobs(projectId?: string): Job[] {
  const jobs=(projectId ? db.prepare("SELECT body FROM jobs WHERE project_id=? ORDER BY rowid DESC").all(projectId) : db.prepare("SELECT body FROM jobs ORDER BY rowid DESC").all()).map(r => decode<Job>(r)!);
  return jobs.map(job=>{
    if(job.state==="running" && Date.now()-Date.parse(job.updatedAt)>25*60*1000){
      const recovered={...job,state:"failed" as const,message:"ตัวเชื่อมหยุดส่งสถานะเกิน 25 นาที ตรวจ CapCut ก่อนเริ่มใหม่"};saveJob(recovered);
      db.prepare("UPDATE projects SET body=json_set(body,'$.status','draft','$.revision',json_extract(body,'$.revision')+1,'$.updatedAt',?) WHERE id=? AND json_extract(body,'$.status')='editing'").run(new Date().toISOString(),job.projectId);
      return recovered;
    }
    return job;
  });
}
export function getJob(id: string): Job {
  const job = decode<Job>(db.prepare("SELECT body FROM jobs WHERE id=?").get(id));
  if (!job) throw new StudioError("ไม่พบงานตัดต่อนี้", 404);
  return job;
}
export function saveJob(job: Job) {
  db.prepare("INSERT INTO jobs VALUES(?,?,?) ON CONFLICT(id) DO UPDATE SET body=excluded.body").run(job.id, job.projectId, JSON.stringify({ ...job, updatedAt: new Date().toISOString() }));
}
