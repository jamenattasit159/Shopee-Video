"use client";
export type ClientIssue={id:string;code:string;source:string;severity:"error"|"warning";message:string;hint:string;details:string;createdAt:string;resolved:boolean;local?:boolean};
function clean(value:unknown){return String(value??"").replace(/AIza[\w-]{20,}/g,"[REDACTED]").replace(/([?&](?:key|token|secret|code)=)[^&\s]+/gi,"$1[REDACTED]").slice(0,1800);}
export function pendingIssues():ClientIssue[]{try{return JSON.parse(localStorage.getItem("studio.pendingIssues")||"[]");}catch{return [];}}
export function reportClientIssue(input:Partial<ClientIssue>&{message:string},send=true){
  if(typeof window==="undefined")return;
  const issue:ClientIssue={id:input.id||crypto.randomUUID(),code:input.code||"CLIENT_ERROR",source:input.source||"browser",severity:input.severity||"error",message:clean(input.message),hint:clean(input.hint||"ตรวจการเชื่อมต่อแล้วลองอีกครั้ง"),details:clean(input.details||""),createdAt:input.createdAt||new Date().toISOString(),resolved:false,local:send};
  if(send){const queue=pendingIssues();queue.push(issue);try{localStorage.setItem("studio.pendingIssues",JSON.stringify(queue.slice(-30)));}catch{}}
  window.dispatchEvent(new CustomEvent("studio:issue",{detail:issue}));
}
export async function flushIssues(){
  const queue=pendingIssues(),remaining:ClientIssue[]=[];
  for(const issue of queue){try{const response=await fetch("/api/errors",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({code:issue.code,source:issue.source,severity:issue.severity,message:issue.message,hint:issue.hint,details:issue.details})});if(!response.ok)remaining.push(issue);}catch{remaining.push(issue);}}
  try{localStorage.setItem("studio.pendingIssues",JSON.stringify(remaining));}catch{}
}
export async function api<T>(url:string,options:RequestInit={}):Promise<T>{
  let response:Response;
  try{response=await fetch(url,{...options,headers:options.body instanceof FormData?options.headers:{"Content-Type":"application/json",...options.headers}});}
  catch(error){
    const message="ติดต่อเซิร์ฟเวอร์ในเครื่องไม่ได้";reportClientIssue({code:"SERVER_UNREACHABLE",source:url,message,hint:"ตรวจว่า terminal ของ shopee_gpt ยังรัน npm run dev อยู่ แล้วกดตรวจการเชื่อมต่ออีกครั้ง",details:clean(error)});throw new Error(message);
  }
  let data;
  try{data=await response.json();}catch{
    const message=`เซิร์ฟเวอร์ตอบข้อมูลผิดรูปแบบ (HTTP ${response.status})`;
    reportClientIssue({code:"INVALID_RESPONSE",source:url,message,hint:"อาจเกิดจากเซิร์ฟเวอร์เริ่มใหม่หรือไฟล์ build ไม่ตรงกัน รอให้พร้อมแล้วโหลดหน้าใหม่"});throw new Error(message);
  }
  if(!response.ok){
    if(data.issue)reportClientIssue(data.issue,false);else reportClientIssue({code:`HTTP_${response.status}`,source:url,message:data.error||"ทำรายการไม่สำเร็จ"});
    throw new Error(data.issue?`${data.issue.message} — ${data.issue.hint}`:data.error||"ทำรายการไม่สำเร็จ");
  }
  return data;
}
