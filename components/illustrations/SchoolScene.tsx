import { cn } from "@/lib/utils";

// Ilustrasi sekolah kecil untuk pojok header kartu laporan (DESIGN.md §2). Dekoratif.
export function SchoolScene({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 120 92"
      width="120"
      height="92"
      className={cn("h-auto w-28", className)}
      aria-hidden
      focusable={false}
      fill="none"
    >
      {/* tanah */}
      <path d="M6 82H114" stroke="var(--border)" strokeWidth="2" strokeLinecap="round" />
      {/* pohon */}
      <rect x="98" y="60" width="5" height="22" rx="2" fill="var(--warm-deep)" />
      <circle cx="100.5" cy="53" r="12" fill="var(--primary)" />
      <circle cx="94" cy="58" r="7" fill="var(--primary-deep)" />
      {/* gedung */}
      <rect
        x="24"
        y="40"
        width="54"
        height="42"
        rx="3"
        fill="var(--primary-soft)"
        stroke="var(--primary-deep)"
        strokeWidth="1.5"
      />
      {/* atap */}
      <path d="M20 41 51 22 82 41Z" fill="var(--ink)" />
      {/* tiang + bendera */}
      <path d="M51 22V10" stroke="var(--ink-2)" strokeWidth="2" strokeLinecap="round" />
      <path d="M51 11 62 14 51 18Z" fill="var(--warm)" />
      {/* pintu lengkung */}
      <path d="M45 82V64a6 6 0 0 1 12 0v18Z" fill="var(--ink-2)" />
      {/* jendela hangat */}
      <rect x="30" y="50" width="11" height="11" rx="2" fill="var(--warm-soft)" stroke="var(--warm-deep)" strokeWidth="1" />
      <rect x="61" y="50" width="11" height="11" rx="2" fill="var(--warm-soft)" stroke="var(--warm-deep)" strokeWidth="1" />
    </svg>
  );
}
