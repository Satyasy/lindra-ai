"use client";

import { useState } from "react";
import Link from "next/link";
import { Bookmark, Heart, Home, Menu, Phone, Plus, Route, Sparkles, X } from "lucide-react";
import { LeafSpray } from "@/components/illustrations";

// Mark merek Lindra — hati dari daun (heart-leaf). Dekoratif → aria-hidden.
function BrandMark({ className = "size-8" }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" width="32" height="32" className={className} aria-hidden focusable={false}>
      <path
        d="M16 27C7 21 4 16 4 11.5A4.5 4.5 0 0 1 16 8.5 4.5 4.5 0 0 1 28 11.5C28 16 25 21 16 27Z"
        fill="var(--primary)"
      />
      <path d="M16 25V11" stroke="var(--primary-deep)" strokeWidth="1.6" strokeLinecap="round" />
      <path
        d="M16 18c-3.5-.6-5.5-2.6-5.8-5.6M16 16c3.5-.6 5.5-2.6 5.8-5.6"
        stroke="var(--primary-deep)"
        strokeWidth="1.6"
        fill="none"
        strokeLinecap="round"
      />
    </svg>
  );
}

// Shell aplikasi siswa (permukaan aman). DESIGN.md §5.2.
// Branding "Lindra" di sidebar dipakai atas permintaan eksplisit (demo juri);
// TAB TITLE tetap netral "Catatan Harian" (app/(student)/layout.tsx) demi §1.4 —
// itu yang paling berisiko diintip di riwayat/tab perangkat siswa.
// Shell tinggi-tetap (h-dvh) supaya chat punya area scroll + input tersemat.
const ITEMS = [
  { label: "Percakapan baru", href: "/chat", icon: Plus, primary: true },
  { label: "Lanjutkan nanti", href: "/draft", icon: Bookmark },
  { label: "Lacak status", href: "/lacak", icon: Route },
  { label: "Kembali ke beranda", href: "/", icon: Home },
];

// Darurat inline (§1 poin 2) — 110 · 129 · 119, --danger karena sinyal krisis nyata.
const DARURAT = [
  { label: "Polisi", tel: "110" },
  { label: "SAPA", tel: "129" },
  { label: "Ambulans", tel: "119" },
];

export function StudentNav({ children }: { children?: React.ReactNode }) {
  const [open, setOpen] = useState(false);

  const nav = (
    <nav className="flex h-full flex-col gap-1 p-4">
      {/* Branding "Lindra" di sidebar — atas permintaan eksplisit (demo). Tab title
          tetap NETRAL "Catatan Harian" (layout §1.4) demi keselamatan perangkat. */}
      <div className="mb-5 flex items-center gap-2.5 px-2 py-1">
        <BrandMark className="size-8 shrink-0" />
        <span>
          <span className="block text-lg font-extrabold leading-none text-ink">Lindra</span>
          <span className="mt-0.5 block text-xs text-text-soft">Teman bicara yang aman</span>
        </span>
      </div>

      {ITEMS.map(({ label, href, icon: Icon, primary }) => (
        <Link
          key={href}
          href={href}
          onClick={() => setOpen(false)}
          className={
            primary
              ? "flex min-h-12 items-center gap-2 rounded-full bg-primary px-4 font-semibold text-ink transition-colors hover:bg-primary-deep"
              : "flex min-h-11 items-center gap-2 rounded-[var(--radius-sm)] px-3 text-sm font-medium text-ink transition-colors hover:bg-surface-alt"
          }
        >
          <Icon className="size-4" strokeWidth={2} aria-hidden />
          {label}
        </Link>
      ))}

      <div className="mt-auto space-y-4 border-t border-border pt-4">
        {/* Tip Hari Ini — kartu dukungan + ilustrasi daun (bukan emoji) */}
        <div className="relative overflow-hidden rounded-[var(--radius-md)] border border-border bg-surface-warm p-3.5">
          <div className="flex items-center gap-1.5">
            <Sparkles className="size-4 text-warm-deep" strokeWidth={2} aria-hidden />
            <p className="text-sm font-semibold text-ink">Tip Hari Ini</p>
          </div>
          <p className="mt-1.5 max-w-[10.5rem] text-sm leading-snug text-text-soft">
            Berani mencari bantuan adalah langkah penting. Kamu tidak sendirian.
          </p>
          <Heart className="mt-2.5 size-4 text-primary-deep" strokeWidth={2} aria-hidden />
          <LeafSpray className="pointer-events-none absolute -bottom-3 -right-2 w-20 opacity-80" />
        </div>

        <p className="px-2 text-sm leading-relaxed text-text-soft">
          Kamu pegang kendali — bisa berhenti kapan saja.
        </p>

        {/* DARURAT — chip merah-outline (--danger), jalur krisis selalu terjangkau (§1.2) */}
        <div className="px-2">
          <p className="mb-2 text-xs font-semibold tracking-wide text-text-soft">DARURAT</p>
          <div className="flex flex-wrap gap-2">
            {DARURAT.map(({ label, tel }) => (
              <a
                key={tel}
                href={`tel:${tel}`}
                className="flex min-h-11 items-center gap-1.5 rounded-full border border-danger px-3.5 text-sm font-semibold text-danger transition-colors hover:bg-danger-soft"
              >
                <Phone className="size-3.5" strokeWidth={2} aria-hidden />
                {label} {tel}
              </a>
            ))}
          </div>
        </div>
      </div>
    </nav>
  );

  return (
    <div className="flex h-dvh flex-col overflow-hidden min-[900px]:flex-row">
      {/* Backdrop drawer <900 (scrim 40%) */}
      {open && (
        <button
          type="button"
          aria-label="Tutup menu"
          onClick={() => setOpen(false)}
          className="fixed inset-0 z-[930] bg-ink/40 min-[900px]:hidden"
        />
      )}

      {/* Sidebar 248px in-flow desktop / drawer slide-in <900 (satu elemen) */}
      <aside
        className={`fixed inset-y-0 left-0 z-[940] w-[248px] shrink-0 border-r border-border bg-surface shadow-[var(--shadow-lift)] transition-transform duration-200 min-[900px]:static min-[900px]:translate-x-0 min-[900px]:shadow-none ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <button
          type="button"
          onClick={() => setOpen(false)}
          aria-label="Tutup menu"
          className="absolute right-3 top-3 flex size-9 items-center justify-center rounded-full text-ink transition-colors hover:bg-surface-alt min-[900px]:hidden"
        >
          <X className="size-5" aria-hidden />
        </button>
        {nav}
      </aside>

      {/* Kolom konten */}
      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        {/* Top bar mobile <900 — hamburger kiri (QuickExit fixed kanan tak bertabrakan) */}
        <header className="flex items-center gap-2 border-b border-border bg-surface px-4 py-3 min-[900px]:hidden">
          <button
            type="button"
            onClick={() => setOpen(true)}
            aria-label="Buka menu"
            aria-expanded={open}
            className="flex size-11 items-center justify-center rounded-full text-ink transition-colors hover:bg-surface-alt"
          >
            <Menu className="size-6" aria-hidden />
          </button>
          <BrandMark className="size-7 shrink-0" />
          <span className="text-lg font-extrabold text-ink">Lindra</span>
        </header>

        <main className="flex min-h-0 flex-1 flex-col">{children}</main>
      </div>
    </div>
  );
}
