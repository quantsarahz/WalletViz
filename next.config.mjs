/** @type {import('next').NextConfig} */
const nextConfig = {
  // Exclude native modules from webpack bundling (for local dev API routes)
  webpack: (config, { isServer }) => {
    if (isServer) {
      config.externals = [...(config.externals || []), "better-sqlite3"];
    }
    return config;
  },
};

export default nextConfig;
