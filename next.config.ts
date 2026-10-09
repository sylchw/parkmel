import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  output: "standalone",
  outputFileTracingIncludes: { "/api/annotations": ["./data/coverage-sections.json"] },
};

export default nextConfig;