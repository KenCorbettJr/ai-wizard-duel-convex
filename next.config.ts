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
  webpack: (config, { isServer }) => {
    if (!isServer) {
      // Don't bundle server-only packages for the client
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        path: false,
        stream: false,
        zlib: false,
        events: false,
        dgram: false,
        url: false,
        crypto: false,
        os: false,
        util: false,
        buffer: false,
        assert: false,
        http: false,
        https: false,
        net: false,
        tls: false,
      };

      // Exclude server-only packages from client bundle
      config.externals = config.externals || [];
      config.externals.push({
        "@genkit-ai/core": "commonjs @genkit-ai/core",
        "@genkit-ai/google-genai": "commonjs @genkit-ai/google-genai",
        "@genkit-ai/googleai": "commonjs @genkit-ai/googleai",
        genkit: "commonjs genkit",
      });
    }
    return config;
  },
};

export default nextConfig;
