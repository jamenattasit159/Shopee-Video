import {route} from "@/lib/http";
import {createReplicatedVoice,deleteGoogleVoice,listGoogleVoices} from "@/lib/google-voice";
import {StudioError} from "@/lib/db";
export const GET=route(async()=>({voices:await listGoogleVoices()}));
export const POST=route(async req=>{
  if(Number(req.headers.get("content-length"))>42*1024*1024)throw new StudioError("ไฟล์เสียงรวมต้องไม่เกิน 40 MB",413);
  const form=await req.formData(),source=form.get("sourceAudio"),consent=form.get("consentAudio");
  if(!(source instanceof File)||!(consent instanceof File))throw new StudioError("แนบทั้งเสียงตัวอย่างและเสียงยินยอม");
  return {voice:await createReplicatedVoice(String(form.get("displayName")||""),source,consent,form.get("confirmed")==="true")};
});
export const DELETE=route(async req=>{const id=req.nextUrl.searchParams.get("id");if(!id)throw new StudioError("ระบุ voice ID ที่จะลบ");await deleteGoogleVoice(id);return {deleted:true};});
