import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@ant-design/cssinjs"],
  typescript: {
    ignoreBuildErrors: true,
  },
  turbopack: {
    root: process.cwd(),
  },
  experimental: {
    optimizePackageImports: [
      "antd",
      "@ant-design/icons",
      "lucide-react",
      "framer-motion",
    ],
  },
};

export default nextConfig;
