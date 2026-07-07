import { cn } from "@/lib/utils";

// Motif ranting berdaun untuk pojok hero (DESIGN.md §2 warna). Dekoratif.
const leaf = "M0 0C-6-5-6-16 0-20 6-16 6-5 0 0Z";

export function LeafSpray({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 120 110"
      width="120"
      height="110"
      className={cn("h-auto w-32", className)}
      aria-hidden
      focusable={false}
      fill="none"
    >
      {/* ranting */}
      <path
        d="M10 104C34 88 52 60 96 14"
        stroke="var(--primary-deep)"
        strokeWidth="3"
        strokeLinecap="round"
      />
      {/* daun sepanjang ranting */}
      <path transform="translate(30 84) rotate(-38)" d={leaf} fill="var(--primary)" />
      <path transform="translate(46 66) rotate(40)" d={leaf} fill="var(--primary-deep)" />
      <path transform="translate(60 50) rotate(-28)" d={leaf} fill="var(--primary-bright)" />
      <path transform="translate(76 34) rotate(46)" d={leaf} fill="var(--primary)" />
      <path transform="translate(90 20) rotate(-20)" d={leaf} fill="var(--primary-deep)" />
      {/* aksen hangat kecil */}
      <circle cx="52" cy="60" r="3.2" fill="var(--warm)" />
      <circle cx="70" cy="43" r="2.6" fill="var(--warm-soft)" />
    </svg>
  );
}
