import type { Metadata } from "next";
import { Noto_Sans_Thai } from "next/font/google";
import "./globals.css";

const notoSansThai = Noto_Sans_Thai({
  subsets: ["thai", "latin"],
  weight: ["300", "400", "500", "600", "700"],
  display: "swap",
  variable: "--font-noto-thai",
});

export const metadata: Metadata = {
  title: "Shopee Affiliate Video Production System",
  description:
    "AI-Powered Automated Shopee Affiliate Short-form Video Generator (Next.js + Remotion + Google Gemini)",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="th" data-theme="dark" className={`dark ${notoSansThai.variable}`}>
      <body className="min-h-screen bg-base-100 text-base-content antialiased font-sans">
        {children}
      </body>
    </html>
  );
}

