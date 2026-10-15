// Verified against Microsoft Speech language support, 2026-10-14.
// https://learn.microsoft.com/en-us/azure/ai-services/speech-service/language-support
export const VOICES=[{id:'thai-female',providerVoiceId:'th-TH-PremwadeeNeural',label:'พรีมวดี',genderLabel:'female',description:'เสียงหญิงภาษาไทย ชัดเจน เป็นธรรมชาติ'},{id:'thai-male',providerVoiceId:'th-TH-NiwatNeural',label:'นิวัฒน์',genderLabel:'male',description:'เสียงชายภาษาไทย สุภาพ ฟังสบาย'}] as const;
export function getVoice(id:string){const v=VOICES.find(v=>v.id===id);if(!v)throw new Error('ไม่พบเสียงที่เลือก');return v;}
export async function retrySameVoice<T>(voice:string,text:string,run:(voice:string,text:string)=>Promise<T>):Promise<T>{try{return await run(voice,text);}catch{return await run(voice,text);}}
