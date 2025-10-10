import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  eslint: {
    // Ignore ESLint errors during production build
    ignoreDuringBuilds: true,
  },
  typescript: {
    // Only run TypeScript checking for production files
    ignoreBuildErrors: false,
  },
  // Performance optimizations for development
  productionBrowserSourceMaps: false,
  // Development optimizations
  ...(process.env.NODE_ENV === 'development' && {
    // Compiler optimizations for development
    compiler: {
      // Disable some heavy optimizations in dev
      removeConsole: false,
    },
  }),
  // Production optimizations
  ...(process.env.NODE_ENV === 'production' && {
    compiler: {
      removeConsole: {
        exclude: ['error', 'warn'],
      },
    },
  }),
  // API route optimizations
  async headers() {
    return [
      {
        source: '/api/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: process.env.NODE_ENV === 'development'
              ? 'no-cache, no-store, must-revalidate'
              : 'public, max-age=300, stale-while-revalidate=600'
          },
        ],
      },
    ]
  },
  // Subdomain routing rewrites
  async rewrites() {
    return {
      beforeFiles: [
        // Rewrite subdomain requests to /[tenant] path
        // Example: simmerdown.localhost:3000/admin -> localhost:3000/simmerdown/admin
        {
          source: '/:path*',
          has: [
            {
              type: 'host',
              value: '(?<subdomain>[^.]+)\\.localhost(?:\\:\\d+)?',
            },
          ],
          destination: '/:subdomain/:path*',
        },
        // Handle root path with subdomain
        {
          source: '/',
          has: [
            {
              type: 'host',
              value: '(?<subdomain>[^.]+)\\.localhost(?:\\:\\d+)?',
            },
          ],
          destination: '/:subdomain',
        },
      ],
    };
  },
};

export default nextConfig;
