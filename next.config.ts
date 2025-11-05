import type { NextConfig } from "next";
import { RemotePattern } from "next/dist/shared/lib/image-config";

const remotePatterns: RemotePattern[] = [];

if (process.env.ENV === "dev") {
  remotePatterns.push({
    protocol: "https",
    hostname: "doting-bloodhound-926.convex.cloud",
    port: "",
    pathname: "/api/storage/**",
  });
} else if (process.env.ENV === "emulate") {
  // For emulation mode, use proxy route to avoid Next.js 16 private IP restrictions
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
