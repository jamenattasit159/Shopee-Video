import fs from 'node:fs/promises';import path from 'node:path';import {createHash,randomUUID} from 'node:crypto';import {execFile} from 'node:child_process';import {promisify} from 'node:util';
import { NarrationArtifact, PreparedSpeech, Scene, VoiceSelection } from './types';import {getVoice,retrySameVoice} from './voiceCatalog';import {narrationHash} from './hash';
const run=promisify(execFile);
export async function synthesizeScene(scene:Scene,voice:VoiceSelection,speech:PreparedSpeech):Promise<NarrationArtifact>{
 const inputHash=narrationHash(scene,voice,speech),key=createHash('sha256').update(inputHash).digest('hex');const dir=path.resolve('public/audio/cache');await fs.mkdir(dir,{recursive:true});
 const resultPath=path.join(dir,`workspace_${key}.json`),audioPath=path.join(dir,`workspace_${key}.mp3`);
 try{const result=JSON.parse(await fs.readFile(resultPath,'utf8'));await fs.access(audioPath);return result;}catch{}
 const temporary=path.resolve('.tmp',`speech_${randomUUID()}.json`),timings=`${temporary}.words.json`;await fs.mkdir(path.dirname(temporary),{recursive:true});
 const v=getVoice(voice.voiceId);const rate=voice.presetId==='lively'&&voice.rate==='+0%'?'+8%':voice.presetId==='calm'&&voice.rate==='+0%'?'-5%':voice.rate;
 await fs.writeFile(temporary,JSON.stringify({text:speech.textForSpeech,voice:v.providerVoiceId,rate}));
 try{
 await retrySameVoice(voice.voiceId,speech.textForSpeech,async()=>run(process.env.WORKSPACE_TTS_PYTHON||'python',['-X','utf8',path.resolve('scripts/workspace-tts.py'),temporary,audioPath,timings],{timeout:90000,windowsHide:true,maxBuffer:1024*1024}));
 const {stdout}=await run(process.env.STUDIO_FFPROBE||'ffprobe',['-v','error','-show_entries','format=duration','-of','default=noprint_wrappers=1:nokey=1',audioPath],{windowsHide:true});
 const durationFrames=Math.ceil(Number(stdout.trim())*30);if(!Number.isFinite(durationFrames)||durationFrames<=0)throw new Error('เสียงว่าง');
 const words: Array<{text:string;start:number;end:number}>=JSON.parse(await fs.readFile(timings,'utf8'));
 const captions=alignDisplay(speech,words,durationFrames);
 const result:NarrationArtifact={inputHash,url:`/audio/cache/workspace_${key}.mp3`,durationFrames,captions:captions.length?captions:[{startFrame:0,endFrame:durationFrames,text:scene.displayText}],actualVoiceId:voice.voiceId,timingQuality:captions.length?'word':'phrase'};
 await fs.writeFile(resultPath,JSON.stringify(result));return result;
 }catch{throw new Error('สร้างเสียงไม่ได้ กรุณาตรวจอินเทอร์เน็ตแล้วลองใหม่ ระบบยังคงเสียงและบทที่คุณเลือกไว้');}finally{await fs.unlink(temporary).catch(()=>{});await fs.unlink(timings).catch(()=>{});}
}
export function alignDisplay(speech:PreparedSpeech,words:Array<{text:string;start:number;end:number}>,durationFrames:number){
 const normalize=(s:string)=>s.replace(/[\s\p{P}\p{S}]/gu,'').toLocaleLowerCase();
 const spoken=normalize(speech.textForSpeech);if(!spoken||words.map(w=>normalize(w.text)).join('')!==spoken)return [];
 const ranges:Array<{start:number;end:number;first:number;last:number}>=[];let cursor=0;for(const w of words){const len=normalize(w.text).length;ranges.push({start:cursor,end:cursor+len,first:Math.max(0,Math.round(w.start*30)),last:Math.min(durationFrames,Math.ceil(w.end*30))});cursor+=len;}
 const items:Array<{startFrame:number;endFrame:number;text:string}>=[];cursor=0;
 for(const token of speech.tokens){const segments=token.display===token.spoken?Array.from(new Intl.Segmenter('th',{granularity:'word'}).segment(token.display),x=>({display:x.segment,spoken:x.segment})):[token];for(const seg of segments){const len=normalize(seg.spoken).length;const hits=ranges.filter(w=>w.end>cursor&&w.start<cursor+len);cursor+=len;if(hits.length)items.push({startFrame:hits[0].first,endFrame:hits.at(-1)!.last,text:seg.display});else if(items.length)items.at(-1)!.text+=seg.display;}}
 // Group words into short readable phrases, keeping actual speech times.
 const groups:typeof items=[];for(const item of items){const prev=groups.at(-1);if(prev&&(prev.text.length+item.text.length<=24||prev.endFrame>item.startFrame)&&item.endFrame-prev.startFrame<=90){prev.text+=item.text;prev.endFrame=item.endFrame;}else groups.push({...item});}return groups.filter(c=>c.endFrame>c.startFrame);
}
