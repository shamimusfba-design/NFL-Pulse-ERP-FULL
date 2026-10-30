import type { NextConfig } from 'next';

// Old Merchandising / Sample / Yarn / Knitting / Dyeing / Greige store / Finished fabric store screens were removed.
// Every old link now opens the current pages.
const MERCH = '/merchandising/index.html';
const YK = '/yarn-knitting/index.html';
const GREIGE = '/greige-store/index.html'; // Greige Fabric Store (prototype page, browser storage until its API is built)
const FINISHED = '/finished-fabric/index.html'; // Finished Fabric Store (prototype page)
const DYE = '/dyeing/index.html'; // Dyeing & Finishing desk (Finish Fabric Plan & Execution), served by /api/dyeing

const nextConfig: NextConfig = {
  distDir: process.env.NEXT_BUILD_DIR || '.next',
  output: 'standalone',
  async redirects() {
    return [
      { source: '/merchandising', destination: MERCH, permanent: false },
      { source: '/merchandising/:path((?!index\\.html$).*)', destination: MERCH, permanent: false },
      { source: '/modules/merchandising', destination: MERCH, permanent: false },
      { source: '/modules/sample-merchandising', destination: MERCH, permanent: false },
      { source: '/modules/yarn-knitting', destination: YK, permanent: false },
      { source: '/modules/yarn', destination: YK, permanent: false },
      { source: '/modules/yarn-store', destination: YK, permanent: false },
      { source: '/modules/knitting', destination: YK, permanent: false },
      { source: '/yarn-knitting', destination: YK, permanent: false },
      { source: '/modules/dyeing', destination: DYE, permanent: false },
      { source: '/dyeing', destination: DYE, permanent: false },
      { source: '/modules/greige-store', destination: GREIGE, permanent: false },
      { source: '/modules/finished-fabric', destination: FINISHED, permanent: false },
    ];
  },
};

export default nextConfig;
