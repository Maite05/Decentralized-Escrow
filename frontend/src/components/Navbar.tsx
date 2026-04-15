import Link from "next/link";
import { useRouter } from "next/router";
import { WalletButton } from "./WalletButton";

interface NavbarProps {
  backHref?: string;
  backLabel?: string;
}

export function Navbar({ backHref, backLabel = "Back" }: NavbarProps) {
  const router = useRouter();
  const isActive = (href: string) =>
    router.pathname === href || router.pathname.startsWith(href + "/");

  return (
    <header className="sticky top-0 z-10 bg-white/90 backdrop-blur-md border-b border-slate-200">
      <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between gap-4">
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
            <Link href="/" className="flex items-center gap-2.5 shrink-0">
              <div className="w-7 h-7 rounded-lg bg-indigo-600 flex items-center justify-center text-white font-bold text-xs">
                DE
              </div>
              <span className="font-bold text-slate-900 hidden sm:block text-sm">
                Decentralized Escrow
              </span>
            </Link>
          )}

          {!backHref && (
            <nav className="hidden sm:flex items-center gap-0.5 ml-2">
              {[
                { href: "/",       label: "Dashboard"  },
                { href: "/jobs",   label: "Jobs"       },
                { href: "/create", label: "New Escrow" },
              ].map(({ href, label }) => (
                <Link
                  key={href}
                  href={href}
                  className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
                    isActive(href)
                      ? "text-indigo-600 bg-indigo-50"
                      : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                  }`}
                >
                  {label}
                </Link>
              ))}
            </nav>
          )}
        </div>

        <WalletButton />
      </div>
    </header>
  );
}
