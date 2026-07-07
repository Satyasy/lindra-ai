import { cn } from "@/lib/utils";

// Avatar Lindra — sprout lembut di lingkaran mint. Motif "tumbuh/pulih",
// kalem, bukan karakter kartun. Warna dari token (DESIGN.md §2). Dekoratif.
// sm → chat bubble (32px) · lg → hero card (80px).
export function LindraAvatar({
  size = "sm",
  className,
}: {
  size?: "sm" | "lg";
  className?: string;
}) {
  return (
    <svg
      viewBox="0 0 48 48"
      width="48"
      height="48"
      className={cn(size === "lg" ? "size-20" : "size-8", className)}
      aria-hidden
      focusable={false}
    >
      <circle cx="24" cy="24" r="24" fill="var(--primary)" />
      {/* highlight lembut kiri-atas */}
      <circle cx="17" cy="16" r="9" fill="var(--primary-bright)" opacity="0.55" />
      {/* batang */}
      <path
        d="M24 36V22"
        stroke="var(--ink)"
        strokeWidth="2.4"
        strokeLinecap="round"
        fill="none"
      />
      {/* daun kanan */}
      <path d="M24 27c6-1 11-5 11-12-7 1-11 5-11 12Z" fill="var(--ink)" />
      {/* daun kiri */}
      <path d="M24 31c-5-1-9-4-9-10 6 0 9 4 9 10Z" fill="var(--ink-2)" />
    </svg>
  );
}
