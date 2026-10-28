"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Logo } from "./Logo";
import { SyncBadge, buttonClass, gradientGreen } from "./ui";
import { useBrowserOnline, useSyncSnapshot } from "@/lib/sync-bus";

const NAV = [
  { href: "/", label: "Jogos", match: (p: string) => p === "/" || (p.startsWith("/jogos/") && p !== "/jogos/novo") },
];

function PlusIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path d="M8 3v10M3 8h10" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
    </svg>
  );
}

export function AppHeader() {
  const path = usePathname();
  const snap = useSyncSnapshot();
  const online = useBrowserOnline();
  const isPublic = path.startsWith("/ao-vivo/");
  const status = snap.status ?? (online ? "online" : "offline");

  return (
    <header className="app-header sticky top-0 z-30 border-b border-line bg-bg/75 backdrop-blur-xl">
      <div className="mx-auto flex h-16 w-full max-w-[1200px] items-center justify-between gap-3 px-4">
        <div className="flex items-center gap-5">
          <Link href="/" className="-ml-1 flex min-h-12 items-center rounded-btn px-1" aria-label="Início">
            <Logo size={34} />
          </Link>
          {!isPublic && (
            <nav aria-label="Principal" className="app-nav hidden items-center gap-1 rounded-full border border-line bg-white/[0.04] p-1 md:flex">
              {NAV.map((n) => (
                <Link
                  key={n.href}
                  href={n.href}
                  aria-current={n.match(path) ? "page" : undefined}
                  className={`inline-flex min-h-10 items-center rounded-full px-4 text-[15px] font-semibold transition-[background-color,color] duration-150 ${
                    n.match(path) ? "bg-white/[0.1] text-ink shadow-[inset_0_1px_0_rgba(255,255,255,.08)]" : "text-muted hover:text-ink"
                  }`}
                >
                  {n.label}
                </Link>
              ))}
            </nav>
          )}
        </div>
        <div className="flex items-center gap-2.5">
          {!isPublic && <SyncBadge status={status} pending={snap.pending} />}
          {!isPublic && path !== "/jogos/novo" && (
            <Link href="/jogos/novo" className={`app-nav ${buttonClass("default", `${gradientGreen} !px-4 sm:!px-5`)}`} aria-label="Novo jogo">
              <PlusIcon />
              <span className="hidden sm:inline">Novo jogo</span>
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
