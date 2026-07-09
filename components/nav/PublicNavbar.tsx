"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, Menu, X } from "lucide-react";
import { Logo } from "@/components/Logo";

// Navbar Situs Informasi publik (landing). Urutan kiri→kanan (navbar-contoh.png):
// Logo · Cara kerja · Kerahasiaan · FAQ · | · Masuk · "Buka chat" · (QuickExit, pil merah).
// QuickExit sendiri dirender sebagai sibling fixed di page (BUKAN di dalam header ini —
// backdrop-blur header jadi containing block & merusak posisi bottom-bar mobile QuickExit).
const NAV = [
  { label: "Cara kerja", href: "/#cara-kerja" },
  { label: "Kerahasiaan", href: "/#kerahasiaan" },
  { label: "FAQ", href: "/#faq" },
];

// Inlined build-time oleh Next (NEXT_PUBLIC_*). §1.9: "Buka chat" → /chat HANYA saat
// demo juri; flag ≠ 'true' → link absen dari DOM (bukan display:none). "Masuk" (→ /bk/login)
// bukan /chat, jadi selalu tampil.
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
      <nav className="flex items-center justify-between gap-4 py-3 px-5 sm:px-8">
        <Logo className="min-h-11" />

        {/* Cluster desktop ≥840 — rata kanan (justify-between): Logo kiri, cluster kanan.
            QuickExit sudah tak ada di landing, jadi tak perlu reserve/pemusatan. */}
        <div className="flex items-center gap-1 max-[840px]:hidden">
          {NAV.map((n) => (
            <Link
              key={n.href}
              href={n.href}
              className="flex min-h-11 items-center rounded-full px-3 text-sm font-medium text-text-soft transition-colors hover:text-ink"
            >
              {n.label}
            </Link>
          ))}

          {/* Pemisah vertikal */}
          <span className="mx-1.5 h-5 w-px bg-border" aria-hidden />

          {/* Masuk — staf BK/Satgas, selalu tersedia (bukan /chat, tak di-gate) */}
          <Link
            href="/bk/login"
            className="flex min-h-11 items-center rounded-full px-3 text-sm font-medium text-ink transition-colors hover:bg-surface-alt"
          >
            Masuk
          </Link>

          {/* CTA pil hijau "Buka chat" → /chat (demo-gated §1.9). Teks --ink di atas --primary. */}
          {demo && (
            <Link
              href="/chat"
              className="ml-1 flex h-11 items-center gap-2 rounded-full bg-primary pl-5 pr-4 text-sm font-semibold text-ink transition-colors hover:bg-primary-deep"
            >
              Buka chat
              <ArrowRight className="size-4" strokeWidth={2.25} aria-hidden />
            </Link>
          )}
        </div>

        {/* Hamburger <760 */}
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-label={open ? "Tutup menu" : "Buka menu"}
          className="hidden size-11 items-center justify-center rounded-full text-ink transition-colors hover:bg-surface-alt max-[840px]:flex"
        >
          {open ? <X className="size-6" aria-hidden /> : <Menu className="size-6" aria-hidden />}
        </button>
      </nav>

      {/* Drawer <760 — inline di bawah bar, bukan modal mendadak (§1.10) */}
      {open && (
        <div className="border-t border-border bg-surface px-5 py-3 min-[840px]:hidden">
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
              className="flex min-h-11 items-center rounded-[var(--radius-sm)] px-3 font-medium text-ink transition-colors hover:bg-surface-alt"
            >
              Masuk
            </Link>
            {demo && (
              <Link
                href="/chat"
                onClick={() => setOpen(false)}
                className="mt-1 flex min-h-11 items-center justify-center gap-2 rounded-full bg-primary px-5 font-semibold text-ink transition-colors hover:bg-primary-deep"
              >
                Buka chat
                <ArrowRight className="size-4" strokeWidth={2.25} aria-hidden />
              </Link>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
