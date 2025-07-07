import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Enable static export for deployment
  output: 'export',
  trailingSlash: true,
  distDir: 'out',
  
  images: {
    unoptimized: true, // Required for static export
    remotePatterns: [
      {
        protocol: "https",
        hostname: "napkinsdev.s3.us-east-1.amazonaws.com",
      },
      {
        protocol: "https",
        hostname: "api.together.ai",
      },
      {
        protocol: "https",
        hostname: "fal.media",
      },
    ],
  },
};

export default nextConfig; 