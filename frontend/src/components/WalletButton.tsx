import { useState, useRef, useEffect } from "react";
import { useWallet } from "../hooks/useWallet";

function ChainBadge({ name }: { name: string }) {
  return (
    <span className="flex items-center gap-1 text-xs bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full font-medium">
      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />
      {name}
    </span>
  );
}

export function WalletButton() {
  const {
    address,
    isConnected,
    isWrongChain,
    connect,
    connectors,
    isConnecting,
    disconnect,
    switchChain,
    isSwitching,
    TARGET_CHAIN,
  } = useWallet();

  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  if (isConnected && isWrongChain) {
    return (
      <button
        type="button"
        onClick={() => switchChain({ chainId: TARGET_CHAIN.id })}
        disabled={isSwitching}
        className="btn-danger text-xs px-3 py-1.5"
      >
        {isSwitching ? (
          <>
            <Spinner /> Switching…
          </>
        ) : (
          <>
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
            </svg>
            Switch to {TARGET_CHAIN.name}
          </>
        )}
      </button>
    );
  }

  if (isConnected && address) {
    return (
      <div className="flex items-center gap-2">
        <ChainBadge name={TARGET_CHAIN.name} />
        <div className="relative" ref={ref}>
          <button
            type="button"
            onClick={() => setOpen(!open)}
            className="flex items-center gap-2 bg-slate-100 hover:bg-slate-200 px-3 py-1.5 rounded-xl text-sm font-mono text-slate-700 transition-colors"
          >
            <span className="w-5 h-5 rounded-full bg-gradient-to-br from-blue-400 to-indigo-600 flex-shrink-0" />
            {address.slice(0, 6)}…{address.slice(-4)}
            <svg className={`w-3.5 h-3.5 text-slate-400 transition-transform ${open ? "rotate-180" : ""}`}
              fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          {open && (
            <div className="absolute right-0 top-full mt-2 w-48 card shadow-lg py-1 z-20">
              <button
                type="button"
                onClick={() => { navigator.clipboard.writeText(address); setOpen(false); }}
                className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2"
              >
                <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
                Copy address
              </button>
              <a
                href={`${TARGET_CHAIN.blockExplorers?.default.url}/address/${address}`}
                target="_blank"
                rel="noreferrer"
                onClick={() => setOpen(false)}
                className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2"
              >
                <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
                View on explorer
              </a>
              <div className="border-t border-slate-100 my-1" />
              <button
                type="button"
                onClick={() => { disconnect(); setOpen(false); }}
                className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                Disconnect
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Not connected — show connector picker
  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        disabled={isConnecting}
        className="btn-primary"
      >
        {isConnecting ? (
          <><Spinner /> Connecting…</>
        ) : (
          <>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            Connect Wallet
          </>
        )}
      </button>
      {open && !isConnecting && (
        <div className="absolute right-0 top-full mt-2 w-52 card shadow-lg py-2 z-20">
          <p className="px-4 py-1 text-xs font-semibold text-slate-400 uppercase tracking-wide">
            Choose wallet
          </p>
          {connectors.map((connector) => (
            <button
              key={connector.id}
              type="button"
              onClick={() => { connect({ connector }); setOpen(false); }}
              className="w-full text-left px-4 py-2.5 text-sm text-slate-800 hover:bg-slate-50 font-medium flex items-center gap-3 transition-colors"
            >
              <ConnectorIcon name={connector.name} />
              {connector.name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function Spinner() {
  return (
    <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  );
}

function ConnectorIcon({ name }: { name: string }) {
  const lower = name.toLowerCase();
  if (lower.includes("metamask")) {
    return <span className="w-6 h-6 rounded-full bg-orange-100 text-orange-500 flex items-center justify-center text-xs font-bold">M</span>;
  }
  if (lower.includes("coinbase")) {
    return <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs font-bold">C</span>;
  }
  return <span className="w-6 h-6 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center text-xs font-bold">W</span>;
}
