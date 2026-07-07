"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, BookOpen, Bookmark, Menu, Phone, Plus, Route, X } from "lucide-react";

// Shell aplikasi siswa (permukaan aman). DESIGN.md §1.4 + §5.2:
// judul NETRAL "Catatan Harian", BUKAN Logo/nama "Lindra" yang mencolok.
// Pintasan chat WAJIB terlihat di sini. Shell tinggi-tetap (h-dvh) supaya
// halaman chat bisa punya area pesan yang scroll + input tersemat.
const ITEMS = [
  { label: "Percakapan baru", href: "/chat", icon: Plus, primary: true },
  { label: "Lanjutkan nanti", href: "/draft", icon: Bookmark },
  { label: "Lacak status", href: "/lacak", icon: Route },
  { label: "Kembali ke beranda", href: "/", icon: ArrowLeft },
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
      <div className="mb-4 flex items-center gap-2 px-2 py-1">
        <BookOpen className="size-5 text-primary-ink" strokeWidth={2} aria-hidden />
        <span className="text-base font-semibold text-ink">Catatan Harian</span>
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

      <div className="mt-auto border-t border-border pt-4">
        <p className="mb-3 px-2 text-sm leading-relaxed text-text-soft">
          Kamu pegang kendali — bisa berhenti kapan saja.
        </p>
        <div className="px-2">
          <p className="mb-2 text-xs font-semibold tracking-wide text-text-soft">DARURAT</p>
          <div className="flex flex-wrap gap-x-4 gap-y-1">
            {DARURAT.map(({ label, tel }) => (
              <a
                key={tel}
                href={`tel:${tel}`}
                className="flex min-h-11 items-center gap-1 text-sm font-semibold text-danger"
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
          <BookOpen className="size-5 text-primary-ink" strokeWidth={2} aria-hidden />
          <span className="text-base font-semibold text-ink">Catatan Harian</span>
        </header>

        <main className="flex min-h-0 flex-1 flex-col">{children}</main>
      </div>
    </div>
  );
}
