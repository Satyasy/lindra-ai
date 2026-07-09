"use client";

import { useRef, useState } from "react";
import { Check, Loader2, Paperclip, TriangleAlert, X } from "lucide-react";

// Upload bukti (§5.2). Dilepas dari posisi statis di textbox pada W1 — dipakai lagi
// secara dinamis di akhir alur pada W3. JANGAN hapus. Self-contained: cukup mount
// <EvidenceUpload /> di titik yang diinginkan.
export function EvidenceUpload() {
  const fileRef = useRef<HTMLInputElement>(null);
  const [attachment, setAttachment] = useState<
    { name: string; status: "uploading" | "done" | "error" } | null
  >(null);

  async function uploadEvidence(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = ""; // reset agar file yang sama bisa dipilih lagi setelah dihapus
    if (!file) return;
    setAttachment({ name: file.name, status: "uploading" });
    try {
      const body = new FormData();
      body.append("file", file);
      const res = await fetch("/api/evidence", { method: "POST", body });
      if (!res.ok) throw new Error(String(res.status));
      setAttachment({ name: file.name, status: "done" });
    } catch {
      setAttachment({ name: file.name, status: "error" });
    }
  }

  return (
    <>
      {/* Chip lampiran terpilih — status unggah nyata */}
      {attachment && (
        <div className="mx-auto mb-2 flex w-full max-w-[760px]">
          <span
            className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm ${
              attachment.status === "error" ? "bg-danger-soft text-danger-deep" : "bg-surface-alt text-ink"
            }`}
          >
            {attachment.status === "uploading" ? (
              <Loader2 className="size-3.5 animate-spin text-primary-ink" aria-hidden />
            ) : attachment.status === "done" ? (
              <Check className="size-3.5 text-primary-deep" aria-hidden />
            ) : (
              <TriangleAlert className="size-3.5 text-danger-deep" aria-hidden />
            )}
            {attachment.name}
            <span className="text-xs text-text-muted">
              {attachment.status === "uploading"
                ? "mengunggah…"
                : attachment.status === "error"
                  ? "gagal, coba lagi"
                  : "terlampir"}
            </span>
            <button
              type="button"
              onClick={() => setAttachment(null)}
              aria-label="Hapus lampiran"
              className="ml-1 text-text-muted hover:text-foreground"
            >
              <X className="size-3.5" aria-hidden />
            </button>
          </span>
        </div>
      )}

      {/* Lampirkan bukti (§5.2) — paperclip lucide, bukan emoji */}
      <input
        ref={fileRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,application/pdf"
        hidden
        onChange={uploadEvidence}
      />
      <button
        type="button"
        onClick={() => fileRef.current?.click()}
        aria-label="Lampirkan bukti"
        className="flex size-12 shrink-0 items-center justify-center rounded-full text-primary-ink transition-colors hover:bg-primary-soft"
      >
        <Paperclip className="size-5" strokeWidth={2} aria-hidden />
      </button>
    </>
  );
}
