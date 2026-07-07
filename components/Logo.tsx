import Link from "next/link";
import { ShieldCheck } from "lucide-react";

// DESIGN.md §3.5 — Logo bermerek "Lindra", HANYA untuk landing publik & Portal BK.
// BUKAN di chrome aplikasi siswa (di sana judul netral "Catatan Harian", §1.4).
// ponytail: mark = ikon lucide dalam kotak mint. Ganti ke
// <Image src="/lindra-logo.png"> begitu aset final ada — sengaja tidak me-refer
// PNG yang belum ada di /public (hindari broken image).
export function Logo({ className = "" }: { className?: string }) {
  return (
    <Link
      href="/"
      aria-label="Lindra — beranda"
      className={`inline-flex items-center gap-2 text-ink ${className}`}
    >
      <span className="grid size-8 place-items-center rounded-[10px] bg-primary">
        <ShieldCheck className="size-5 text-ink" strokeWidth={2} aria-hidden />
      </span>
      <span className="text-lg font-bold tracking-[-0.02em]">Lindra</span>
    </Link>
  );
}
