import type { NextConfig } from "next";
import path from "node:path";
const config: NextConfig = {
  distDir: process.env.STUDIO_DIST_DIR || ".next-dev",
  turbopack: { root: path.resolve(process.cwd()) },
  serverExternalPackages: ["ffprobe-static", "ffmpeg-static", "archiver"],
  experimental: { proxyClientMaxBodySize: "520mb" },
  async headers() {
    return [{ source: "/:path*", headers: [
      { key: "X-Content-Type-Options", value: "nosniff" },
      { key: "Referrer-Policy", value: "same-origin" },
      { key: "X-Frame-Options", value: "DENY" }
    ] }];
  }
};
export default config;
