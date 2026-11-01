import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  distDir: process.env.NEXT_BUILD_DIR || '.next',
  output: 'standalone',
  async redirects() {
    return [
      // Direct alias paths to official module workspaces inside Shell
      { source: '/yarn-knitting', destination: '/modules/yarn-knitting', permanent: false },
      { source: '/greige-store', destination: '/modules/greige-store', permanent: false },
      { source: '/finished-fabric', destination: '/modules/finished-fabric', permanent: false },
      { source: '/dyeing', destination: '/modules/dyeing', permanent: false },
    ];
  },
};

export default nextConfig;
