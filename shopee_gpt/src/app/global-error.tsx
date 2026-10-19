"use client";
import "./globals.css";
export default function GlobalError({reset}:{reset:()=>void}){
  return <html lang="th" data-theme="dark"><body className="bg-base-200 text-base-content"><main className="mx-auto max-w-2xl space-y-5 p-8"><h1 className="text-2xl font-semibold">สตูดิโอโหลดไม่สำเร็จ</h1><p className="text-sm leading-loose">ถ้าเพิ่งอัปเดตระบบ ให้เปิด terminal ที่ shopee_gpt แล้วรัน npm run dev จากนั้นโหลดหน้านี้ใหม่ ข้อมูลที่บันทึกไว้ยังอยู่ใน data</p><div className="flex flex-wrap gap-3"><button className="btn btn-primary" onClick={reset}>ลองเปิดใหม่</button><button className="btn btn-outline" onClick={()=>location.reload()}>โหลดหน้าใหม่ทั้งหมด</button></div></main></body></html>;
}
