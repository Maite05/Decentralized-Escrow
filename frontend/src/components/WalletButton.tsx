import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { useWallet } from "../hooks/useWallet";
import { useDemoWallet, DEMO_WALLETS } from "../contexts/DemoWallet";
import { DemoWalletModal } from "./DemoWalletModal";

const ROLE_COLORS: Record<string, string> = {
  CLIENT:     "from-blue-400 to-indigo-600",
  FREELANCER: "from-emerald-400 to-teal-600",
  MEDIATOR:   "from-slate-400 to-slate-600",
};

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
    address: wagmiAddress,
    isConnected: wagmiConnected,
    isWrongChain,
    connect,
    connectors,
    isConnecting,
    disconnect,
    switchChain,
    isSwitching,
    TARGET_CHAIN,
  } = useWallet();

  const { demoWallet, setDemoWallet, isDemo } = useDemoWallet();
  const [open, setOpen] = useState(false);
  const [showDemoModal, setShowDemoModal] = useState(false);
  const [mounted, setMounted] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  if (!mounted) {
    return (
      <button type="button" disabled className="btn-primary text-sm opacity-0 pointer-events-none">
        Connect Wallet
      </button>
    );
  }

  // ── Demo wallet active ────────────────────────────────────────────────────
  if (isDemo && demoWallet) {
    const gradientCls = DEMO_WALLETS.find(
      (w) => w.address.toLowerCase() === demoWallet.address.toLowerCase()
    )?.color ?? "from-indigo-400 to-purple-500";

    return (
      <>
        <div className="flex items-center gap-2">
          <span className="flex items-center gap-1 text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 inline-block" />
            Demo
          </span>
          <div className="relative" ref={ref}>
            <button
              type="button"
              onClick={() => setOpen(!open)}
              className="flex items-center gap-2 bg-slate-100 hover:bg-slate-200 px-3 py-1.5 rounded-xl text-sm font-medium text-slate-700 transition-colors"
            >
              <div className={`w-4 h-4 rounded-full bg-gradient-to-br ${gradientCls} flex-shrink-0`} />
              {demoWallet.name}
              <span className="text-xs text-slate-400 font-mono">
                {demoWallet.address.slice(0, 5)}…
              </span>
              <svg className={`w-3 h-3 text-slate-400 transition-transform ${open ? "rotate-180" : ""}`}
                fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {open && (
              <div className="absolute right-0 top-full mt-2 w-56 card shadow-lg py-1.5 z-20">
                <div className="px-4 py-2 border-b border-slate-100">
                  <p className="text-xs text-slate-500">Signed in as</p>
                  <p className="font-semibold text-slate-800 text-sm">{demoWallet.name}</p>
                  <p className="text-xs font-mono text-slate-400">{demoWallet.address.slice(0, 8)}…{demoWallet.address.slice(-6)}</p>
                </div>
                <Link
                  href={`/profile/${demoWallet.address.toLowerCase()}`}
                  onClick={() => setOpen(false)}
                  className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2 transition-colors"
                >
                  <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  My Profile
                </Link>
                <button
                  type="button"
                  onClick={() => { setShowDemoModal(true); setOpen(false); }}
                  className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2 transition-colors"
                >
                  <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                  </svg>
                  Switch wallet
                </button>
                <a
                  href={`https://sepolia.etherscan.io/address/${demoWallet.address}`}
                  target="_blank" rel="noreferrer"
                  onClick={() => setOpen(false)}
                  className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2 transition-colors"
                >
                  <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                  Sepolia Etherscan
                </a>
                <div className="border-t border-slate-100 my-1" />
                <button
                  type="button"
                  onClick={() => { setDemoWallet(null); setOpen(false); }}
                  className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2 transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                  Exit demo mode
                </button>
              </div>
            )}
          </div>
        </div>

        {showDemoModal && <DemoWalletModal onClose={() => setShowDemoModal(false)} />}
      </>
    );
  }

  // ── Wrong chain ───────────────────────────────────────────────────────────
  if (wagmiConnected && isWrongChain) {
    return (
      <button
        type="button"
        onClick={() => switchChain({ chainId: TARGET_CHAIN.id })}
        disabled={isSwitching}
        className="btn-danger text-xs px-3 py-1.5"
      >
        {isSwitching ? <><Spinner /> Switching…</> : <>
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
          </svg>
          Switch to {TARGET_CHAIN.name}
        </>}
      </button>
    );
  }

  // ── Real wallet connected ─────────────────────────────────────────────────
  if (wagmiConnected && wagmiAddress) {
    return (
      <div className="flex items-center gap-2">
        <ChainBadge name={TARGET_CHAIN.name} />
        <div className="relative" ref={ref}>
          <button
            type="button"
            onClick={() => setOpen(!open)}
            className="flex items-center gap-2 bg-slate-100 hover:bg-slate-200 px-3 py-1.5 rounded-xl text-sm font-mono text-slate-700 transition-colors"
          >
            <span className="w-4 h-4 rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 flex-shrink-0" />
            {wagmiAddress.slice(0, 6)}…{wagmiAddress.slice(-4)}
            <svg className={`w-3 h-3 text-slate-400 transition-transform ${open ? "rotate-180" : ""}`}
              fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {open && (
            <div className="absolute right-0 top-full mt-2 w-52 card shadow-lg py-1.5 z-20">
              <Link
                href={`/profile/${wagmiAddress}`}
                onClick={() => setOpen(false)}
                className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2 transition-colors"
              >
                <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                My Profile
              </Link>
              <button
                type="button"
                onClick={() => { navigator.clipboard.writeText(wagmiAddress); setOpen(false); }}
                className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2 transition-colors"
              >
                <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
                Copy address
              </button>
              <a
                href={`${TARGET_CHAIN.blockExplorers?.default.url}/address/${wagmiAddress}`}
                target="_blank" rel="noreferrer"
                onClick={() => setOpen(false)}
                className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2 transition-colors"
              >
                <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
                View on Etherscan
              </a>
              <div className="border-t border-slate-100 my-1" />
              <button
                type="button"
                onClick={() => { disconnect(); setOpen(false); }}
                className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2 transition-colors"
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

  // ── Not connected ─────────────────────────────────────────────────────────
  return (
    <>
      <div className="relative flex items-center gap-2" ref={ref}>
        <button
          type="button"
          onClick={() => setShowDemoModal(true)}
          className="btn-outline text-sm border-amber-300 text-amber-700 hover:bg-amber-50"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
          </svg>
          Demo
        </button>
        <button
          type="button"
          onClick={() => setOpen(!open)}
          disabled={isConnecting}
          className="btn-primary text-sm"
        >
          {isConnecting ? <><Spinner /> Connecting…</> : <>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            Connect Wallet
          </>}
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

      {showDemoModal && <DemoWalletModal onClose={() => setShowDemoModal(false)} />}
    </>
  );
}

function Spinner() {
  return (
    <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  );
}

function ConnectorIcon({ name }: { name: string }) {
  const lower = name.toLowerCase();
  if (lower.includes("metamask"))
    return <span className="w-6 h-6 rounded-full bg-orange-100 text-orange-500 flex items-center justify-center text-xs font-bold">M</span>;
  if (lower.includes("coinbase"))
    return <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs font-bold">C</span>;
  return <span className="w-6 h-6 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center text-xs font-bold">W</span>;
}
