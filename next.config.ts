import type { NextConfig } from "next";

import { loadEnvConfig } from "@next/env";
import { RemotePattern } from "next/dist/shared/lib/image-config";

const projectDir = process.cwd();
loadEnvConfig(projectDir);

const remotePatterns: RemotePattern[] = [];

if (process.env.ENV === "dev") {
  remotePatterns.push({
    protocol: "https",
    hostname: "doting-bloodhound-926.convex.cloud",
    port: "",
    pathname: "/api/storage/**",
  });
} else if (process.env.ENV === "emulate") {
  // For emulation mode, we'll proxy through our own API route
  remotePatterns.push({
    protocol: "http",
    hostname: "localhost",
    port: "3000",
    pathname: "/api/convex-image/**",
  });
}

const nextConfig: NextConfig = {
  images: {
    remotePatterns,
  },
  cacheComponents: true,
  reactCompiler: true,
};

export default nextConfig;
