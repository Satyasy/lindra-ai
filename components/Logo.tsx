import Link from "next/link";
import Image from "next/image";

// Logo Lindra TERPUSAT — satu aset, satu komponen, dipakai di semua permukaan merek
// (landing publik, Portal BK, dan chrome aplikasi siswa — §1.4, keputusan pemilik produk).
//
// Mark berwarna dengan latar transparan (/lindra-logo.png): ia membawa shield mint
// sendiri, jadi SUDAH kontras di atas --ink (terverifikasi). Karena itu TIDAK ada varian
// putih / filter invert — pada logo dua-warna ini, siluet putih justru meleburkan kedua
// tangan jadi satu blob & menghapus maknanya. tone="light" hanya memutihkan WORDMARK teks
// agar terbaca di latar --ink.
//
// object-contain + w-auto max-w-full + dimensi eksplisit → mark tak pernah melebihi kontainer.
export function Logo({
  href = "/",
  wordmark = true,
  tone = "dark",
  markClassName = "h-9",
  className = "",
}: {
  href?: string | null; // null → render <span> (mis. di dalam sidebar, tanpa navigasi)
  wordmark?: boolean; // false → mark saja (chrome siswa)
  tone?: "dark" | "light"; // light → wordmark putih untuk latar --ink
  markClassName?: string;
  className?: string;
}) {
  const inner = (
    <>
      <Image
        src="/lindra-logo.png"
        // Wordmark tampil → mark dekoratif (teks membawa nama). Mark saja → alt bermerek.
        alt={wordmark ? "" : "Lindra"}
        width={2000}
        height={2000}
        priority
        className={`${markClassName} w-auto max-w-full object-contain`}
      />
      {wordmark && (
        <span
          className={`text-lg font-bold tracking-[-0.02em] ${
            tone === "light" ? "text-white" : "text-ink"
          }`}
        >
          Lindra
        </span>
      )}
    </>
  );

  const cls = `inline-flex items-center gap-2 ${className}`;
  if (href === null) return <span className={cls}>{inner}</span>;
  return (
    <Link href={href} aria-label="Lindra — beranda" className={cls}>
      {inner}
    </Link>
  );
}
