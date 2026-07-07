"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Menu, X } from "lucide-react";
import { Logo } from "@/components/Logo";

// Navbar Situs Informasi publik (landing & halaman info). DESIGN.md §5.1 + §1.9:
// TIDAK menautkan /chat kecuali mode demo juri (di-gate NEXT_PUBLIC_DEMO_MODE).
const NAV = [
  { label: "Cara kerja", href: "/#cara-kerja" },
  { label: "Kerahasiaan", href: "/#kerahasiaan" },
  { label: "FAQ", href: "/#faq" },
];

// Inlined build-time oleh Next (NEXT_PUBLIC_*). Kalau flag ≠ 'true', tombol
// "Buka chat" TIDAK dirender → absen dari DOM, bukan sekadar display:none.
const demo = process.env.NEXT_PUBLIC_DEMO_MODE === "true";

export function PublicNavbar() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  // Toggle state glass di scrollY > 24 — tanpa library, listener pasif.
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={`fixed inset-x-0 top-0 z-[960] transition-[background-color,box-shadow,border-color] duration-200 ${
        scrolled
          ? "border-b border-border bg-[color-mix(in_srgb,var(--surface)_72%,transparent)] shadow-[var(--shadow-soft)] backdrop-blur-[14px]"
          : "border-b border-transparent"
      }`}
    >
      {/* min-[760px]:pr menyisakan ruang kanan untuk QuickExit (z-970) di desktop
          agar tak bertabrakan — ponytail: reserve hanya saat link tampil. */}
      <nav className="flex items-center justify-between gap-4 py-3 pl-5 pr-5 sm:pl-8 min-[760px]:pr-[11.5rem]">
        <Logo className="min-h-11" />

        {/* Cluster desktop ≥760 */}
        <div className="flex items-center gap-1 max-[760px]:hidden">
          {NAV.map((n) => (
            <Link
              key={n.href}
              href={n.href}
              className="rounded-full px-3 py-2 text-sm font-medium text-text-soft transition-colors hover:text-ink"
            >
              {n.label}
            </Link>
          ))}
          <Link
            href="/bk/login"
            className="ml-1 flex h-11 items-center rounded-full px-4 text-sm font-semibold text-ink transition-colors hover:bg-surface-alt"
          >
            Masuk
          </Link>
          {demo && (
            <Link
              href="/chat"
              className="ml-1 flex h-11 items-center rounded-full bg-primary px-5 text-sm font-semibold text-ink transition-colors hover:bg-primary-deep"
            >
              Buka chat
            </Link>
          )}
        </div>

        {/* Hamburger <760 */}
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-label={open ? "Tutup menu" : "Buka menu"}
          className="hidden size-11 items-center justify-center rounded-full text-ink transition-colors hover:bg-surface-alt max-[760px]:flex"
        >
          {open ? <X className="size-6" aria-hidden /> : <Menu className="size-6" aria-hidden />}
        </button>
      </nav>

      {/* Drawer <760 — inline di bawah bar, bukan modal mendadak (§1.10) */}
      {open && (
        <div className="border-t border-border bg-surface px-5 py-3 min-[760px]:hidden">
          <div className="flex flex-col gap-1">
            {NAV.map((n) => (
              <Link
                key={n.href}
                href={n.href}
                onClick={() => setOpen(false)}
                className="flex min-h-11 items-center rounded-[var(--radius-sm)] px-3 text-text-soft transition-colors hover:bg-surface-alt hover:text-ink"
              >
                {n.label}
              </Link>
            ))}
            <Link
              href="/bk/login"
              onClick={() => setOpen(false)}
              className="flex min-h-11 items-center rounded-[var(--radius-sm)] px-3 font-semibold text-ink transition-colors hover:bg-surface-alt"
            >
              Masuk
            </Link>
            {demo && (
              <Link
                href="/chat"
                onClick={() => setOpen(false)}
                className="mt-1 flex min-h-11 items-center justify-center rounded-full bg-primary px-5 font-semibold text-ink transition-colors hover:bg-primary-deep"
              >
                Buka chat
              </Link>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
