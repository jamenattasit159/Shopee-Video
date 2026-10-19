import type { Metadata } from "next";
import "@fontsource/noto-sans-thai/400.css";
import "@fontsource/noto-sans-thai/500.css";
import "@fontsource/noto-sans-thai/600.css";
import "./globals.css";
export const metadata: Metadata = {title:"shopee_gpt — Real footage. Better stories.",description:"สตูดิโอจัดการฟุตเทจจริง สคริปต์ เสียง และโปรเจกต์ CapCut สำหรับครีเอเตอร์ไทย"};
export default function Layout({children}:{children:React.ReactNode}) {
  return <html lang="th" data-theme="dark" suppressHydrationWarning><body className="bg-base-200 font-sans text-base-content antialiased">{children}</body></html>;
}
