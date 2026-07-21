"use client";

import { X } from "lucide-react";

// DESIGN.md §3.2 — keluar cepat: hapus sesi lalu pergi ke situs netral.
// PRODUKSI: replace() di tab yang sama (bukan tab baru) — meninggalkan tab lama
// tetap terbuka justru membahayakan; replace juga menimpa entri riwayat.
// DEMO (NEXT_PUBLIC_DEMO_MODE): buka tab baru supaya juri tak kehilangan app.
// JANGAN pernah pakai perilaku demo di produksi — itu membocorkan halaman ke pelaku.
const DEMO = process.env.NEXT_PUBLIC_DEMO_MODE === "true";

function exit() {
  try {
    fetch("/api/session", { method: "DELETE", keepalive: true });
  } catch {
    /* tetap keluar walau gagal */
  }
  if (DEMO) window.open("https://www.bbc.com/weather", "_blank", "noopener");
  else window.location.replace("https://www.bbc.com/weather");
}

// KLIK SAJA — shortcut keyboard (dulu Shift 3×) DIHAPUS atas keputusan pemilik
// produk: terlalu sensitif, ketrigger tak sengaja saat mengetik (Shift = huruf besar).
export function QuickExit() {
  return (
    <button
      onClick={exit}
      aria-label="Keluar cepat dari halaman ini"
      className="fixed top-4 right-4 z-[970] flex min-h-12 items-center gap-2 rounded-full bg-danger px-5 font-semibold text-white shadow-[var(--shadow-lift)] transition-transform hover:scale-[1.03] max-sm:top-auto max-sm:bottom-0 max-sm:left-0 max-sm:right-0 max-sm:rounded-none max-sm:justify-center"
    >
      <X className="size-5" strokeWidth={2} aria-hidden />
      Keluar cepat
    </button>
  );
}
