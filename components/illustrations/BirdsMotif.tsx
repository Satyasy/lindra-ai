import { cn } from "@/lib/utils";

// Motif burung + matahari lembut untuk pojok hero (DESIGN.md §2). Dekoratif.
export function BirdsMotif({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 120 70"
      width="120"
      height="70"
      className={cn("h-auto w-28", className)}
      aria-hidden
      focusable={false}
      fill="none"
    >
      {/* matahari lembut */}
      <circle cx="100" cy="16" r="11" fill="var(--warm-soft)" />
      {/* burung — sepasang lengkung sayap */}
      <path
        d="M12 34Q20 24 28 34 36 24 44 34"
        stroke="var(--ink)"
        strokeWidth="2.6"
        strokeLinecap="round"
      />
      <path
        d="M50 20Q56 12 62 20 68 12 74 20"
        stroke="var(--primary-deep)"
        strokeWidth="2.4"
        strokeLinecap="round"
      />
      <path
        d="M40 52Q47 44 54 52 61 44 68 52"
        stroke="var(--ink-2)"
        strokeWidth="2.2"
        strokeLinecap="round"
      />
    </svg>
  );
}
