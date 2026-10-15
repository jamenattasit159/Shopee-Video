import { z } from 'zod';
export const FPS=30;
const frame=z.number().int().min(0);
const publicMedia=z.string().regex(/^\/(uploads|audio\/cache)\/[\w.-]+\.(mp4|mov|webm|png|jpe?g|webp|mp3|wav)$/i);
const Cue=z.object({id:z.string(),start:z.number().min(0),end:z.number().positive(),text:z.string().max(500)}).refine(c=>c.end>c.start);
const Asset=z.object({id:z.string().min(1),name:z.string().max(255),url:publicMedia,kind:z.enum(['image','video']),width:z.number().positive(),height:z.number().positive(),durationFrames:frame,hasAudio:z.boolean(),captions:z.array(Cue).max(3000)});
export const VoiceSchema=z.object({voiceId:z.enum(['thai-female','thai-male']),languageStyle:z.enum(['female-polite','male-polite','neutral']),presetId:z.enum(['friendly','calm','lively']),rate:z.enum(['-10%','+0%','+10%'])});
export const EntrySchema=z.object({term:z.string().trim().min(1).max(100),spoken:z.string().trim().min(1).max(200)});
const Artifact=z.object({inputHash:z.string(),url:publicMedia,durationFrames:frame.positive(),captions:z.array(z.object({startFrame:frame,endFrame:frame,text:z.string().max(500)})),timingQuality:z.enum(['word','phrase']),actualVoiceId:z.string()});
export const SceneSchema=z.object({id:z.string().min(1),assetId:z.string().min(1),inFrame:frame,durationFrames:frame.positive().max(9000),crop:z.enum(['left','center','right']),layout:z.enum(['footage-focus','product-callout','offer-close']),displayText:z.string().max(2000),overlayText:z.string().max(120),audioMode:z.enum(['original','narration','mix']),allowFreeze:z.boolean(),narration:Artifact.optional()});
export const WorkspaceSchema=z.object({schemaVersion:z.literal(2),id:z.string().uuid(),name:z.string().trim().min(1).max(120),revision:frame,product:z.object({name:z.string().max(200),price:z.string().max(50),highlights:z.string().max(3000)}),assets:z.array(Asset).max(20),scenes:z.array(SceneSchema).max(150),voice:VoiceSchema,pronunciation:z.array(EntrySchema).max(200),captionStyle:z.enum(['clean','highlight','none']),legacyAudio:z.object({url:publicMedia,durationFrames:frame.positive(),locked:z.literal(true)}).optional()}).superRefine((p,ctx)=>{
 const issue=(message:string)=>ctx.addIssue({code:'custom',message});
 if(new Set(p.assets.map(a=>a.id)).size!==p.assets.length||new Set(p.scenes.map(s=>s.id)).size!==p.scenes.length)issue('รายการซ้ำ');
 if(new Set(p.pronunciation.map(e=>e.term.toLocaleLowerCase())).size!==p.pronunciation.length)issue('คำอ่านซ้ำ');
 if(p.scenes.reduce((n,s)=>n+s.durationFrames,0)>9000)issue('คลิปยาวเกิน 5 นาที');
 for(const s of p.scenes){const a=p.assets.find(a=>a.id===s.assetId);if(!a)issue('ไม่พบสื่อของฉาก');else if(a.kind==='video'&&(s.inFrame>=a.durationFrames||s.inFrame+s.durationFrames>a.durationFrames))issue('ช่วงตัดเกินวิดีโอต้นฉบับ');}
});
export type WorkspaceProject=z.infer<typeof WorkspaceSchema>;
export type MediaAsset=z.infer<typeof Asset>;
export type Scene=z.infer<typeof SceneSchema>;
export type VoiceSelection=z.infer<typeof VoiceSchema>;
export type LanguageStyle=VoiceSelection['languageStyle'];
export type PronunciationEntry=z.infer<typeof EntrySchema>;
export type NarrationArtifact=z.infer<typeof Artifact>;
export type SpeechToken={display:string;spoken:string;displayStart:number;displayEnd:number};
export type PreparedSpeech={displayText:string;textForSpeech:string;tokens:SpeechToken[];reviewTerms:string[]};
export type ResolvedScene=Scene&{asset:MediaAsset;fromFrame:number;effectiveDurationFrames:number};
export type ResolvedTimeline={durationFrames:number;scenes:ResolvedScene[];captions:Array<{startFrame:number;endFrame:number;text:string}>;blockers:string[];captionStyle:WorkspaceProject['captionStyle'];legacyAudio?:WorkspaceProject['legacyAudio']};
export function parseWorkspace(input:unknown){return WorkspaceSchema.parse(input);}
export function freshWorkspace():WorkspaceProject{return {schemaVersion:2,id:crypto.randomUUID(),name:'คลิปสินค้าใหม่',revision:0,product:{name:'',price:'',highlights:''},assets:[],scenes:[],voice:{voiceId:'thai-female',languageStyle:'female-polite',presetId:'friendly',rate:'+0%'},pronunciation:[],captionStyle:'highlight'};}
export function newScene(a:MediaAsset):Scene{return {id:crypto.randomUUID(),assetId:a.id,inFrame:0,durationFrames:a.kind==='video'?Math.min(150,a.durationFrames):150,crop:'center',layout:'footage-focus',displayText:'',overlayText:'',audioMode:'original',allowFreeze:false};}
