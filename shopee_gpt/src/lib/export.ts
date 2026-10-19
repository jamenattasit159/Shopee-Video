import { PassThrough, Readable } from "node:stream";
import { ZipArchive } from "archiver";
import { getProject } from "./db";
import { manifest } from "./capcut";
import { assetPath } from "./media";
import { editingBrief } from "./creative";

export function subtitles(scenes: Array<{duration:number;narration:string}>) {
  let position = 0;
  function stamp(t:number) { const ms = Math.round(t*1000); return `${String(Math.floor(ms/3600000)).padStart(2,"0")}:${String(Math.floor(ms/60000)%60).padStart(2,"0")}:${String(Math.floor(ms/1000)%60).padStart(2,"0")},${String(ms%1000).padStart(3,"0")}`; }
  return scenes.map((s,i) => { const start = position; position += s.duration; return `${i+1}\n${stamp(start)} --> ${stamp(position)}\n${s.narration}\n`; }).join("\n");
}
export function exportProject(id: string) {
  const project = getProject(id);
  const content = manifest(project);
  const portablePaths = Object.fromEntries(content.assets.map(a => [a.id, a.packagedPath]));
  const portable = { ...content, brief: editingBrief(project, portablePaths), assets: content.assets.map(({localPath: _local, ...a}) => a) };
  const stream = new PassThrough();
  const archive = new ZipArchive({ zlib: { level: 1 } });
  archive.on("error", error => stream.destroy(error));
  archive.pipe(stream);
  archive.append(JSON.stringify(portable,null,2), {name:"manifest.json"});
  archive.append(portable.brief, {name:"EDITING_BRIEF.md"});
  archive.append(project.caption, {name:"caption.txt"});
  archive.append(subtitles(project.scenes), {name:"captions-estimated.srt"});
  archive.append("This is an editing handoff package, not a native CapCut project. Extract before use. Read EDITING_BRIEF.md with the official CapCut plugin. Subtitle timings are estimates; align to actual speech in CapCut. Original media remain in assets/. No account credentials are included.\n", {name:"README.txt"});
  for (const asset of content.assets) archive.file(assetPath(asset), {name:`assets/${asset.filename}`});
  void archive.finalize();
  return new Response(Readable.toWeb(stream) as ReadableStream, {headers:{"Content-Type":"application/zip","Content-Disposition":`attachment; filename="shopee-gpt-${id.slice(0,8)}.zip"`,"Cache-Control":"no-store"}});
}
