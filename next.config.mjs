/** @type {import('next').NextConfig} */
const isGitHubPages = process.env.GITHUB_ACTIONS === "true";

const nextConfig = {
  output: "export",
  basePath: isGitHubPages ? "/WalletViz" : "",
  assetPrefix: isGitHubPages ? "/WalletViz/" : "",
  images: { unoptimized: true },
  webpack: (config, { isServer }) => {
    if (isServer) {
      config.externals = [...(config.externals || []), "better-sqlite3"];
    }
    return config;
  },
};

export default nextConfig;
