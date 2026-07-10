"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { MessageSquare, Send, X } from "lucide-react";
import {
  assignReport,
  updateHandlingStatus,
  sendConsultMessage,
} from "@/app/bk/(dashboard)/actions";
import { RISK, WORRY, HANDLING_LABEL, HANDLING_PILL, HANDLING_STATUS, FLAGGED_BADGE } from "./handling";

export type QueueMessage = { id: string; sender: string; content: string; timeLabel: string };
export type QueueRowData = {
  id: string;
  code: string;
  urgency: string;
  narrative: string;
  dateLabel: string;
  urgentVisum: boolean;
  assignedToId: string | null;
  handlingStatus: string;
  unread: number;
  messages: QueueMessage[];
  flaggedAt: string | null; // W5: user konfirmasi masih perlu ditindaklanjuti ("Iya")
  noProgress: number; // W5: siklus kemandekan admin sejak ter-flag
};
export type StaffOpt = { id: string; name: string };

const stop = (e: React.MouseEvent) => e.stopPropagation();

export function QueueRow({ row, staff }: { row: QueueRowData; staff: StaffOpt[] }) {
  const router = useRouter();
  const risk = RISK[row.urgency] ?? RISK.rendah;
  const worry = WORRY[row.urgency] ?? WORRY.rendah;

  return (
    <tr
      onClick={() => router.push(`/bk/${row.id}`)}
      className="cursor-pointer border-b border-border transition-colors last:border-0 hover:bg-surface-alt/60"
    >
      <td className="px-3 py-4 align-top" onClick={stop}>
        {/* aksi massal ditunda — checkbox disable dulu (bukan target sentuh aktif) */}
        <input
          type="checkbox"
          disabled
          aria-label={`Pilih ${row.code}`}
          className="mt-1 size-4 accent-[var(--primary-deep)]"
        />
      </td>

      <td className="px-3 py-4 align-top">
        <Link
          href={`/bk/${row.id}`}
          onClick={stop}
          className="rounded font-mono text-sm font-bold tracking-wide text-ink hover:text-primary-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
        >
          {row.code}
        </Link>
        {row.urgentVisum && (
          <span className="mt-1 block w-fit rounded-full bg-danger px-1.5 py-0.5 text-[0.625rem] font-bold uppercase tracking-wide text-white">
            visum
          </span>
        )}
        {row.flaggedAt && (
          <span
            className={`mt-1 block w-fit rounded-full px-1.5 py-0.5 text-[0.625rem] font-bold uppercase tracking-wide ${FLAGGED_BADGE.cls}`}
            title="Siswa mengonfirmasi kasus masih perlu ditindaklanjuti dan belum kalian buka"
          >
            {FLAGGED_BADGE.label}
            {row.noProgress > 0 ? ` · mandek ${row.noProgress}` : ""}
          </span>
        )}
      </td>

      <td className="px-3 py-4 align-top">
        <span className="flex items-center gap-2 text-sm font-medium text-ink">
          <span className="size-2.5 shrink-0 rounded-full" style={{ background: risk.dot }} aria-hidden />
          {risk.label}
        </span>
      </td>

      <td className="px-3 py-4 align-top">
        <div className="flex items-center gap-2.5">
          <span className="h-2 w-16 shrink-0 overflow-hidden rounded-full bg-surface-alt" aria-hidden>
            <span
              className="block h-full rounded-full"
              style={{ width: `${worry.pct}%`, background: worry.fill }}
            />
          </span>
          <span className="text-[0.8125rem] leading-tight text-text-soft">{worry.label}</span>
        </div>
      </td>

      <td className="max-w-[22rem] px-3 py-4 align-top">
        {/* DIPOTONG — narasi penuh hanya di detail (mitigasi automation-bias) */}
        <p className="line-clamp-2 text-[0.875rem] leading-relaxed text-text-soft">{row.narrative}</p>
      </td>

      <td className="whitespace-pre-line px-3 py-4 align-top text-[0.8125rem] leading-snug text-text-soft">
        {row.dateLabel}
      </td>

      <td className="px-3 py-4 align-top" onClick={stop}>
        <div className="flex flex-col items-start gap-1.5">
          <AssignSelect id={row.id} value={row.assignedToId} staff={staff} />
          <HandlingSelect id={row.id} value={row.handlingStatus} />
        </div>
      </td>

      <td className="px-3 py-4 align-top" onClick={stop}>
        <ChatCell row={row} />
      </td>
    </tr>
  );
}

function AssignSelect({ id, value, staff }: { id: string; value: string | null; staff: StaffOpt[] }) {
  const [pending, start] = useTransition();
  return (
    <select
      value={value ?? ""}
      disabled={pending}
      aria-label="Tugaskan petugas"
      onChange={(e) => start(() => assignReport(id, e.target.value))}
      className="min-h-11 rounded-full border border-border bg-surface px-3 text-[0.8125rem] font-medium text-ink outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
    >
      <option value="">Belum diassign</option>
      {staff.map((s) => (
        <option key={s.id} value={s.id}>
          {s.name}
        </option>
      ))}
    </select>
  );
}

function HandlingSelect({ id, value }: { id: string; value: string }) {
  const [pending, start] = useTransition();
  const pill = HANDLING_PILL[value] ?? HANDLING_PILL["belum-diassign"];
  return (
    <select
      value={value}
      disabled={pending}
      aria-label="Ubah status penanganan"
      onChange={(e) => start(() => updateHandlingStatus(id, e.target.value))}
      className={`min-h-11 rounded-full border border-transparent px-3 text-[0.8125rem] font-semibold outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50 ${pill}`}
    >
      {HANDLING_STATUS.map((s) => (
        <option key={s} value={s}>
          {HANDLING_LABEL[s]}
        </option>
      ))}
    </select>
  );
}

function ChatCell({ row }: { row: QueueRowData }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={`Buka konsultasi ${row.code}${row.unread ? `, ${row.unread} pesan belum dibaca` : ""}`}
        className="relative flex size-11 items-center justify-center rounded-full border border-border text-primary-ink transition-colors hover:bg-primary-soft focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
      >
        <MessageSquare className="size-5" strokeWidth={2} aria-hidden />
        {row.unread > 0 && (
          <span className="absolute -right-1 -top-1 flex min-w-5 items-center justify-center rounded-full bg-primary-ink px-1 text-[0.6875rem] font-bold text-white tabular-nums">
            {row.unread}
          </span>
        )}
      </button>
      {open && <ConsultPanel row={row} onClose={() => setOpen(false)} />}
    </>
  );
}

function ConsultPanel({ row, onClose }: { row: QueueRowData; onClose: () => void }) {
  const [pending, start] = useTransition();
  const [text, setText] = useState("");

  return (
    <div
      className="fixed inset-0 z-[80] flex justify-end"
      role="dialog"
      aria-modal="true"
      aria-label={`Konsultasi ${row.code}`}
    >
      <button type="button" aria-label="Tutup panel" onClick={onClose} className="absolute inset-0 bg-ink/40" />
      <aside className="relative flex h-full w-full max-w-md flex-col bg-surface shadow-[var(--shadow-lift)]">
        <header className="flex items-center justify-between border-b border-border px-5 py-4">
          <div>
            <p className="font-mono text-sm font-bold text-ink">{row.code}</p>
            <p className="text-xs text-text-soft">Konsultasi pendampingan</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup panel"
            className="flex size-11 items-center justify-center rounded-full text-ink transition-colors hover:bg-surface-alt"
          >
            <X className="size-5" aria-hidden />
          </button>
        </header>

        <div className="flex flex-1 flex-col gap-3 overflow-y-auto px-5 py-4">
          {row.messages.length === 0 ? (
            <p className="text-sm text-muted-foreground">Belum ada pesan pada konsultasi ini.</p>
          ) : (
            row.messages.map((m) => (
              <div
                key={m.id}
                className={`flex max-w-[80%] flex-col ${
                  m.sender === "staff" ? "items-end self-end" : "items-start self-start"
                }`}
              >
                <div
                  className={`rounded-[var(--radius-md)] px-4 py-2.5 text-sm leading-relaxed ${
                    m.sender === "staff"
                      ? "bg-primary text-ink"
                      : "border border-border bg-surface-alt text-text"
                  }`}
                >
                  {m.content}
                </div>
                <span className="mt-1 block px-1 text-[0.6875rem] text-muted-foreground">
                  {m.sender === "staff" ? "Petugas" : "Siswa"} · {m.timeLabel}
                </span>
              </div>
            ))
          )}
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!text.trim()) return;
            const body = text;
            start(async () => {
              await sendConsultMessage(row.id, body);
              setText("");
            });
          }}
          className="flex items-end gap-2 border-t border-border p-4"
        >
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Tulis balasan…"
            aria-label="Balasan konsultasi"
            className="min-h-11 flex-1 rounded-full border border-border bg-surface px-4 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
          <button
            type="submit"
            disabled={pending || !text.trim()}
            aria-label="Kirim balasan"
            className="flex size-11 shrink-0 items-center justify-center rounded-full bg-primary text-ink transition-colors hover:bg-primary-deep disabled:opacity-50"
          >
            <Send className="size-5" aria-hidden />
          </button>
        </form>
      </aside>
    </div>
  );
}
