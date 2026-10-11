/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    serverComponentsExternalPackages: [
      "@remotion/renderer",
      "@remotion/bundler",
      "@imgly/background-removal-node",
      "onnxruntime-node",
      "sharp",
      "archiver",
    ],
  },
  webpack: (config, { isServer }) => {
    // Allows loading video and font assets cleanly
    config.module.rules.push({
      test: /\.(mp4|webm)$/,
      type: "asset/resource",
    });
    return config;
  },
};

export default nextConfig;
