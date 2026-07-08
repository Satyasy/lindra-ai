import { QueueRow, type QueueRowData, type StaffOpt } from "./QueueRow";

const COLS = [
  "ID Pelapor",
  "Risiko",
  "Tingkat Kekhawatiran",
  "Ringkasan Laporan",
  "Tanggal",
  "Penanganan",
  "Chat",
];

// Antrean = TABEL semantik (keputusan produk). <th scope="col"> supaya header terbaca
// screen reader; ringkasan di-clamp di baris (mitigasi automation-bias) — narasi penuh
// hanya di /bk/[reportId].
export function QueueTable({ rows, staff }: { rows: QueueRowData[]; staff: StaffOpt[] }) {
  return (
    <div className="overflow-x-auto rounded-[var(--radius-lg)] border border-border bg-surface shadow-[var(--shadow-soft)]">
      <table className="w-full border-collapse text-left">
        <thead>
          <tr className="border-b border-border">
            <th scope="col" className="px-3 py-3">
              <span className="sr-only">Pilih baris</span>
              <input
                type="checkbox"
                disabled
                aria-label="Pilih semua"
                className="size-4 accent-[var(--primary-deep)]"
              />
            </th>
            {COLS.map((c) => (
              <th
                key={c}
                scope="col"
                className="whitespace-nowrap px-3 py-3 text-[0.6875rem] font-semibold uppercase tracking-wide text-muted-foreground"
              >
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <QueueRow key={r.id} row={r} staff={staff} />
          ))}
        </tbody>
      </table>
    </div>
  );
}
