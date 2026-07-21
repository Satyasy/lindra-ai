"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Activity,
  CalendarDays,
  Check,
  Clock,
  FileText,
  Loader2,
  MapPin,
  MessageSquareText,
  Send,
  User,
  X,
  type LucideIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";

export type StructuredDraft = {
  gambaran_kejadian: string;
  pelaku: string;
  waktu: string;
  waktu_tanggal: string; // tanggal pasti opsional (date picker) — teks `waktu` tetap simpan nuansa
  dampak: string;
  lokasi: string;
  narasi: string;
};

// Rincian singkat (input pendek) — narasi ditangani terpisah di bawah.
const DETAIL_FIELDS: { key: keyof StructuredDraft; label: string; icon: LucideIcon; area?: boolean; hint?: string }[] = [
  { key: "gambaran_kejadian", label: "Apa yang terjadi", icon: MessageSquareText, area: true },
  {
    key: "pelaku",
    label: "Siapa yang terlibat",
    icon: User,
    hint: "Kalau kamu sudah siap, boleh tulis namanya — ini membantu guru BK menindaklanjuti. Tetap boleh dikosongkan kalau belum mau.",
  },
  { key: "waktu", label: "Kapan", icon: Clock },
  { key: "lokasi", label: "Di mana", icon: MapPin },
  { key: "dampak", label: "Dampaknya ke kamu", icon: Activity, area: true },
];

const fieldClass =
  "w-full rounded-[var(--radius-md)] border border-border bg-surface px-4 py-2.5 text-[0.9375rem] leading-relaxed text-text outline-none transition-shadow placeholder:text-text-muted focus-visible:border-primary/60 focus-visible:ring-2 focus-visible:ring-ring/40";

export function DraftCanvas({
  sessionId,
  draft: initial,
  onClose,
}: {
  sessionId: string;
  draft: StructuredDraft;
  onClose: () => void;
}) {
  const router = useRouter();
  const [draft, setDraft] = useState<StructuredDraft>(initial);
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  // Kode HTTP kegagalan terakhir — 409/403 punya pesan & aksi khusus (bukan "coba lagi").
  const [errCode, setErrCode] = useState<number | null>(null);

  const set = (key: keyof StructuredDraft, value: string) => {
    setDraft((d) => ({ ...d, [key]: value }));
    setStatus("idle");
  };

  async function save(): Promise<boolean> {
    setStatus("saving");
    setErrCode(null);
    try {
      const res = await fetch(`/api/draft/${sessionId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ draft }),
      });
      if (res.ok) {
        setStatus("saved");
        return true;
      }
      // 409: laporan sudah terkirim (mis. dari tab lain). 403: cookie sesi tak
      // cocok/hilang (sudah kirim sebelumnya, atau browser di-restart dan cookie
      // sesi lenyap). Dua-duanya BUKAN "coba lagi" — beri jalan keluar di footer.
      setErrCode(res.status);
      setStatus("error");
      return false;
    } catch {
      setErrCode(null);
      setStatus("error");
      return false;
    }
  }

  async function saveAndSend() {
    if (await save()) router.push("/draft");
  }

  return (
    <>
      {/* Backdrop hanya di mobile (panel overlay). Desktop = panel menyempil, chat mengecil. */}
      <button
        type="button"
        aria-label="Tutup draf"
        onClick={onClose}
        className="fixed inset-0 z-[950] bg-ink/30 min-[900px]:hidden"
      />

      <aside
        aria-label="Draf laporan"
        className="panel-slide-in fixed inset-y-0 right-0 z-[960] flex w-full max-w-md flex-col bg-surface shadow-[var(--shadow-lift)] min-[900px]:static min-[900px]:z-auto min-[900px]:w-[22rem] min-[900px]:max-w-none min-[900px]:shrink-0 min-[900px]:border-l min-[900px]:border-border min-[900px]:shadow-none xl:w-[26rem]"
      >
        <header className="flex items-start justify-between gap-3 border-b border-border px-5 py-4 min-[900px]:pt-20">
          <div className="flex items-start gap-3">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-[var(--radius-md)] bg-primary-soft text-primary-ink">
              <FileText className="size-5" strokeWidth={2} aria-hidden />
            </span>
            <div className="min-w-0">
              <h2 className="text-[1.05rem] font-bold leading-tight text-ink">Draf laporan</h2>
              <p className="mt-0.5 text-[0.8125rem] leading-snug text-text-soft">
                Betulkan yang kurang pas — belum ada yang dikirim.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup draf"
            className="flex size-10 shrink-0 items-center justify-center rounded-full text-text-soft transition-colors hover:bg-surface-alt hover:text-ink"
          >
            <X className="size-5" aria-hidden />
          </button>
        </header>

        <div className="flex-1 overflow-y-auto px-5 py-6">
          {/* Rincian singkat — tiap section muncul bertahap (stagger 150ms) */}
          <div className="space-y-5">
            <p className="text-[0.75rem] font-semibold uppercase tracking-wide text-text-muted">Rincian</p>
            {DETAIL_FIELDS.map(({ key, label, icon: Icon, area, hint }, i) => (
              <div
                key={key}
                className="section-stagger space-y-1.5"
                style={{ ["--i" as string]: i } as React.CSSProperties}
              >
                <label
                  htmlFor={`draft-${key}`}
                  className="flex items-center gap-1.5 text-[0.875rem] font-medium text-ink"
                >
                  <Icon className="size-4 text-text-muted" strokeWidth={2} aria-hidden />
                  {label}
                </label>
                {area ? (
                  <textarea
                    id={`draft-${key}`}
                    value={draft[key]}
                    onChange={(e) => set(key, e.target.value)}
                    rows={3}
                    placeholder="belum terisi — boleh kamu tambahkan"
                    className={`${fieldClass} resize-y`}
                  />
                ) : (
                  <input
                    id={`draft-${key}`}
                    value={draft[key]}
                    onChange={(e) => set(key, e.target.value)}
                    placeholder="belum terisi"
                    className={`${fieldClass} min-h-11`}
                  />
                )}
                {hint && <p className="text-[0.75rem] leading-snug text-text-soft">{hint}</p>}
              </div>
            ))}

            {/* Tanggal pasti opsional — teks "Kapan" tetap menyimpan nuansa samar/berulang
                dari chat. Native <input type=date>, default kosong (tanggal kejadian ≠ hari ini). */}
            <div
              className="section-stagger space-y-1.5"
              style={{ ["--i" as string]: DETAIL_FIELDS.length } as React.CSSProperties}
            >
              <label
                htmlFor="draft-waktu_tanggal"
                className="flex items-center gap-1.5 text-[0.875rem] font-medium text-ink"
              >
                <CalendarDays className="size-4 text-text-muted" strokeWidth={2} aria-hidden />
                Tanggal kejadian (opsional)
              </label>
              <input
                id="draft-waktu_tanggal"
                type="date"
                value={draft.waktu_tanggal ?? ""}
                onChange={(e) => set("waktu_tanggal", e.target.value)}
                className={`${fieldClass} min-h-11`}
              />
              <p className="text-[0.75rem] leading-snug text-text-soft">
                Kalau kamu ingat tanggal pastinya, pilih di sini. Kalau tidak, biarkan kosong — cukup ceritakan di kolom &ldquo;Kapan&rdquo;.
              </p>
            </div>
          </div>

          {/* Narasi = teks yang dikirim ke BK — dibedakan dgn tint surface-alt */}
          <div
            className="section-stagger mt-7 space-y-2 rounded-[var(--radius-lg)] border border-border bg-surface-alt p-4"
            style={{ ["--i" as string]: DETAIL_FIELDS.length + 1 } as React.CSSProperties}
          >
            <label htmlFor="draft-narasi" className="block text-[0.875rem] font-semibold text-ink">
              Narasi laporan
            </label>
            <p className="text-[0.8125rem] leading-snug text-text-soft">
              Ini yang dibaca guru BK. Boleh kamu ubah biar pas sama maksudmu.
            </p>
            <textarea
              id="draft-narasi"
              value={draft.narasi}
              onChange={(e) => set("narasi", e.target.value)}
              rows={7}
              placeholder="belum terisi"
              className={`${fieldClass} resize-y leading-[1.65]`}
            />
          </div>
        </div>

        <footer className="space-y-2 border-t border-border px-5 py-4 max-sm:pb-16">
          {status === "error" && (
            <p className="text-[0.8125rem] text-danger">
              {errCode === 409
                ? "Laporan ini sudah terkirim, jadi tidak bisa diubah lagi. "
                : errCode === 403
                  ? "Sesimu sudah berakhir atau laporan sudah terkirim sebelumnya. Salin dulu bagian yang kamu ubah kalau penting, lalu "
                  : "Gagal menyimpan. Coba lagi sebentar ya."}
              {errCode === 409 && (
                <button
                  type="button"
                  onClick={() => router.push("/draft")}
                  className="font-semibold underline underline-offset-2"
                >
                  Buka status
                </button>
              )}
              {errCode === 403 && (
                <button
                  type="button"
                  onClick={() => location.reload()}
                  className="font-semibold underline underline-offset-2"
                >
                  muat ulang
                </button>
              )}
            </p>
          )}
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={save}
              disabled={status === "saving"}
              className="min-h-12 flex-1 rounded-full font-semibold"
            >
              {status === "saving" ? (
                <Loader2 className="size-4 animate-spin" aria-hidden />
              ) : status === "saved" ? (
                <Check className="size-4" aria-hidden />
              ) : null}
              {status === "saved" ? "Tersimpan" : "Simpan"}
            </Button>
            <Button
              onClick={saveAndSend}
              disabled={status === "saving" || !draft.narasi.trim()}
              className="min-h-12 flex-1 rounded-full font-semibold"
            >
              <Send className="size-4" aria-hidden />
              Lanjut kirim
            </Button>
          </div>
        </footer>
      </aside>
    </>
  );
}
