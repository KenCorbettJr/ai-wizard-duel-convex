import type { NextConfig } from "next";

import { loadEnvConfig } from "@next/env";

const projectDir = process.cwd();
loadEnvConfig(projectDir);

const remotePatterns = [];

if (process.env.ENV === "dev") {
  remotePatterns.push(
    new URL("https://doting-bloodhound-926.convex.cloud/api/storage/**")
  );
} else if (process.env.ENV === "emulate") {
  remotePatterns.push(new URL("http://127.0.0.1:3210/api/storage/**"));
}

const nextConfig: NextConfig = {
  images: {
    remotePatterns,
  },
};

export default nextConfig;
