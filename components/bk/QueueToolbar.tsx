"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Download, Search } from "lucide-react";
import { HANDLING_STATUS, HANDLING_LABEL } from "./handling";
import type { StaffOpt } from "./QueueRow";

// Filter "Semua Petugas" — Lindra TIDAK punya role psikolog (jangan pakai "Psikolog").
const RISK_OPTS: [string, string][] = [
  ["kritis", "Kritis"],
  ["tinggi", "Tinggi"],
  ["sedang", "Sedang"],
  ["rendah", "Rendah"],
];

export function QueueToolbar({ staff }: { staff: StaffOpt[] }) {
  const router = useRouter();
  const sp = useSearchParams();

  const setParam = (key: string, val: string) => {
    const next = new URLSearchParams(sp.toString());
    if (val) next.set(key, val);
    else next.delete(key);
    next.delete("page"); // reset paginasi saat filter/search berubah
    const s = next.toString();
    router.push(s ? `/bk?${s}` : "/bk");
  };

  const selectCls =
    "min-h-11 rounded-full border border-border bg-surface px-4 text-sm font-medium text-ink outline-none focus-visible:ring-2 focus-visible:ring-ring";

  return (
    <div className="mb-5 flex flex-wrap items-center gap-3">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          const v = (new FormData(e.currentTarget).get("q") as string) ?? "";
          setParam("q", v.trim());
        }}
        className="relative min-w-[15rem] flex-1"
      >
        <Search
          className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
          aria-hidden
        />
        <input
          name="q"
          defaultValue={sp.get("q") ?? ""}
          placeholder="Cari ID pelapor atau kata kunci…"
          aria-label="Cari ID pelapor atau kata kunci"
          className="min-h-11 w-full rounded-full border border-border bg-surface pl-11 pr-4 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
      </form>

      <select
        aria-label="Filter risiko"
        value={sp.get("risiko") ?? ""}
        onChange={(e) => setParam("risiko", e.target.value)}
        className={selectCls}
      >
        <option value="">Semua Risiko</option>
        {RISK_OPTS.map(([v, l]) => (
          <option key={v} value={v}>
            {l}
          </option>
        ))}
      </select>

      <select
        aria-label="Filter penanganan"
        value={sp.get("penanganan") ?? ""}
        onChange={(e) => setParam("penanganan", e.target.value)}
        className={selectCls}
      >
        <option value="">Semua Penanganan</option>
        {HANDLING_STATUS.map((s) => (
          <option key={s} value={s}>
            {HANDLING_LABEL[s]}
          </option>
        ))}
      </select>

      <select
        aria-label="Filter petugas"
        value={sp.get("petugas") ?? ""}
        onChange={(e) => setParam("petugas", e.target.value)}
        className={selectCls}
      >
        <option value="">Semua Petugas</option>
        <option value="unassigned">Belum diassign</option>
        {staff.map((s) => (
          <option key={s.id} value={s.id}>
            {s.name}
          </option>
        ))}
      </select>

      <a
        href={`/bk/export?${sp.toString()}`}
        className="flex min-h-11 items-center gap-2 rounded-full border-2 border-border px-4 text-sm font-semibold text-primary-ink transition-colors hover:bg-primary-soft"
      >
        <Download className="size-4" strokeWidth={2} aria-hidden />
        Export
      </a>
    </div>
  );
}
