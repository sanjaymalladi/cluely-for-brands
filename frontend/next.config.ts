import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Removed static export to enable Vercel Functions
  // output: 'export',  <- This disables API routes!
  trailingSlash: false,  // Disable trailing slashes for API routes
  
  images: {
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
      {
        protocol: "https",
        hostname: "replicate.delivery",
      },
      {
        protocol: "https",
        hostname: "pbxt.replicate.delivery",
      },
    ],
  },
};

export default nextConfig; 