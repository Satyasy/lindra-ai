import { cn } from "@/lib/utils";

// Avatar karakter Lindra — teman bicara yang lembut (kepala + bahu di lingkaran mint).
// Warna dari token (DESIGN.md §2); kulit pakai --surface-peach (dekoratif). Dekoratif → aria-hidden.
// sm → avatar bubble AI (32px) · lg → hero card (badge ceklis + aksen).
export function LindraCharacter({
  size = "sm",
  className,
}: {
  size?: "sm" | "lg";
  className?: string;
}) {
  const lg = size === "lg";
  return (
    <svg
      viewBox="0 0 64 64"
      width="64"
      height="64"
      className={cn(lg ? "size-16" : "size-8", className)}
      aria-hidden
      focusable={false}
    >
      <defs>
        <clipPath id="lc-clip">
          <circle cx="32" cy="32" r="32" />
        </clipPath>
      </defs>
      <circle cx="32" cy="32" r="32" fill="var(--primary-soft)" />
      <g clipPath="url(#lc-clip)">
        {/* bahu / baju */}
        <path d="M13 64C13 51 22 47 32 47s19 4 19 17H13Z" fill="var(--primary-deep)" />
        <path d="M27 48c2 2.5 8 2.5 10 0" fill="none" stroke="var(--primary-bright)" strokeWidth="1.4" />
        {/* leher */}
        <path d="M28.5 41h7v7h-7z" fill="var(--surface-peach)" />
        {/* wajah */}
        <circle cx="32" cy="29" r="11.5" fill="var(--surface-peach)" />
        {/* rambut bob (bingkai wajah) */}
        <path
          d="M19 31C18 17 25 12 32 12s14 5 13 19c-.4 4-1.4 6.5-2.6 8.3C42 32 41 21 32 21S22 32 21.6 39.3C20.4 37.5 19.4 35 19 31Z"
          fill="var(--ink)"
        />
        {/* mata */}
        <circle cx="27.6" cy="29" r="1.5" fill="var(--ink)" />
        <circle cx="36.4" cy="29" r="1.5" fill="var(--ink)" />
        {/* pipi */}
        <circle cx="24" cy="32.5" r="1.8" fill="var(--warm-soft)" />
        <circle cx="40" cy="32.5" r="1.8" fill="var(--warm-soft)" />
        {/* senyum */}
        <path
          d="M28.5 33.5c2 2.5 5 2.5 7 0"
          fill="none"
          stroke="var(--ink)"
          strokeWidth="1.6"
          strokeLinecap="round"
        />
      </g>

      {lg && (
        <>
          {/* badge ceklis (terverifikasi/aman) */}
          <circle cx="51" cy="50" r="8.5" fill="var(--primary-deep)" stroke="var(--surface)" strokeWidth="2.5" />
          <path
            d="M47 50.2l2.6 2.6 5-5.4"
            fill="none"
            stroke="#fff"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          {/* aksen daun kiri-atas + percikan kanan-atas */}
          <path d="M9 17c-3-2-3-7 0-9 3 2 3 7 0 9Z" fill="var(--primary)" />
          <path d="M55 11v6M52 14h6" stroke="var(--warm)" strokeWidth="1.8" strokeLinecap="round" />
        </>
      )}
    </svg>
  );
}
