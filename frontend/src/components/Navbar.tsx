import Link from "next/link";
import { WalletButton } from "./WalletButton";

interface NavbarProps {
  backHref?: string;
  backLabel?: string;
}

export function Navbar({ backHref, backLabel = "Back" }: NavbarProps) {
  return (
    <header className="sticky top-0 z-10 bg-white/80 backdrop-blur border-b border-slate-200">
      <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between gap-4">
        <div className="flex items-center gap-4 min-w-0">
          {backHref ? (
            <Link
              href={backHref}
              className="flex items-center gap-1.5 text-slate-500 hover:text-slate-900 text-sm font-medium transition-colors shrink-0"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              {backLabel}
            </Link>
          ) : (
            <Link href="/" className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-blue-600 flex items-center justify-center text-white font-bold text-sm">
                DE
              </div>
              <span className="font-bold text-slate-900 hidden sm:block">
                Decentralized Escrow
              </span>
            </Link>
          )}
          {!backHref && (
            <nav className="hidden sm:flex items-center gap-1 ml-2">
              <Link
                href="/"
                className="px-3 py-1.5 text-sm font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
              >
                Escrows
              </Link>
              <Link
                href="/jobs"
                className="px-3 py-1.5 text-sm font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
              >
                Jobs
              </Link>
            </nav>
          )}
        </div>
        <WalletButton />
      </div>
    </header>
  );
}
