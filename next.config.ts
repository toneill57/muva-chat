import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Build cache configuration for faster rebuilds
  cacheMaxMemorySize: 50, // 50MB cache (default is 50MB)

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
        // Example: simmerdown.dev.muva.chat/login -> muva.chat/simmerdown/login
        // Using afterFiles ensures Next.js internal routes (_next/*) are handled first
        //
        // IMPORTANT: API routes are EXCLUDED from this rewrite because:
        // 1. API routes live in src/app/api/* (not src/app/[tenant]/api/*)
        // 2. Middleware already injects x-tenant-subdomain header for tenant context
        // 3. Rewriting /api/* to /[tenant]/api/* causes 404s (handler not found)
        {
          source: '/:path((?!api).*)*',  // Exclude /api/* routes using named capture with negative lookahead
          has: [
            {
              type: 'host',
              // Match: subdomain.localhost OR subdomain.{anything}.localhost OR subdomain.muva.chat OR subdomain.{anything}.muva.chat
              // The {anything} part (staging, dev, test, exe, etc.) is ignored - only subdomain is captured
              value: '(?<subdomain>[^.]+)\\.(?:[^.]+\\.)?(?:localhost|muva\\.chat)(?:\\:\\d+)?',
            },
          ],
          destination: '/:subdomain/:path*',
        },
      ],
    };
  },
};

export default nextConfig;
