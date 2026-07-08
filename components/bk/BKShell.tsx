"use client";

import { useState } from "react";
import { Inbox, LogOut, PanelLeftClose, PanelLeftOpen, User } from "lucide-react";

// Shell interaktif Portal BK — sidebar bisa diciutkan ke ICON RAIL (~w-16) agar
// antrean melebar. State di useState (instan) + cookie "bk-sidebar-collapsed"
// (dibaca server di layout → initialCollapsed, tanpa flash saat reload). ponytail:
// cukup CSS transition + cookie, tanpa library. Reduced-motion dimatikan global
// (globals.css). Collapse hanya md+ (mobile pakai top-header, tak berubah).
const COOKIE = "bk-sidebar-collapsed";

export function BKShell({
  userName,
  roleLabel,
  isSatgas,
  signOutAction,
  initialCollapsed,
  children,
}: {
  userName: string;
  roleLabel: string;
  isSatgas: boolean;
  signOutAction: () => void | Promise<void>;
  initialCollapsed: boolean;
  children: React.ReactNode;
}) {
  const [collapsed, setCollapsed] = useState(initialCollapsed);
  const accentVar = {
    "--role-accent": isSatgas ? "var(--role-satgas)" : "var(--role-bk)",
  } as React.CSSProperties;

  function toggle() {
    const next = !collapsed;
    setCollapsed(next); // instan, tanpa reload
    document.cookie = `${COOKIE}=${next ? "1" : "0"}; path=/; max-age=31536000; samesite=lax`;
  }

  return (
    <div className="flex min-h-dvh bg-background">
      {/* Sidebar desktop (md+) — collapsible */}
      <aside
        style={accentVar}
        className={`fixed inset-y-0 left-0 z-40 flex flex-col bg-ink py-6 text-white transition-[width] duration-200 max-md:hidden ${
          collapsed ? "w-16 px-2" : "w-60 px-5"
        }`}
      >
        {/* Header: brand + tombol toggle (SELALU terlihat) */}
        <div className={`mb-7 flex items-center ${collapsed ? "justify-center" : "justify-between"}`}>
          {!collapsed && (
            <div>
              <p className="text-[1.7rem] font-extrabold leading-none tracking-tight">Lindra</p>
              <p className="mt-1.5 text-[0.75rem] font-semibold uppercase tracking-[0.18em] text-[color:var(--role-accent)]">
                {roleLabel}
              </p>
            </div>
          )}
          <button
            type="button"
            onClick={toggle}
            aria-expanded={!collapsed}
            aria-label={collapsed ? "Perluas menu" : "Ciutkan menu"}
            title={collapsed ? "Perluas menu" : "Ciutkan menu"}
            className="flex size-9 shrink-0 items-center justify-center rounded-[var(--radius-sm)] text-white/70 transition-colors hover:bg-white/10 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--role-accent)]"
          >
            {collapsed ? (
              <PanelLeftOpen className="size-5" strokeWidth={2} aria-hidden />
            ) : (
              <PanelLeftClose className="size-5" strokeWidth={2} aria-hidden />
            )}
          </button>
        </div>

        {/* Profil staf */}
        <div
          className={`mb-7 flex items-center border-y border-white/10 py-4 ${
            collapsed ? "justify-center" : "gap-3"
          }`}
        >
          <span
            className="flex size-9 shrink-0 items-center justify-center rounded-full bg-white/10"
            title={collapsed ? userName : undefined}
          >
            <User className="size-4.5 text-[color:var(--role-accent)]" strokeWidth={2} aria-hidden />
          </span>
          {!collapsed && (
            <span className="min-w-0">
              <span className="block truncate text-sm font-medium text-white">{userName}</span>
              <span className="block text-[0.75rem] text-white/55">{roleLabel}</span>
            </span>
          )}
        </div>

        {/* Nav — item ikon-saja saat collapsed tetap punya label (sr-only) + tooltip */}
        <nav className="flex-1">
          <span
            className={`relative flex items-center rounded-[var(--radius-sm)] bg-white/10 py-2.5 text-sm font-medium ${
              collapsed ? "justify-center px-2" : "gap-2.5 px-3"
            }`}
            title={collapsed ? "Antrean Laporan" : undefined}
          >
            <span
              className="absolute inset-y-1.5 left-0 w-[3px] rounded-full bg-[var(--role-accent)]"
              aria-hidden
            />
            <Inbox className="size-4 shrink-0 text-[color:var(--role-accent)]" strokeWidth={2} aria-hidden />
            <span className={collapsed ? "sr-only" : ""}>Antrean Laporan</span>
          </span>
        </nav>

        {/* Keluar */}
        <form action={signOutAction}>
          <button
            type="submit"
            title={collapsed ? "Keluar" : undefined}
            className={`flex min-h-11 w-full items-center rounded-[var(--radius-sm)] text-sm text-white/65 transition-colors hover:bg-white/10 hover:text-white ${
              collapsed ? "justify-center px-2" : "gap-2.5 px-3"
            }`}
          >
            <LogOut className="size-4 shrink-0" strokeWidth={2} aria-hidden />
            <span className={collapsed ? "sr-only" : ""}>Keluar</span>
          </button>
        </form>
      </aside>

      {/* Header mobile (max-md) — TIDAK berubah oleh collapse */}
      <div
        style={accentVar}
        className="fixed inset-x-0 top-0 z-40 flex items-center justify-between bg-ink px-4 py-3 text-white md:hidden"
      >
        <p className="font-extrabold">
          Lindra{" "}
          <span className="text-[0.7rem] font-semibold uppercase tracking-widest text-[color:var(--role-accent)]">
            {roleLabel}
          </span>
        </p>
        <form action={signOutAction}>
          <button type="submit" className="flex min-h-11 items-center gap-2 text-sm text-white/80">
            <LogOut className="size-4" aria-hidden />
            Keluar
          </button>
        </form>
      </div>

      {/* Konten — offset menyesuaikan lebar sidebar (md+), melebar saat collapsed */}
      <main
        className={`min-w-0 flex-1 px-6 py-8 transition-[margin] duration-200 max-md:pt-16 ${
          collapsed ? "md:ml-16" : "md:ml-60"
        }`}
      >
        {children}
      </main>
    </div>
  );
}
