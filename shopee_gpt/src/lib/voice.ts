import { promisify } from "node:util";
import { execFile } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { dataDir, getProject, StudioError } from "./db";
import { ingest } from "./media";
import ffmpeg from "ffmpeg-static";
import {geminiSpeech} from "./google-voice";
import {buildEffectiveStylePrompt,VOICE_PRESETS} from "./voice-presets";
import {normalizeForSpeech} from "./speech-text";
const exec = promisify(execFile);
export async function synthesize(id: string,previewOnly=false) {
  const project = getProject(id);
  if (project.voice === "original") throw new StudioError("โปรเจกต์นี้เลือกใช้เสียงต้นฉบับ ไม่ต้องสร้างเสียงพากย์");
  const originalText = project.scenes.map(s => s.narration.trim()).filter(Boolean).join("\n");
  const text=normalizeForSpeech(previewOnly?originalText.slice(0,100):originalText).textForSpeech;
  if (!text || text.length > 12000) throw new StudioError("กรุณาเขียนสคริปต์ก่อนสร้างเสียง (สูงสุด 12,000 ตัวอักษร)");
  const dir = path.join(dataDir, "tmp");
  await fs.mkdir(dir,{recursive:true});
  const file = path.join(dir,`${randomUUID()}.txt`);
  const output = file.replace(/\.txt$/, project.ttsEngine==="gemini"?".wav":".mp3");
  const polished=file.replace(/\.txt$/, ".polished.wav");
  await fs.writeFile(file,text,"utf8");
  try {
    if(project.ttsEngine==="gemini"){
      const style=buildEffectiveStylePrompt(project.voicePresetId,project.voiceIntensity,project.voiceStyle);
      await fs.writeFile(output,await geminiSpeech(text,project.geminiVoice,style));
    }else await exec(process.env.PYTHON_PATH || "python", ["-X","utf8","-m","edge_tts","--voice",project.voice === "female" ? "th-TH-PremwadeeNeural" : "th-TH-NiwatNeural", "--file",file,`--rate=${project.rate >= 0 ? "+" : ""}${project.rate}%`,"--write-media",output], {timeout:120000,windowsHide:true,env:{...process.env,PYTHONUTF8:"1"}});
    let finalFile=output;
    const preset=VOICE_PRESETS.find(p=>p.id===project.voicePresetId)||VOICE_PRESETS[0];
    const tempo=(project.ttsEngine==="gemini"?1+project.rate/100:1)*(project.voicePolish?preset.polish.atempo:1);
    const filters=[...(project.voicePolish?["highpass=f=80","acompressor=threshold=-18dB:ratio=3:attack=5:release=80",`equalizer=f=3000:t=q:w=1:g=${preset.polish.presenceDb}`,`loudnorm=I=${preset.polish.targetLufs}:TP=-1.5:LRA=11`]:[]),...(tempo!==1?[`atempo=${tempo.toFixed(3)}`]:[])];
    if(filters.length){
      if(!ffmpeg&&!process.env.FFMPEG_PATH)throw new StudioError("ไม่พบ FFmpeg สำหรับปรับเสียง",500);
      await exec(process.env.FFMPEG_PATH||ffmpeg!,["-y","-i",output,"-af",filters.join(","),"-ar","24000","-ac","1",polished],{timeout:30000,windowsHide:true});finalFile=polished;
    }
    return await ingest(id,`${previewOnly?"ตัวอย่างเสียง":"เสียงพากย์"}-${project.ttsEngine==="gemini"?project.geminiVoice:project.voice}-${project.name.slice(0,30)}${path.extname(finalFile)}`,await fs.readFile(finalFile),previewOnly?"preview":"voiceover");
  } catch (error) {
    if (error instanceof StudioError) throw error;
    const diagnostic=String((error as {stderr?:string}).stderr||"");
    if(diagnostic.includes("NoAudioReceived")) throw new StudioError("บริการเสียงไม่ส่งไฟล์กลับมา ลองเปลี่ยนเสียงผู้หญิง/ผู้ชาย หรืออัปโหลดเสียงที่อัดเอง ระบบยังไม่ได้สร้างไฟล์เสียงสำเร็จ",502);
    throw error;
  } finally { await Promise.all([fs.unlink(file).catch(()=>{}),fs.unlink(output).catch(()=>{}),fs.unlink(polished).catch(()=>{})]); }
}
