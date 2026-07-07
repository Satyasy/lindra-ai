import { cn } from "@/lib/utils";

// Doodle "Tip Hari Ini" — bohlam ide berisi sprout (ide + tumbuh). DESIGN.md §2. Dekoratif.
export function TipDoodle({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 64 64"
      width="64"
      height="64"
      className={cn("h-auto w-16", className)}
      aria-hidden
      focusable={false}
      fill="none"
    >
      {/* cahaya hangat */}
      <circle cx="32" cy="28" r="20" fill="var(--warm-soft)" opacity="0.7" />
      {/* percikan */}
      <path d="M12 15v6M9 18h6" stroke="var(--warm)" strokeWidth="2" strokeLinecap="round" />
      <path d="M52 13v5M49.5 15.5h5" stroke="var(--warm)" strokeWidth="2" strokeLinecap="round" />
      <circle cx="50" cy="41" r="1.8" fill="var(--warm)" />
      {/* kaca bohlam */}
      <circle cx="32" cy="27" r="13" fill="var(--primary-soft)" stroke="var(--primary-deep)" strokeWidth="1.6" />
      {/* sprout di dalam */}
      <path d="M32 40V27" stroke="var(--ink)" strokeWidth="2" strokeLinecap="round" />
      <path d="M32 31c5 0 8-3 8-8-5 0-8 3-8 8Z" fill="var(--primary-deep)" />
      <path d="M32 34c-4 0-7-2-7-6 4 0 7 2 7 6Z" fill="var(--ink)" />
      {/* dudukan bohlam */}
      <rect x="26" y="40" width="12" height="5" rx="2" fill="var(--ink-2)" />
      <path d="M28 48h8" stroke="var(--ink-2)" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}
