import path from 'node:path';
import type { NextConfig } from 'next';

const isDev = process.env.NODE_ENV === 'development';
const distDir = process.env.NEXT_DIST_DIR || (isDev ? '.next-dev' : '.next');

const nextConfig: NextConfig = {
  transpilePackages: ['@moneyflow/shared'],
  distDir,
  outputFileTracingRoot: path.join(__dirname, '../../'),
};

export default nextConfig;
