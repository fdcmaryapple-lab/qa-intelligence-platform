import type { NextConfig } from "next";

// Validates required environment variables at build/start time.
// Fails fast with a clear error instead of surfacing obscure runtime failures.
import "./lib/env";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  typescript: {
    ignoreBuildErrors: false,
  },
  experimental: {
    serverActions: {
      bodySizeLimit: "10mb",
    },
  },
};

export default nextConfig;
