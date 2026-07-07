import { cn } from "@/lib/utils";

// Spot-illustration kustom untuk landing (Cara kerja + Kerahasiaan). Motif kalem &
// abstrak (bubble, dokumen, jalur, kunci, pintu) — token Lindra, dekoratif → aria-hidden.
// Label teks di kartu yang membawa makna; spot memperkuat secara visual.
function Spot({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <svg
      viewBox="0 0 56 56"
      width="56"
      height="56"
      className={cn("size-14", className)}
      aria-hidden
      focusable={false}
    >
      <circle cx="28" cy="28" r="28" fill="var(--primary-soft)" />
      {children}
    </svg>
  );
}

// — Cara kerja —

// Ceritakan sekali → bubble + sprout
export function SpotStory({ className }: { className?: string }) {
  return (
    <Spot className={className}>
      <path d="M15 16h26a5 5 0 0 1 5 5v12a5 5 0 0 1-5 5H27l-8 6v-6h-4a5 5 0 0 1-5-5V21a5 5 0 0 1 5-5Z" fill="var(--surface)" stroke="var(--primary-deep)" strokeWidth="2" />
      <path d="M28 34c5 0 8-3 8-9-5 0-8 3-8 9Z" fill="var(--primary-deep)" />
      <path d="M28 34c-4 0-7-2-7-6 4 0 7 2 7 6Z" fill="var(--ink)" />
    </Spot>
  );
}

// Lindra bantu susun → dokumen + sparkle
export function SpotCompose({ className }: { className?: string }) {
  return (
    <Spot className={className}>
      <rect x="17" y="14" width="20" height="27" rx="3" fill="var(--surface)" stroke="var(--primary-deep)" strokeWidth="2" />
      <line x1="21" y1="21" x2="33" y2="21" stroke="var(--primary-deep)" strokeWidth="2" strokeLinecap="round" />
      <line x1="21" y1="27" x2="33" y2="27" stroke="var(--primary-deep)" strokeWidth="2" strokeLinecap="round" opacity="0.55" />
      <line x1="21" y1="33" x2="29" y2="33" stroke="var(--primary-deep)" strokeWidth="2" strokeLinecap="round" opacity="0.55" />
      <path d="M41 15v6M38 18h6" stroke="var(--warm)" strokeWidth="2" strokeLinecap="round" />
    </Spot>
  );
}

// Kamu putuskan kirim → paper plane + check consent
export function SpotConsent({ className }: { className?: string }) {
  return (
    <Spot className={className}>
      <path d="M13 27l28-12-9 27-6-9-13-6Z" fill="var(--primary)" />
      <path d="M32 42l-6-9 15-18Z" fill="var(--primary-deep)" />
      <circle cx="41" cy="40" r="8" fill="var(--primary-deep)" />
      <path d="M37 40l3 3 5-6" stroke="var(--surface)" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </Spot>
  );
}

// Dirutekan ke bantuan yang tepat → jalur ke tempat berlindung
export function SpotRoute({ className }: { className?: string }) {
  return (
    <Spot className={className}>
      <circle cx="15" cy="42" r="3.5" fill="var(--primary-deep)" />
      <path d="M15 42C15 31 25 31 29 25" stroke="var(--primary-deep)" strokeWidth="2.5" fill="none" strokeLinecap="round" />
      <path d="M29 25c3-4 7-5 11-5" stroke="var(--primary)" strokeWidth="2.5" fill="none" strokeLinecap="round" />
      <path d="M31 19l7-6 7 6v7a1.5 1.5 0 0 1-1.5 1.5h-11A1.5 1.5 0 0 1 31 26z" fill="var(--ink)" />
    </Spot>
  );
}

// — Kerahasiaan —

// Terenkripsi → gembok
export function SpotLock({ className }: { className?: string }) {
  return (
    <Spot className={className}>
      <path d="M21 25v-4a7 7 0 0 1 14 0v4" stroke="var(--primary-deep)" strokeWidth="3" fill="none" strokeLinecap="round" />
      <rect x="16" y="25" width="24" height="18" rx="4" fill="var(--ink)" />
      <circle cx="28" cy="32" r="2.6" fill="var(--primary-soft)" />
      <rect x="27" y="33" width="2" height="6" rx="1" fill="var(--primary-soft)" />
    </Spot>
  );
}

// Kamu pegang kendali → jeda (bisa berhenti kapan saja)
export function SpotControl({ className }: { className?: string }) {
  return (
    <Spot className={className}>
      <circle cx="28" cy="28" r="14" fill="var(--surface)" stroke="var(--primary-deep)" strokeWidth="2" />
      <rect x="22" y="21" width="4" height="14" rx="2" fill="var(--primary-deep)" />
      <rect x="30" y="21" width="4" height="14" rx="2" fill="var(--primary-deep)" />
    </Spot>
  );
}

// Tidak disebar tanpa alasan → dokumen terlindungi (amplop + perisai)
export function SpotProtected({ className }: { className?: string }) {
  return (
    <Spot className={className}>
      <rect x="13" y="19" width="28" height="20" rx="4" fill="var(--surface)" stroke="var(--primary-deep)" strokeWidth="2" />
      <path d="M14 22l13 9 13-9" stroke="var(--primary-deep)" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="40" cy="40" r="8.5" fill="var(--primary-deep)" />
      <path d="M40 35l4.5 1.7v3.3c0 2.6-2.2 4-4.5 5-2.3-1-4.5-2.4-4.5-5v-3.3z" fill="var(--surface)" />
    </Spot>
  );
}

// Jalur keluar tak bergantung sekolah → pintu terbuka + jalan keluar
export function SpotExit({ className }: { className?: string }) {
  return (
    <Spot className={className}>
      <path d="M18 13h13a2 2 0 0 1 2 2v28H18a2 2 0 0 1-2-2V15a2 2 0 0 1 2-2Z" fill="var(--ink)" />
      <path d="M20 16h9v24h-9z" fill="var(--warm-soft)" />
      <path d="M29 15l5 2v22l-5 2z" fill="var(--ink)" />
      <circle cx="27" cy="28" r="1.6" fill="var(--ink)" />
      <path d="M38 34h7M42 31l3 3-3 3" stroke="var(--primary-deep)" strokeWidth="2.2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </Spot>
  );
}
