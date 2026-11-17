import type { NextConfig } from "next";
import { RemotePattern } from "next/dist/shared/lib/image-config";

const remotePatterns: RemotePattern[] = [];

if (process.env.ENV === "emulate") {
  // For emulation mode, use proxy route to avoid Next.js 16 private IP restrictions
  remotePatterns.push({
    protocol: "http",
    hostname: "localhost",
    port: "3000",
    pathname: "/api/convex-image/**",
  });
} else {
  // Allow storage images from whichever Convex deployment this build points at,
  // so dev, prod, and new deployments need no hardcoded hostnames.
  const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
  if (convexUrl) {
    remotePatterns.push({
      protocol: "https",
      hostname: new URL(convexUrl).hostname,
      port: "",
      pathname: "/api/storage/**",
    });
  }
}

const nextConfig: NextConfig = {
  images: {
    remotePatterns,
  },
  cacheComponents: true,
  reactCompiler: true,
  experimental: {
    serverActions: {
      bodySizeLimit: "2mb",
    },
  },
};

export default nextConfig;
