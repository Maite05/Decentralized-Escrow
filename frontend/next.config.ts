import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  webpack(config) {
    config.resolve.alias = {
      ...config.resolve.alias,
      // @contracts → contracts/shared — resolved relative to the monorepo root
      "@contracts": path.resolve(__dirname, "../contracts/shared"),
    };
    return config;
  },
};

export default nextConfig;
