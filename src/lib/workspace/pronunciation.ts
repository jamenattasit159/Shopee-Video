import { PreparedSpeech, PronunciationEntry } from './types';
export function prepareSpeech(displayText:string,entries:PronunciationEntry[],defaults:PronunciationEntry[]=[]):PreparedSpeech{
 const map=new Map<string,PronunciationEntry>();for(const e of [...defaults,...entries])if(e.term.trim()&&e.spoken.trim())map.set(e.term.toLocaleLowerCase(),e);
 const terms=[...map.values()].sort((a,b)=>b.term.length-a.term.length);const lower=displayText.toLocaleLowerCase();const tokens:PreparedSpeech['tokens']=[];
 let i=0,start=0;const flush=(end:number)=>{if(end>start)tokens.push({display:displayText.slice(start,end),spoken:displayText.slice(start,end),displayStart:start,displayEnd:end});};
 while(i<displayText.length){const match=terms.find(e=>{if(!lower.startsWith(e.term.toLocaleLowerCase(),i))return false;const before=displayText[i-1]||'',after=displayText[i+e.term.length]||'';return !(/[A-Za-z0-9]/.test(e.term[0])&&/[A-Za-z0-9]/.test(before))&&!(/[A-Za-z0-9]/.test(e.term.at(-1)!)&&/[A-Za-z0-9]/.test(after));});if(match){flush(i);tokens.push({display:displayText.slice(i,i+match.term.length),spoken:match.spoken,displayStart:i,displayEnd:i+match.term.length});i+=match.term.length;start=i;}else i++;}flush(i);
 return {displayText,textForSpeech:tokens.map(t=>t.spoken).join(''),tokens,reviewTerms:[...new Set(displayText.match(/[A-Za-z][A-Za-z0-9-]*|\d+(?:\.\d+)?\s*(?:บาท|มล\.?|ml|kg|กก\.?|%)/g)||[])].filter(w=>!map.has(w.toLocaleLowerCase()))};
}
