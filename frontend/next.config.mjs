import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,

  webpack(config, { isServer }) {
    // ── Module aliases ──────────────────────────────────────────────────────
    config.resolve.alias = {
      ...config.resolve.alias,
      "@contracts": path.resolve(__dirname, "../contracts/shared"),
      // Stub React Native dep pulled in by wallet SDKs in browser builds
      "@react-native-async-storage/async-storage": path.resolve(
        __dirname,
        "src/lib/empty-module.js"
      ),
    };

    // ── Node.js built-in fallbacks (browser only) ───────────────────────────
    // wagmi / viem / WalletConnect transitively reference these modules.
    // Under MetaMask's SES lockdown the browser doesn't expose them, so we
    // tell webpack to stub them out rather than bundle them or throw.
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs:       false,
        net:      false,
        tls:      false,
        crypto:   false,
        stream:   false,
        url:      false,
        zlib:     false,
        http:     false,
        https:    false,
        assert:   false,
        os:       false,
        path:     false,
        buffer:   false,
        process:  false,
        util:     false,
        events:   false,
      };
    }

    return config;
  },
};

export default nextConfig;
