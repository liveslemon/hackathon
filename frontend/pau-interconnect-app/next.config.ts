import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: false,
  async rewrites() {
    return [
      {
        source: '/api/cv/:name',
        destination: '/api/redirect-cv', // We'll use a tiny client redirector to avoid Next.js external rewrite bugs
      },
    ];
  },
};

export default nextConfig;
