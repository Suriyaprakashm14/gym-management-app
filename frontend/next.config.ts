import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ['@ant-design/cssinjs'],
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  webpack: (config, { dev }) => {
    // Prevent intermittent dev runtime corruption on Windows where
    // .next/cache webpack pack files go missing and break module loading.
    if (dev) {
      config.cache = false;
    }
    return config;
  },
};

export default nextConfig;
