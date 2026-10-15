import { LanguageStyle, newScene, WorkspaceProject } from './types';
export function adaptLanguage(text:string,style:LanguageStyle){
 // Only unquoted speaker language; do not rewrite brand names or arbitrary verbs.
 return text.split(/(“[^”]*”|"[^"]*"|‘[^’]*’)/g).map((part,i)=>{if(i%2)return part;
 if(style==='neutral')return part.replace(/(?:ครับ|ค่ะ|คะ)(?=[\s!?。.!]*$)/g,'').replace(/^(?:ผม|ดิฉัน|ฉัน)(?=ขอ|แนะนำ|อยาก|ชอบ)/,'');
 if(style==='male-polite')return part.replace(/(?:ค่ะ|คะ)(?=[\s!?。.!]|$)/g,'ครับ').replace(/^(?:ดิฉัน|ฉัน)(?=ขอ|แนะนำ|อยาก|ชอบ)/,'ผม');
 return part.replace(/ครับ(?=[\s!?。.!]|$)/g,(match,offset)=>/(ไหม|หรือ|เหรอ|อะไร|ยังไง|เท่าไร|เท่าไหร่)\s*$/.test(part.slice(0,offset))?'คะ':'ค่ะ').replace(/^ผม(?=ขอ|แนะนำ|อยาก|ชอบ)/,'ฉัน');
 }).join('');
}
export function draftScenes(p:WorkspaceProject){
 if(!p.assets.length)return [];
 const ending=p.voice.languageStyle==='male-polite'?'ครับ':p.voice.languageStyle==='female-polite'?'ค่ะ':'';
 const points=p.product.highlights.split(/[\n•]+/).map(s=>s.trim()).filter(Boolean);
 const texts=[`${p.product.name||'สินค้าชิ้นนี้'} มีอะไรน่าสนใจ มาดูกัน${ending}`,...points.slice(0,4),`${p.product.price?`ราคา ${p.product.price} บาท `:''}ดูรายละเอียดเพิ่มเติมได้ที่ตะกร้า${ending}`];
 return texts.map((text,i)=>({...newScene(p.assets[i%p.assets.length]),displayText:text,overlayText:i===0?p.product.name:i===texts.length-1?(p.product.price?`${p.product.price} บาท`:'ดูรายละเอียดเพิ่มเติม'):points[i-1]?.slice(0,120)||'',audioMode:'narration' as const,layout:i===texts.length-1?'offer-close' as const:i===0?'product-callout' as const:'footage-focus' as const}));
}
