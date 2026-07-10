"use client";

import { useTransition } from "react";
import { updateReportStatus } from "@/app/bk/(dashboard)/[reportId]/actions";

// CTA "tindak lanjut" = majukan status ke tahap berikutnya (reuse server action yang ada).
// ponytail: StatusSelect di header untuk set status bebas; tombol ini quick-advance saja.
const NEXT: Record<string, string> = { terkirim: "ditinjau", ditinjau: "selesai" };

export function TindakLanjutButton({ reportId, status }: { reportId: string; status: string }) {
  const [pending, startTransition] = useTransition();
  const next = NEXT[status];

  return (
    <button
      type="button"
      disabled={pending || !next}
      onClick={() => next && startTransition(() => updateReportStatus(reportId, next))}
      className="flex min-h-12 w-full items-center justify-center rounded-full bg-primary px-5 font-semibold text-ink shadow-[var(--shadow-soft)] transition-colors hover:bg-primary-deep focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:cursor-not-allowed disabled:opacity-60"
    >
      {!next ? "Laporan sudah selesai" : pending ? "Menyimpan…" : "Penanganan BK"}
    </button>
  );
}
