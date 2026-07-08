import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

// "Gambar yang berbicara" — alur rute: cerita siswa dipilah aturan yang bisa diaudit,
// lalu diteruskan ke BK / Satgas / SAPA 129. Kalem & abstrak, tanpa menggambarkan
// kekerasan. Dua layout: horizontal (desktop) + tumpuk vertikal (mobile). Token Lindra.
// role="img" + title/desc a11y. Tanpa library — SVG inline.

// Ikon tiap simpul, digambar terpusat di (0,0) supaya bisa dipakai ulang di dua layout.
const ICONS: Record<string, ReactNode> = {
  bubble: (
    <>
      <path
        d="M-11 -8h19a3 3 0 0 1 3 3v8a3 3 0 0 1-3 3H-3l-6 5v-5h-2a3 3 0 0 1-3-3v-8a3 3 0 0 1 3-3Z"
        fill="var(--surface)"
        stroke="var(--primary-deep)"
        strokeWidth={2}
      />
      <path d="M-7 -2h13M-7 3h8" stroke="var(--primary-deep)" strokeWidth={2} strokeLinecap="round" />
    </>
  ),
  split: (
    <path
      d="M-11 0h7M-4 0c6 0 8-8 14-11M-4 0h14M-4 0c6 0 8 8 14 11"
      stroke="var(--ink)"
      strokeWidth={2.4}
      fill="none"
      strokeLinecap="round"
    />
  ),
  house: (
    <>
      <path d="M-11 0l11-9 11 9v8a2 2 0 0 1-2 2h-18a2 2 0 0 1-2-2z" fill="var(--ink)" />
      <rect x={-3.5} y={2} width={7} height={7} rx={1} fill="var(--surface)" />
    </>
  ),
  shield: (
    <>
      <path d="M0 -11l10 4v7c0 7-5 11-10 13-5-2-10-6-10-13v-7z" fill="var(--ink)" />
      <path
        d="M-5 0l3.5 3.5 6-6.5"
        stroke="var(--surface)"
        strokeWidth={2.2}
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </>
  ),
  heart: (
    <path
      d="M0 9c-9-6-13-11-13-16a5.5 5.5 0 0 1 13-2 5.5 5.5 0 0 1 13-2 5.5 5.5 0 0 1 0 4c0 5-4 10-13 16Z"
      fill="var(--ink)"
    />
  ),
};

function Node({
  x,
  y,
  tint,
  icon,
  r = 26,
}: {
  x: number;
  y: number;
  tint: string;
  icon: keyof typeof ICONS;
  r?: number;
}) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <circle r={r} fill={tint} />
      {ICONS[icon]}
    </g>
  );
}

const STROKE = {
  stroke: "var(--primary)",
  strokeWidth: 2.5,
  fill: "none",
  strokeLinecap: "round" as const,
};

export function RoutingScene({ className }: { className?: string }) {
  return (
    <div className={cn("mx-auto w-full", className)}>
      {/* Desktop: horizontal */}
      <svg
        viewBox="0 0 520 236"
        className="hidden h-auto w-full sm:block"
        role="img"
        aria-labelledby="rs-title-d rs-desc-d"
      >
        <title id="rs-title-d">Alur rute laporan</title>
        <desc id="rs-desc-d">
          Ceritamu dipilah oleh aturan yang bisa diaudit, lalu diteruskan ke salah satu dari tiga jalur
          bantuan: BK sekolah, Satgas daerah, atau SAPA 129.
        </desc>

        <path d="M90 118H184" {...STROKE} />
        <path d="M236 116C288 92 322 62 358 50" {...STROKE} />
        <path d="M236 118H358" {...STROKE} />
        <path d="M236 120C288 144 322 174 358 186" {...STROKE} />

        <Node x={64} y={118} tint="var(--primary-soft)" icon="bubble" />
        <Node x={210} y={118} tint="var(--primary)" icon="split" />
        <Node x={384} y={48} tint="var(--primary-soft)" icon="house" />
        <Node x={384} y={118} tint="var(--warm-soft)" icon="shield" />
        <Node x={384} y={188} tint="var(--danger-soft)" icon="heart" />

        <g fontSize="12.5" fontWeight="600" fill="var(--ink)">
          <text x="64" y="162" textAnchor="middle">Ceritamu</text>
          <text x="210" y="162" textAnchor="middle">Dipilah</text>
          <text x="416" y="52">BK sekolah</text>
          <text x="416" y="122">Satgas</text>
          <text x="416" y="192">SAPA 129</text>
        </g>
      </svg>

      {/* Mobile: tumpuk vertikal */}
      <svg
        viewBox="0 0 300 360"
        className="mx-auto block h-auto w-full max-w-[280px] sm:hidden"
        role="img"
        aria-labelledby="rs-title-m rs-desc-m"
      >
        <title id="rs-title-m">Alur rute laporan</title>
        <desc id="rs-desc-m">
          Ceritamu dipilah oleh aturan yang bisa diaudit, lalu diteruskan ke salah satu dari tiga jalur
          bantuan: BK sekolah, Satgas daerah, atau SAPA 129.
        </desc>

        <path d="M150 72V132" {...STROKE} />
        <path d="M148 184C120 224 80 258 62 274" {...STROKE} />
        <path d="M150 184V274" {...STROKE} />
        <path d="M152 184C180 224 220 258 238 274" {...STROKE} />

        <Node x={150} y={46} tint="var(--primary-soft)" icon="bubble" />
        <Node x={150} y={158} tint="var(--primary)" icon="split" />
        <Node x={60} y={300} tint="var(--primary-soft)" icon="house" />
        <Node x={150} y={300} tint="var(--warm-soft)" icon="shield" />
        <Node x={240} y={300} tint="var(--danger-soft)" icon="heart" />

        <g fontSize="13" fontWeight="600" fill="var(--ink)">
          <text x="150" y="90" textAnchor="middle">Ceritamu</text>
          <text x="186" y="162">Dipilah</text>
          <text x="60" y="344" textAnchor="middle">BK</text>
          <text x="150" y="344" textAnchor="middle">Satgas</text>
          <text x="240" y="344" textAnchor="middle">SAPA 129</text>
        </g>
      </svg>
    </div>
  );
}
