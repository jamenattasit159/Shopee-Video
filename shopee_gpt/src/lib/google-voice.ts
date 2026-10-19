import fs from "node:fs/promises";
import path from "node:path";
import {randomUUID} from "node:crypto";
import {execFile} from "node:child_process";
import {promisify} from "node:util";
import ffmpeg from "ffmpeg-static";
import ffprobe from "ffprobe-static";
import {fileTypeFromBuffer} from "file-type";
import {dataDir,StudioError} from "./db";

const exec=promisify(execFile);
export const GEMINI_TTS_MODEL="gemini-3.8-flash-tts";
export type GoogleVoice={id:string;displayName:string;type:string;languageCode:string};
export async function googleRequest(endpoint:string,init:RequestInit={}) {
  const key=process.env.GEMINI_API_KEY;
  if(!key?.trim())throw new StudioError("ยังไม่ได้ตั้ง GEMINI_API_KEY ใน .env.local",400);
  const response=await fetch(`https://generativelanguage.googleapis.com/v1beta/${endpoint}`,{...init,signal:AbortSignal.timeout(150000),headers:{"Content-Type":"application/json","x-goog-api-key":key,...init.headers}});
  const data=await response.json().catch(()=>({}));
  if(!response.ok){const error=new StudioError(String(data.error?.message||`Google API HTTP ${response.status}`),response.status===429?429:response.status>=500?502:response.status);throw error;}
  return data;
}
export async function listGoogleVoices():Promise<GoogleVoice[]> {
  const voices:GoogleVoice[]=[];let token="";
  for(let page=0;page<5;page++){
    const query=new URLSearchParams({type:"replicated",page_size:"100"});if(token)query.set("page_token",token);
    const result=await googleRequest(`voices?${query}`);
    for(const v of result.voices||[])voices.push({id:v.id,displayName:v.display_name||v.displayName||v.id,type:v.type||"replicated",languageCode:v.language_code||v.languageCode||"th-TH"});
    token=result.next_page_token||result.nextPageToken||"";if(!token)break;
  }
  return voices;
}
export async function deleteGoogleVoice(id:string){
  if(!/^voice_[A-Za-z0-9_-]+$/.test(id))throw new StudioError("voice ID ไม่ถูกต้อง");
  await googleRequest(`voices/${encodeURIComponent(id)}`,{method:"DELETE"});
}
export function decodeGeminiAudio(result:Record<string,unknown>):Buffer {
  const direct=result.output_audio as {data?:string}|undefined;
  const steps=(result.steps||[]) as Array<{content?:Array<{type?:string;data?:string}>}>;
  const last=steps.flatMap(s=>s.content||[]).filter(c=>c.type==="audio"&&c.data).at(-1);
  const data=direct?.data||last?.data;
  if(!data)throw new StudioError("Gemini ไม่มีข้อมูลเสียงส่งกลับมา ตรวจสคริปต์และสิทธิ์โมเดล",502);
  const bytes=Buffer.from(data,"base64");
  if(bytes.toString("ascii",0,4)!=="RIFF"||bytes.toString("ascii",8,12)!=="WAVE")throw new StudioError("Gemini คืนรูปแบบเสียงที่ไม่ใช่ WAV ตามที่ร้องขอ",502);
  return bytes;
}
export async function geminiSpeech(text:string,voice:string,style:string):Promise<Buffer> {
  if(voice.startsWith("voicekey_")||!/^([A-Za-z][A-Za-z0-9_-]{0,239})$/.test(voice))throw new StudioError("เลือกชื่อเสียง prebuilt หรือ voice_ ID ที่บันทึกไว้เท่านั้น");
  const result=await googleRequest("interactions",{method:"POST",body:JSON.stringify({model:GEMINI_TTS_MODEL,input:[{type:"user_input",content:[{type:"text",text,annotations:[{type:"speech_metadata",style}]}]}],response_format:{type:"audio",mime_type:"audio/wav"},generation_config:{speech_config:[{voice}]},store:false})});
  return decodeGeminiAudio(result);
}
export async function createReplicatedVoice(displayName:string,source:File,consent:File,confirmed:boolean) {
  if(!confirmed)throw new StudioError("ต้องยืนยันว่าเป็นเจ้าของเสียงผู้ใหญ่และยินยอมให้สร้างโมเดลเสียง");
  if(!displayName.trim()||displayName.length>120)throw new StudioError("ตั้งชื่อเสียงไม่เกิน 120 ตัวอักษร");
  const tmp=path.join(dataDir,"tmp",`clone-${randomUUID()}`);await fs.mkdir(tmp,{recursive:true});
  try{
    const convert=async(file:File,name:string,min:number,max:number)=>{
      if(!file.size||file.size>20*1024*1024)throw new StudioError("ไฟล์เสียงแต่ละไฟล์ต้องไม่เกิน 20 MB");
      const bytes=Buffer.from(await file.arrayBuffer()),type=await fileTypeFromBuffer(bytes);
      if(!type||!(["audio/mpeg","audio/wav","audio/x-wav","audio/mp4","audio/ogg","audio/flac","video/webm","audio/webm","video/mp4"].includes(type.mime)))throw new StudioError("ไฟล์ตัวอย่างและยินยอมต้องเป็นไฟล์เสียง MP3/WAV/M4A/OGG/WebM");
      const input=path.join(tmp,`${name}.${type.ext}`),output=path.join(tmp,`${name}.wav`);await fs.writeFile(input,bytes);
      const probe=await exec(process.env.FFPROBE_PATH||ffprobe.path,["-v","error","-show_format","-show_streams","-of","json",input],{timeout:15000,windowsHide:true});
      const metadata=JSON.parse(probe.stdout);
      if(!metadata.streams?.some((s:{codec_type:string})=>s.codec_type==="audio"))throw new StudioError("ไฟล์นี้ไม่มีแทร็กเสียง");
      if(!ffmpeg&&!process.env.FFMPEG_PATH)throw new StudioError("ไม่พบ FFmpeg สำหรับแปลงเสียง",500);
      await exec(process.env.FFMPEG_PATH||ffmpeg!,["-y","-i",input,"-vn","-ar","24000","-ac","1","-c:a","pcm_s16le",output],{timeout:30000,windowsHide:true});
      const converted=await exec(process.env.FFPROBE_PATH||ffprobe.path,["-v","error","-show_format","-of","json",output],{timeout:15000,windowsHide:true});
      const duration=Number(JSON.parse(converted.stdout).format?.duration);
      if(!Number.isFinite(duration)||duration<min||duration>max)throw new StudioError(`${name==="source"?"เสียงตัวอย่าง":"เสียงยินยอม"} ต้องยาว ${min}–${max} วินาที (ไฟล์นี้ ${Number.isFinite(duration)?duration.toFixed(1):"อ่านเวลาไม่ได้"} วินาที)`);
      return (await fs.readFile(output)).toString("base64");
    };
    const sourceData=await convert(source,"source",10,30),consentData=await convert(consent,"consent",3,30);
    const voice=await googleRequest("voices",{method:"POST",body:JSON.stringify({store:true,voice:{model:GEMINI_TTS_MODEL,type:"replicated",display_name:displayName.trim(),replicated:{source_audio:{mime_type:"audio/wav",data:sourceData},consent_audio:{mime_type:"audio/wav",data:consentData}}}})});
    return {id:voice.id,displayName:voice.display_name||displayName,type:voice.type||"replicated",languageCode:voice.language_code||"th-TH"};
  }finally{
    // This path is a UUID child of our owned data/tmp directory.
    for(const name of await fs.readdir(tmp).catch(()=>[]))await fs.unlink(path.join(tmp,path.basename(name))).catch(()=>{});
    await fs.rmdir(tmp).catch(()=>{});
  }
}
