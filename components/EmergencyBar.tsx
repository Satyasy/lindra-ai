import { Phone } from "lucide-react";
import { GURU_BK_TEL, SAPA_TEL } from "@/lib/emergency-contacts";

// DESIGN.md §3.3 — jalur darurat sisi siswa: HANYA SAPA 129 + Guru BK (Polisi/Ambulans dihapus)
const LINES = [
  { label: "Telpon SAPA 129", tel: SAPA_TEL },
  { label: "Telpon Guru BK", tel: GURU_BK_TEL },
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
              // Pil merah-tua (bg-danger-deep) + teks putih = 8.4:1 (bg-white/15 dulu
              // hanya 3.4:1: overlay putih justru menerangkan latar di bawah teks putih)
              className="flex min-h-11 items-center gap-2 rounded-full border border-white/25 bg-danger-deep px-4 text-sm font-semibold text-white transition-colors hover:border-white/60"
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
