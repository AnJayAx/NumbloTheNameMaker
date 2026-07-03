/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  webpack: (config, { dev }) => {
    if (dev) {
      // Windows note: webpack's persistent filesystem cache frequently fails to
      // finalize the temp -> final rename of .next/cache/*.pack.gz (antivirus or
      // cloud-sync locking the file). That leaves a half-written cache and later
      // throws "Cannot find module './xxx.js'". Using an in-memory cache in dev
      // avoids the rename entirely at the cost of a slightly slower cold start.
      config.cache = { type: "memory" };
    }
    return config;
  },
};

export default nextConfig;
