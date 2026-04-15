import { useEffect, useRef } from "react";
import { DEMO_WALLETS, useDemoWallet, type DemoWalletEntry } from "../contexts/DemoWallet";

const ROLE_BADGE: Record<string, string> = {
  CLIENT:     "badge-blue",
  FREELANCER: "badge-green",
  MEDIATOR:   "badge-purple",
};

interface Props {
  onClose: () => void;
}

export function DemoWalletModal({ onClose }: Props) {
  const { demoWallet, setDemoWallet } = useDemoWallet();
  const backdropRef = useRef<HTMLDivElement>(null);

  // Close on Escape
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  function select(wallet: DemoWalletEntry) {
    setDemoWallet(wallet);
    onClose();
  }

  function disconnect() {
    setDemoWallet(null);
    onClose();
  }

  return (
    <div
      ref={backdropRef}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
      onClick={(e) => { if (e.target === backdropRef.current) onClose(); }}
    >
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">

        {/* Header */}
        <div className="px-6 pt-6 pb-4 border-b border-slate-100">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="font-bold text-slate-900 text-lg">Demo Mode</h2>
              <p className="text-sm text-slate-500 mt-0.5">
                Pick a wallet to explore the platform without MetaMask.
                All data is real — transactions are simulated.
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="text-slate-400 hover:text-slate-600 transition-colors mt-0.5 shrink-0"
              aria-label="Close"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Wallet list */}
        <div className="p-3 space-y-1 max-h-[60vh] overflow-y-auto">
          {DEMO_WALLETS.map((w) => {
            const isActive = demoWallet?.address.toLowerCase() === w.address.toLowerCase();
            return (
              <button
                key={w.address}
                type="button"
                onClick={() => select(w)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-all ${
                  isActive
                    ? "bg-indigo-50 border border-indigo-200"
                    : "hover:bg-slate-50 border border-transparent"
                }`}
              >
                {/* Avatar */}
                <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${w.color} flex items-center justify-center shrink-0`}>
                  <span className="text-white font-bold text-sm">{w.name.slice(0, 2)}</span>
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-slate-800 text-sm">{w.name}</span>
                    <span className={`badge ${ROLE_BADGE[w.role]} text-xs`}>{w.role}</span>
                    {isActive && (
                      <span className="ml-auto text-indigo-600">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                        </svg>
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">{w.description}</p>
                  <p className="text-xs font-mono text-slate-400 mt-0.5">
                    {w.address.slice(0, 8)}…{w.address.slice(-6)}
                  </p>
                </div>
              </button>
            );
          })}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-between gap-3">
          {demoWallet ? (
            <button
              type="button"
              onClick={disconnect}
              className="text-sm text-red-600 hover:text-red-700 font-medium transition-colors"
            >
              Exit demo mode
            </button>
          ) : (
            <p className="text-xs text-slate-400">No wallet selected</p>
          )}
          <button type="button" onClick={onClose} className="btn-outline text-sm">
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
