import { Phone } from "lucide-react";

// DESIGN.md §3.3 — jalur darurat selalu terjangkau, link tel: langsung
const LINES = [
  { label: "Polisi 110", tel: "110" },
  { label: "SAPA 129", tel: "129" },
  { label: "Ambulans 119", tel: "119" },
];

export function EmergencyBar({ title = "Sedang dalam bahaya sekarang?" }: { title?: string }) {
  return (
    <div className="rounded-[var(--radius-lg)] bg-danger p-6 text-white">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <p className="font-bold">{title}</p>
        <div className="flex flex-wrap gap-2">
          {LINES.map(({ label, tel }) => (
            <a
              key={tel}
              href={`tel:${tel}`}
              className="flex min-h-11 items-center gap-2 rounded-full bg-white/15 px-4 text-sm font-semibold hover:bg-white/25"
            >
              <Phone className="size-4" strokeWidth={2} aria-hidden />
              {label}
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}
