import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      new URL("https://doting-bloodhound-926.convex.cloud/api/storage/**"),
    ],
  },
};

export default nextConfig;
