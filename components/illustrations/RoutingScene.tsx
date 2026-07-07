import { cn } from "@/lib/utils";

// "Gambar yang berbicara" — alur rute: cerita siswa dipilah aturan yang bisa diaudit,
// lalu diteruskan ke BK / Satgas / SAPA 129. Kalem & abstrak (jalur, tempat berlindung),
// tanpa menggambarkan kekerasan. Token Lindra. role="img" + title/desc untuk a11y.
export function RoutingScene({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 480 200"
      width="480"
      height="200"
      className={cn("h-auto w-full", className)}
      role="img"
      aria-labelledby="rs-title rs-desc"
    >
      <title id="rs-title">Alur rute laporan</title>
      <desc id="rs-desc">
        Ceritamu dipilah oleh aturan yang bisa diaudit, lalu diteruskan ke salah satu dari tiga
        jalur bantuan: BK sekolah, Satgas daerah, atau SAPA 129.
      </desc>

      {/* alur tersambung penuh: cerita → titik pilah → tiga tujuan */}
      <path d="M82 100H128" stroke="var(--primary)" strokeWidth="2.5" fill="none" strokeLinecap="round" />
      <path d="M172 100C232 82 282 54 322 44" stroke="var(--primary)" strokeWidth="2.5" fill="none" strokeLinecap="round" />
      <path d="M172 100H322" stroke="var(--primary)" strokeWidth="2.5" fill="none" strokeLinecap="round" />
      <path d="M172 100C232 118 282 146 322 156" stroke="var(--primary)" strokeWidth="2.5" fill="none" strokeLinecap="round" />

      {/* titik cerita (kiri) */}
      <circle cx="52" cy="100" r="30" fill="var(--primary-soft)" />
      <path d="M38 90h28a5 5 0 0 1 5 5v11a5 5 0 0 1-5 5H52l-8 6v-6h-6a5 5 0 0 1-5-5V95a5 5 0 0 1 5-5Z" fill="var(--surface)" stroke="var(--primary-deep)" strokeWidth="2" />
      <line x1="44" y1="99" x2="62" y2="99" stroke="var(--primary-deep)" strokeWidth="2" strokeLinecap="round" />
      <line x1="44" y1="105" x2="57" y2="105" stroke="var(--primary-deep)" strokeWidth="2" strokeLinecap="round" opacity="0.6" />

      {/* titik pilah (tengah) — aturan yang bisa diaudit */}
      <circle cx="150" cy="100" r="24" fill="var(--primary)" />
      <path d="M140 100h7" stroke="var(--ink)" strokeWidth="2.5" strokeLinecap="round" />
      <path d="M147 100c6 0 8-8 13-11M147 100h13M147 100c6 0 8 8 13 11" stroke="var(--ink)" strokeWidth="2.5" fill="none" strokeLinecap="round" />

      {/* tujuan: BK sekolah (rumah) */}
      <circle cx="346" cy="44" r="24" fill="var(--primary-soft)" />
      <path d="M334 46l12-10 12 10v9a2 2 0 0 1-2 2h-20a2 2 0 0 1-2-2z" fill="var(--ink)" />
      <rect x="342" y="49" width="8" height="8" rx="1.5" fill="var(--primary-soft)" />

      {/* tujuan: Satgas (perisai) */}
      <circle cx="346" cy="100" r="24" fill="var(--primary-soft)" />
      <path d="M346 88l10 4v8c0 7-5 11-10 13-5-2-10-6-10-13v-8z" fill="var(--ink)" />
      <path d="M341 100l3.5 3.5 6-6.5" stroke="var(--surface)" strokeWidth="2.2" fill="none" strokeLinecap="round" strokeLinejoin="round" />

      {/* tujuan: SAPA 129 (hati/care) */}
      <circle cx="346" cy="156" r="24" fill="var(--primary-soft)" />
      <path d="M346 166c-9-6-13-11-13-16a5.5 5.5 0 0 1 13-2 5.5 5.5 0 0 1 13 2c0 5-4 10-13 16Z" fill="var(--ink)" />

      {/* label ringkas */}
      <text x="52" y="150" textAnchor="middle" fontSize="12.5" fontWeight="600" fill="var(--ink)">Ceritamu</text>
      <text x="150" y="144" textAnchor="middle" fontSize="12.5" fontWeight="600" fill="var(--ink)">Dipilah</text>
      <text x="378" y="48" fontSize="12.5" fontWeight="600" fill="var(--ink)">BK sekolah</text>
      <text x="378" y="104" fontSize="12.5" fontWeight="600" fill="var(--ink)">Satgas</text>
      <text x="378" y="160" fontSize="12.5" fontWeight="600" fill="var(--ink)">SAPA 129</text>
    </svg>
  );
}
