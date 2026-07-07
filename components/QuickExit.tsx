"use client";

import { useEffect, useRef } from "react";
import { X } from "lucide-react";

// DESIGN.md §3.2 — keluar cepat: hapus sesi lalu pergi ke situs netral.
// ponytail: replace() di tab yang sama (bukan tab baru) — meninggalkan tab lama
// tetap terbuka justru membahayakan; replace juga menimpa entri riwayat.
function exit() {
  try {
    fetch("/api/session", { method: "DELETE", keepalive: true });
  } catch {
    /* tetap keluar walau gagal */
  }
  window.location.replace("https://www.bbc.com/weather");
}

export function QuickExit() {
  const presses = useRef<number[]>([]);

  // Shortcut: Shift 3× dalam 5 detik (BUKAN Escape)
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key !== "Shift") return;
      const now = Date.now();
      presses.current = [...presses.current.filter((t) => now - t < 5000), now];
      if (presses.current.length >= 3) exit();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <button
      onClick={exit}
      aria-label="Keluar cepat dari halaman ini (atau tekan Shift tiga kali)"
      className="fixed top-4 right-4 z-[970] flex min-h-12 items-center gap-2 rounded-full bg-danger px-5 font-semibold text-white shadow-[var(--shadow-lift)] transition-transform hover:scale-[1.03] max-sm:top-auto max-sm:bottom-0 max-sm:left-0 max-sm:right-0 max-sm:rounded-none max-sm:justify-center"
    >
      <X className="size-5" strokeWidth={2} aria-hidden />
      Keluar cepat
    </button>
  );
}
