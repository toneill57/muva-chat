import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Build cache configuration for faster rebuilds
  cacheMaxMemorySize: 50, // 50MB cache (default is 50MB)

  // Allow dev server to handle requests from subdomain origins
  allowedDevOrigins: [
    // Match localhost subdomains (e.g., simmerdown.localhost, simmerdown.staging.localhost)
    /^https?:\/\/[a-z0-9-]+(?:\.[a-z0-9-]+)*\.localhost(?::\d+)?$/,
  ],

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
      beforeFiles: [],
      afterFiles: [
        // Rewrite subdomain + path to /[tenant]/path
        // Example: simmerdown.localhost:3000/login -> localhost:3000/simmerdown/login
        // Example: simmerdown.staging.localhost:3000/login -> localhost:3000/simmerdown/login
        // Using afterFiles ensures Next.js internal routes (_next/*) are handled first
        {
          source: '/:path*',
          has: [
            {
              type: 'host',
              // Match: subdomain.localhost OR subdomain.staging.localhost OR subdomain.muva.chat OR subdomain.staging.muva.chat
              value: '(?<subdomain>[^.]+)\\.(?:staging\\.)?(?:localhost|muva\\.chat)(?:\\:\\d+)?',
            },
          ],
          destination: '/:subdomain/:path*',
        },
      ],
    };
  },
};

export default nextConfig;
