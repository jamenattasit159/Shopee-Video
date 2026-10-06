import type { Metadata } from "next";
import "./globals.css";

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
    <html lang="th" className="dark">
      <body className="min-h-screen bg-slate-950 text-slate-100 antialiased selection:bg-orange-500 selection:text-white">
        {children}
      </body>
    </html>
  );
}
