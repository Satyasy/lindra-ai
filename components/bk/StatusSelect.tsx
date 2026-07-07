"use client";

import { useTransition } from "react";
import { updateReportStatus } from "@/app/bk/(dashboard)/[reportId]/actions";

// ponytail: <select> native cukup — dropdown 3 opsi tidak butuh komponen berat
export function StatusSelect({ reportId, status }: { reportId: string; status: string }) {
  const [pending, startTransition] = useTransition();

  return (
    <select
      value={status}
      disabled={pending}
      aria-label="Ubah status laporan"
      onChange={(e) => startTransition(() => updateReportStatus(reportId, e.target.value))}
      className="h-9 rounded-lg border bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
    >
      <option value="terkirim">Baru masuk</option>
      <option value="ditinjau">Sedang ditinjau</option>
      <option value="selesai">Selesai</option>
    </select>
  );
}
