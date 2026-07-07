import Link from "next/link";
import { Badge } from "@/components/ui/badge";

// Varian badge DESIGN.md §3.6 — urgensi, tujuan rute, flag visum
const URGENCY_STYLE: Record<string, string> = {
  kritis: "bg-danger-soft text-danger border-transparent",
  tinggi: "bg-danger-soft text-danger border-transparent",
  sedang: "bg-warm-soft text-warm-deep border-transparent",
  rendah: "bg-primary-soft text-primary-ink border-transparent",
};

export const DEST_BADGE: Record<string, { label: string; cls: string }> = {
  "dashboard-bk": { label: "Dashboard BK", cls: "bg-primary-soft text-primary-ink" },
  "satgas-eksternal": { label: "Satgas Eksternal", cls: "bg-warm-soft text-warm-deep" },
  sapa129: { label: "SAPA 129", cls: "bg-danger-soft text-danger" },
  "eskalasi-darurat": { label: "Eskalasi Darurat", cls: "bg-danger-soft text-danger" },
};

const STATUS_LABEL: Record<string, string> = {
  terkirim: "Baru masuk",
  ditinjau: "Sedang ditinjau",
  selesai: "Selesai",
};

export function ReportCard({
  report,
  destination,
}: {
  report: {
    id: string;
    narrative: string | null;
    urgencyLevel: string | null;
    status: string;
    urgentVisum: boolean;
    createdAt: Date;
  };
  destination: string;
}) {
  const dest = DEST_BADGE[destination];
  return (
    <Link
      href={`/bk/${report.id}`}
      className="block rounded-[var(--radius-lg)] focus-visible:outline-2 focus-visible:outline-ring"
    >
      <article className="rounded-[var(--radius-lg)] border bg-background p-5 shadow-[var(--shadow-soft)] transition-all hover:-translate-y-1 hover:shadow-[var(--shadow-lift)]">
        <div className="mb-2 flex flex-wrap items-center gap-2">
          <Badge className={URGENCY_STYLE[report.urgencyLevel ?? "rendah"]}>
            {report.urgencyLevel ?? "belum terklasifikasi"}
          </Badge>
          {report.urgentVisum && (
            <Badge className="border-transparent bg-danger text-white">visum urgent</Badge>
          )}
          {dest && <Badge className={`border-transparent ${dest.cls}`}>{dest.label}</Badge>}
          <Badge variant="outline">{STATUS_LABEL[report.status] ?? report.status}</Badge>
          <span className="ml-auto text-[0.8125rem] text-muted-foreground">
            {report.createdAt.toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short" })}
          </span>
        </div>
        <p className="line-clamp-3 text-[0.9375rem] leading-relaxed">
          {report.narrative ?? "(narasi belum tersusun)"}
        </p>
      </article>
    </Link>
  );
}
