"use client";

import { useRef, useState } from "react";
import { Check, Loader2, Paperclip, RotateCw, ShieldCheck, TriangleAlert, X } from "lucide-react";
import { Button } from "@/components/ui/button";

// Widget bukti dinamis (W3). Dilepas dari textbox di W1, dipakai lagi di sini sebagai
// elemen INLINE di dalam thread — nempel ke pesan AI yang menanyakan bukti. Persist
// selama belum resolved; setelah upload ≥1 file ATAU "lewati" → state "selesai".
const ACCEPT = "image/jpeg,image/png,image/webp,application/pdf";
const ALLOWED = new Set(["image/jpeg", "image/png", "image/webp", "application/pdf"]);
const MAX_BYTES = 10 * 1024 * 1024; // cermin batas server (app/api/evidence)
const MAX_LABEL = "10 MB"; // satu sumber teks batas — dipakai client & pesan 413

type Item = {
  key: number;
  file: File;
  status: "uploading" | "done" | "error";
  error?: string; // pesan dari server (mis. 413) — menang atas clientError
};

function clientError(file: File): string | null {
  if (!ALLOWED.has(file.type)) return "tipe tidak didukung";
  if (file.size === 0 || file.size > MAX_BYTES) return `terlalu besar — maks ${MAX_LABEL}`;
  return null;
}

export function EvidenceUpload({
  resolved,
  onResolve,
}: {
  resolved: boolean;
  onResolve: (mode: "uploaded" | "skipped") => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const keyRef = useRef(0);
  const [items, setItems] = useState<Item[]>([]);
  const [submitted, setSubmitted] = useState<"uploaded" | "skipped" | null>(null);

  const isDone = resolved || submitted !== null;
  const uploaded = items.filter((i) => i.status === "done");
  const canContinue = uploaded.length > 0;

  const patch = (key: number, s: Item["status"], error?: string) =>
    setItems((list) => list.map((i) => (i.key === key ? { ...i, status: s, error } : i)));

  async function upload(item: Item) {
    patch(item.key, "uploading");
    try {
      const body = new FormData();
      body.append("file", item.file);
      const res = await fetch("/api/evidence", { method: "POST", body });
      if (res.ok) return patch(item.key, "done");
      // 413 dari app ATAU proxy (body limit) → sebut batas ukuran dengan jelas,
      // bukan "gagal" generik. Status lain: pesan retryable.
      patch(item.key, "error", res.status === 413 ? `terlalu besar — maks ${MAX_LABEL}` : "gagal, coba lagi");
    } catch {
      patch(item.key, "error", "gagal, coba lagi");
    }
  }

  function pick(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    e.target.value = ""; // reset agar file sama bisa dipilih lagi
    const fresh: Item[] = files.map((file) => {
      const err = clientError(file);
      return { key: keyRef.current++, file, status: err ? "error" : "uploading" };
    });
    setItems((list) => [...list, ...fresh]);
    // Validasi client hanya UX — server tetap re-validasi. Kirim yang lolos.
    fresh.filter((i) => i.status === "uploading").forEach(upload);
  }

  function resolve(mode: "uploaded" | "skipped") {
    if (isDone) return;
    setSubmitted(mode);
    onResolve(mode);
  }

  const wrap =
    "bubble-in ml-[2.625rem] max-w-[min(88%,34rem)] rounded-[var(--radius-md)] border border-primary/25 bg-surface p-4 shadow-[var(--shadow-soft)]";

  // State "selesai" — tetap tampil sebagai konfirmasi, tak hilang mendadak.
  if (isDone) {
    const mode = submitted ?? (uploaded.length > 0 ? "uploaded" : "skipped");
    return (
      <div className={wrap} aria-live="polite">
        <p className="flex items-center gap-2 text-sm font-semibold text-primary-ink">
          <ShieldCheck className="size-4" strokeWidth={2} aria-hidden />
          {mode === "uploaded"
            ? `${uploaded.length} bukti terlampir`
            : "Tanpa lampiran bukti"}
        </p>
        {mode === "uploaded" && uploaded.length > 0 && (
          <ul className="mt-2 space-y-1">
            {uploaded.map((i) => (
              <li key={i.key} className="flex items-center gap-1.5 text-sm text-text-soft">
                <Check className="size-3.5 shrink-0 text-primary-deep" aria-hidden />
                <span className="truncate">{i.file.name}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    );
  }

  return (
    <div className={wrap}>
      <p className="text-sm text-text">
        Kalau ada foto, screenshot, video, atau dokumen sebagai bukti, kamu bisa lampirkan
        di sini. Boleh dilewati kalau tidak ada.
      </p>

      {items.length > 0 && (
        <ul className="mt-3 space-y-1.5">
          {items.map((i) => (
            <li
              key={i.key}
              className={`flex items-center gap-2 rounded-[var(--radius-sm)] px-2.5 py-1.5 text-sm ${
                i.status === "error" ? "bg-danger-soft text-danger-deep" : "bg-surface-alt text-ink"
              }`}
            >
              {i.status === "uploading" ? (
                <Loader2 className="size-3.5 shrink-0 animate-spin text-primary-ink" aria-hidden />
              ) : i.status === "done" ? (
                <Check className="size-3.5 shrink-0 text-primary-deep" aria-hidden />
              ) : (
                <TriangleAlert className="size-3.5 shrink-0 text-danger-deep" aria-hidden />
              )}
              <span className="min-w-0 flex-1 truncate">{i.file.name}</span>
              <span className="shrink-0 text-xs text-text-muted">
                {i.status === "uploading"
                  ? "mengunggah…"
                  : i.status === "done"
                    ? "terlampir"
                    : i.error ?? clientError(i.file) ?? "gagal"}
              </span>
              {i.status === "error" && !clientError(i.file) && i.error === "gagal, coba lagi" && (
                <button
                  type="button"
                  onClick={() => upload(i)}
                  aria-label="Coba unggah lagi"
                  className="shrink-0 text-primary-ink hover:text-primary-deep"
                >
                  <RotateCw className="size-3.5" aria-hidden />
                </button>
              )}
              <button
                type="button"
                onClick={() => setItems((list) => list.filter((x) => x.key !== i.key))}
                aria-label="Hapus dari daftar"
                className="shrink-0 text-text-muted hover:text-danger-deep"
              >
                <X className="size-3.5" aria-hidden />
              </button>
            </li>
          ))}
        </ul>
      )}

      <input
        ref={fileRef}
        type="file"
        accept={ACCEPT}
        multiple
        hidden
        onChange={pick}
      />

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <Button
          type="button"
          variant="outline"
          onClick={() => fileRef.current?.click()}
          className="min-h-11 rounded-full px-4 font-semibold"
        >
          <Paperclip className="size-4" strokeWidth={2} aria-hidden />
          Pilih file
        </Button>
        <Button
          type="button"
          onClick={() => resolve("uploaded")}
          disabled={!canContinue}
          className="min-h-11 rounded-full px-4 font-semibold"
        >
          Lanjut
        </Button>
        <button
          type="button"
          onClick={() => resolve("skipped")}
          className="min-h-11 rounded-full px-4 text-sm font-medium text-text-soft underline-offset-2 hover:text-primary-ink hover:underline"
        >
          Tidak ada bukti / lewati
        </button>
      </div>
    </div>
  );
}
