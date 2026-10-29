import type { NextConfig } from 'next';

// Old Merchandising / Sample / Yarn / Knitting / Dyeing screens were removed.
// Every old link now opens the current pages.
const MERCH = '/merchandising/index.html';
const YK = '/yarn-knitting/index.html';
const DYE = '/dyeing/index.html'; // Dyeing & Finishing desk (Finish Fabric Plan & Execution), served by /api/dyeing

const nextConfig: NextConfig = {
  output: 'standalone',
  async redirects() {
    return [
      { source: '/merchandising', destination: MERCH, permanent: false },
      { source: '/merchandising/:path((?!index\\.html$).*)', destination: MERCH, permanent: false },
      { source: '/modules/merchandising', destination: MERCH, permanent: false },
      { source: '/modules/sample-merchandising', destination: MERCH, permanent: false },
      { source: '/modules/yarn', destination: YK, permanent: false },
      { source: '/modules/yarn-store', destination: YK, permanent: false },
      { source: '/modules/knitting', destination: YK, permanent: false },
      { source: '/yarn-knitting', destination: YK, permanent: false },
      { source: '/modules/dyeing', destination: DYE, permanent: false },
      { source: '/dyeing', destination: DYE, permanent: false },
    ];
  },
};

export default nextConfig;
