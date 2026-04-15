import { WagmiProvider } from "wagmi";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";
import { wagmiConfig } from "../wagmi.config";
import type { ReactNode } from "react";

export function Providers({ children }: { children: ReactNode }) {
  // QueryClient must live in state so each request gets its own instance
  // in SSR / HMR — prevents cache sharing across users and hot-reload bugs.
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            // 30 s stale time by default; individual hooks can override.
            staleTime: 30_000,
            retry: 1,
          },
        },
      })
  );

  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </WagmiProvider>
  );
}
