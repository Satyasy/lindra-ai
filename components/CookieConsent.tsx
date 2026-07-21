"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { Cookie, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";

const STORAGE_KEY = "lindra_cookie_consent";

// Cookie yang BENAR-BENAR dipakai Lindra — semuanya wajib (fungsional/keamanan),
// tak ada pelacakan/iklan. "Lihat semua cookie" menampilkan daftar ini apa adanya.
const COOKIES = [
  {
    name: "lindra_session",
    purpose: "Menyimpan sesi cerita & laporanmu di perangkat ini — tanpa ini chat tidak jalan.",
  },
  {
    name: "authjs.csrf-token / callback-url",
    purpose: "Keamanan proses login Portal BK (khusus staf sekolah).",
  },
];

// Permukaan siswa: ada QuickExit + input chat fixed di bawah, dan perangkatnya bisa
// diawasi pelaku — banner tidak boleh menumpuk / muncul di sana. Banner hanya tampil
// di landing & halaman publik (pintu masuk pertama ke situs).
// ponytail: daftar prefix rute (student); samakan bila grup itu bertambah rute.
const HIDE_ON = ["/chat", "/draft", "/followup", "/masuk", "/lacak"];

export function CookieConsent() {
  const pathname = usePathname();
  const [show, setShow] = useState(false);
  const [openList, setOpenList] = useState(false);

  useEffect(() => {
    // Client-only: baca pilihan tersimpan. localStorage (BUKAN cookie) supaya
    // persetujuannya sendiri tak menambah artefak cookie yang justru dikhawatirkan.
    if (!localStorage.getItem(STORAGE_KEY)) setShow(true);
  }, []);

  if (!show || HIDE_ON.some((p) => pathname.startsWith(p))) return null;

  const choose = (v: "accepted" | "rejected") => {
    // Semua cookie di sini wajib, jadi "Tolak" hanya merekam preferensi — tak ada
    // cookie non-esensial untuk dihapus (kalau kelak ada, hapus di sini).
    localStorage.setItem(STORAGE_KEY, v);
    setShow(false);
  };

  return (
    <div
      role="region"
      aria-label="Preferensi cookie"
      className="bubble-in fixed inset-x-0 bottom-0 z-50 border-t border-border bg-surface p-4 shadow-[var(--shadow-soft)] sm:inset-x-auto sm:bottom-4 sm:right-4 sm:max-w-sm sm:rounded-[var(--radius-md)] sm:border"
    >
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-3 sm:max-w-none">
        <div className="flex items-start gap-3">
          <Cookie className="mt-0.5 size-5 shrink-0 text-primary-ink" strokeWidth={2} aria-hidden />
          <div className="min-w-0">
            <p className="text-sm leading-relaxed text-text-soft">
              Lindra hanya memakai cookie yang <strong className="font-semibold text-ink">wajib</strong> supaya
              situs berfungsi — tidak ada pelacakan atau iklan.
            </p>
            <button
              type="button"
              onClick={() => setOpenList((v) => !v)}
              aria-expanded={openList}
              className="mt-1 inline-flex min-h-11 items-center gap-1 text-sm font-medium text-primary-ink hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-deep"
            >
              Lihat semua cookie
              <ChevronDown
                className={`size-4 transition-transform ${openList ? "rotate-180" : ""}`}
                strokeWidth={2}
                aria-hidden
              />
            </button>
          </div>
        </div>

        {openList && (
          <ul className="rounded-[var(--radius-sm)] border border-border bg-surface-alt p-3 text-xs leading-relaxed text-text-soft">
            {COOKIES.map((c) => (
              <li key={c.name} className="py-1">
                <span className="font-semibold text-ink">{c.name}</span> — {c.purpose}
              </li>
            ))}
            <li className="pt-1">Pilihanmu disimpan lokal di perangkat ini, bukan sebagai cookie.</li>
          </ul>
        )}

        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => choose("rejected")}
            className="min-h-11 flex-1 rounded-full px-5 font-semibold sm:flex-none"
          >
            Tolak
          </Button>
          <Button
            onClick={() => choose("accepted")}
            className="min-h-11 flex-1 rounded-full px-5 font-semibold sm:flex-none"
          >
            Terima
          </Button>
        </div>
      </div>
    </div>
  );
}
