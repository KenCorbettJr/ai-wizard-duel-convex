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
  // For emulation mode, allow direct access to local Convex server
  remotePatterns.push({
    protocol: "http",
    hostname: "127.0.0.1",
    port: "3210",
    pathname: "/api/storage/**",
  });
  // Also keep the proxy route as fallback
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
