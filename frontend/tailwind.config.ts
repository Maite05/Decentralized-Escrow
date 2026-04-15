import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/**/*.{ts,tsx}",
    "./wagmi.config.ts",       // root-level config (no Tailwind classes, but safe to include)
    "./src/providers.tsx",
  ],
  theme: {
    extend: {},
  },
  plugins: [],
};

export default config;
