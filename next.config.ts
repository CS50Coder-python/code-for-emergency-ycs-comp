import type { NextConfig } from "next";

/** STATIC_PREVIEW=1 builds a client-only export (no API routes) for a hosted preview. */
const preview = process.env.STATIC_PREVIEW === "1";

const nextConfig: NextConfig = {
  transpilePackages: ["react-leaflet", "leaflet"],
  ...(preview ? { output: "export", trailingSlash: true, distDir: ".next-preview" } : {}),
};

export default nextConfig;
