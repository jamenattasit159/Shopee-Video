import type { Metadata } from "next";
import { Noto_Sans_Thai } from "next/font/google";
import "./globals.css";
import { GlobalErrorTrap } from "@/components/GlobalErrorTrap";
import { ErrorToaster } from "@/components/ErrorToaster";
import { ErrorCenterDrawer } from "@/components/ErrorCenterDrawer";

const notoSansThai = Noto_Sans_Thai({
  subsets: ["thai", "latin"],
  weight: ["300", "400", "500", "600", "700"],
  display: "swap",
  variable: "--font-noto-thai",
});

export const metadata: Metadata = {
  title: "Shopee Affiliate Video Production System",
  description:
    "สร้างคลิปขายสินค้าอัตโนมัติ พร้อมสคริปต์ เสียงพากย์ AI และดาวน์โหลดวิดีโอพร้อมเผยแพร่",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="th" data-theme="paper" className={notoSansThai.variable} suppressHydrationWarning>
      <body className="min-h-screen bg-base-200 text-base-content antialiased font-sans" suppressHydrationWarning>
        <GlobalErrorTrap />
        {children}
        <ErrorToaster />
        <ErrorCenterDrawer />
      </body>
    </html>
  );
}

