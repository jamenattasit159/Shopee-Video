import { ResolvedTimeline, WorkspaceProject } from './types';
import { narrationHash } from './hash';
import { prepareSpeech } from './pronunciation';
export function resolveTimeline(p:WorkspaceProject):ResolvedTimeline{
 const t:ResolvedTimeline={durationFrames:0,scenes:[],captions:[],blockers:[],captionStyle:p.captionStyle,legacyAudio:p.legacyAudio};
 if(!p.scenes.length)t.blockers.push('เพิ่มรูปหรือคลิปอย่างน้อย 1 ฉาก');
 p.scenes.forEach((s,index)=>{const asset=p.assets.find(a=>a.id===s.assetId);if(!asset){t.blockers.push(`ฉาก ${index+1}: ไม่พบสื่อ`);return;}
 let duration=s.durationFrames;const usesVoice=s.audioMode!=='original'&&!!s.displayText.trim()&&!p.legacyAudio;
 if(usesVoice){const expected=narrationHash(s,p.voice,prepareSpeech(s.displayText,p.pronunciation));if(!s.narration||s.narration.inputHash!==expected)t.blockers.push(`ฉาก ${index+1}: สร้างเสียงพากย์ใหม่ก่อนส่งออก`);else duration=Math.max(duration,s.narration.durationFrames+6);}
 if(asset.kind==='video'&&duration>s.durationFrames&&!s.allowFreeze)t.blockers.push(`ฉาก ${index+1}: เสียงยาวกว่าช่วงคลิป เลือกค้างภาพท้ายหรือเพิ่มช่วงคลิป`);
 const from=t.durationFrames;t.scenes.push({...s,asset,fromFrame:from,effectiveDurationFrames:duration});
 if(usesVoice&&s.narration){for(const c of s.narration.captions)t.captions.push({...c,startFrame:from+c.startFrame,endFrame:from+Math.min(c.endFrame,duration)});}
 else if(s.audioMode==='original'){for(const c of asset.captions){const start=Math.max(0,Math.round(c.start*30)-s.inFrame),end=Math.min(duration,Math.round(c.end*30)-s.inFrame);if(end>start)t.captions.push({startFrame:from+start,endFrame:from+end,text:c.text});}}
 t.durationFrames+=duration;
 });
 if(p.legacyAudio&&t.durationFrames<p.legacyAudio.durationFrames)t.blockers.push('เสียงเดิมยาวกว่าฉาก เพิ่มเวลาฉากหรือเปลี่ยนเป็นเสียงรายฉาก');
 if(t.durationFrames>9000)t.blockers.push('ความยาวรวมเกิน 5 นาที');return t;
}
export function workspaceSrt(t:ResolvedTimeline){const stamp=(f:number)=>{const ms=Math.round(f*1000/30);return `${String(Math.floor(ms/3600000)).padStart(2,'0')}:${String(Math.floor(ms/60000)%60).padStart(2,'0')}:${String(Math.floor(ms/1000)%60).padStart(2,'0')},${String(ms%1000).padStart(3,'0')}`;};return t.captions.map((c,i)=>`${i+1}\n${stamp(c.startFrame)} --> ${stamp(c.endFrame)}\n${c.text}\n`).join('\n');}
