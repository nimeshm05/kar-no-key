import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  turbopack: {
    // Parent lockfile was causing Next to infer the wrong workspace root.
    root: path.join(__dirname),
  },
};

export default nextConfig;
