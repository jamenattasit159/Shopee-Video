"use client";
import {useEffect} from "react";
import {reportClientIssue} from "@/lib/client-api";
import ErrorCenter from "@/components/error-center";
export default function ErrorPage({error,reset}:{error:Error&{digest?:string};reset:()=>void}){
  useEffect(()=>{reportClientIssue({code:"REACT_PAGE_ERROR",source:"page-boundary",message:error.message||"หน้าเว็บทำงานต่อไม่ได้",hint:"ลองโหลดส่วนนี้ใหม่ หรือเปิดศูนย์ข้อผิดพลาดเพื่อดูรายงาน",details:error.digest||error.stack||""});},[error]);
  return <main className="mx-auto max-w-2xl space-y-5 p-8"><h1 className="text-2xl font-semibold">หน้าเว็บทำงานต่อไม่ได้</h1><p className="text-sm leading-relaxed text-base-content/75">ข้อมูลที่บันทึกอยู่ในฐานข้อมูล ลองเปิดส่วนนี้ใหม่ หากยังเกิดซ้ำให้ดูสาเหตุและคัดลอกรายงาน</p><div className="flex gap-3"><button className="btn btn-primary" onClick={reset}>ลองเปิดใหม่</button><ErrorCenter/></div></main>;
}
