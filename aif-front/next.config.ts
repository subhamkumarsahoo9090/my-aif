import type { NextConfig } from "next";
import path from "node:path";

const repoRoot = path.join(process.cwd(), "..");

const nextConfig: NextConfig = {
  outputFileTracingRoot: repoRoot,
  turbopack: {
    root: repoRoot,
  },
};

export default nextConfig;
