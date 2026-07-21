"use client";

import { useRef, useState } from "react";
import { toast } from "sonner";
import { Check, Loader2, Paperclip, RotateCw, ShieldCheck, TriangleAlert, X } from "lucide-react";
import { Button } from "@/components/ui/button";

// Widget bukti dinamis (W3). Dilepas dari textbox di W1, dipakai lagi di sini sebagai
// elemen INLINE di dalam thread — nempel ke pesan AI yang menanyakan bukti. Persist
// selama belum resolved; setelah upload ≥1 file ATAU "lewati" → state "selesai".
const ACCEPT =
  "image/jpeg,image/png,image/webp,application/pdf,video/mp4,video/webm,video/quicktime";
const ALLOWED = new Set(ACCEPT.split(","));
// cermin batas server (app/api/evidence): foto/PDF 10MB, video 25MB
const MAX_BYTES = 10 * 1024 * 1024;
const MAX_VIDEO_BYTES = 25 * 1024 * 1024;
const maxFor = (f: File) => (f.type.startsWith("video/") ? MAX_VIDEO_BYTES : MAX_BYTES);
const maxLabel = (f: File) => (f.type.startsWith("video/") ? "25 MB" : "10 MB");

type Item = {
  key: number;
  file: File;
  status: "uploading" | "done" | "error";
  progress?: number; // 0–100 selama uploading (XHR onprogress)
  error?: string; // pesan dari server (mis. 413) — menang atas clientError
};

function clientError(file: File): string | null {
  if (!ALLOWED.has(file.type)) return "tipe tidak didukung";
  if (file.size === 0 || file.size > maxFor(file)) return `terlalu besar — maks ${maxLabel(file)}`;
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

  const patch = (key: number, p: Partial<Item>) =>
    setItems((list) => list.map((i) => (i.key === key ? { ...i, ...p } : i)));

  function upload(item: Item) {
    patch(item.key, { status: "uploading", progress: 0, error: undefined });
    // XHR (bukan fetch) — fetch tak punya progress upload; video 25MB tanpa progress
    // terasa menggantung. onprogress → persentase + bar terpantau.
    const xhr = new XMLHttpRequest();
    xhr.open("POST", "/api/evidence");
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) patch(item.key, { progress: Math.round((e.loaded / e.total) * 100) });
    };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        toast.success("Bukti berhasil terlampir");
        return patch(item.key, { status: "done" });
      }
      // 413 dari app ATAU proxy (body limit) → sebut batas ukuran dengan jelas,
      // bukan "gagal" generik. Status lain: pesan retryable.
      patch(item.key, {
        status: "error",
        error: xhr.status === 413 ? `terlalu besar — maks ${maxLabel(item.file)}` : "gagal, coba lagi",
      });
    };
    xhr.onerror = () => patch(item.key, { status: "error", error: "gagal, coba lagi" });
    const body = new FormData();
    body.append("file", item.file);
    xhr.send(body);
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
              <span className="min-w-0 flex-1 truncate">
                {i.file.name}
                {i.status === "uploading" && (
                  <span className="mt-1 block h-1 overflow-hidden rounded-full bg-border" aria-hidden>
                    <span
                      className="block h-full rounded-full bg-primary-deep transition-[width] duration-200"
                      style={{ width: `${i.progress ?? 0}%` }}
                    />
                  </span>
                )}
              </span>
              <span className="shrink-0 text-xs text-text-muted">
                {i.status === "uploading"
                  ? `mengunggah… ${i.progress ?? 0}%`
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
