import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@reelvault/shared', '@reelvault/design-tokens'],
  // L'erreur de parser eslint-config-next ne doit pas bloquer le build (ni sur Vercel).
  eslint: { ignoreDuringBuilds: true },
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '**.cdninstagram.com' },
      { protocol: 'https', hostname: '**.fbcdn.net' },
      { protocol: 'https', hostname: 'placehold.co' },
      { protocol: 'https', hostname: 'scontent.cdninstagram.com' },
    ],
  },
};

export default nextConfig;
