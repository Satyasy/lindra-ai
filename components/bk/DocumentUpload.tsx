"use client";

import { useActionState } from "react";
import { CircleAlert, CircleCheck, Upload } from "lucide-react";
import { uploadDocument, type UploadResult } from "@/app/bk/(dashboard)/dokumen/actions";

// Form unggah dokumen aturan. Client HANYA karena butuh useActionState — hasil
// ingest (berapa bagian terindeks vektor) wajib terbaca petugas, dan itu tak
// bisa disampaikan lewat form server murni tanpa hack searchParam.
export function DocumentUpload({ accepted }: { accepted: readonly string[] }) {
  const [result, action, pending] = useActionState<UploadResult | null, FormData>(
    uploadDocument,
    null
  );

  return (
    <form action={action} className="rounded-[var(--radius-md)] border border-border bg-surface p-5">
      <div className="grid gap-4 sm:grid-cols-[1fr_auto] sm:items-end">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="doc-title" className="mb-1.5 block text-sm font-medium text-ink">
              Judul dokumen
            </label>
            <input
              id="doc-title"
              name="title"
              required
              placeholder="Tata Tertib Sekolah"
              className="min-h-11 w-full rounded-[var(--radius-sm)] border border-border bg-surface px-3 text-[0.9375rem] text-ink outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
            <p className="mt-1.5 text-[0.8125rem] text-text-soft">
              Diawali <strong className="font-semibold text-primary-ink">UU </strong> agar masuk
              bagian perundang-undangan. Judul sama = mengganti dokumen lama.
            </p>
          </div>

          <div>
            <label htmlFor="doc-file" className="mb-1.5 block text-sm font-medium text-ink">
              Berkas teks
            </label>
            <input
              id="doc-file"
              name="file"
              type="file"
              required
              accept={accepted.join(",")}
              className="min-h-11 w-full rounded-[var(--radius-sm)] border border-border bg-surface px-3 py-2 text-[0.9375rem] text-ink outline-none file:mr-3 file:rounded-full file:border-0 file:bg-primary-soft file:px-3 file:py-1.5 file:text-[0.8125rem] file:font-medium file:text-primary-ink focus-visible:ring-2 focus-visible:ring-ring"
            />
            <p className="mt-1.5 text-[0.8125rem] text-text-soft">
              Hanya {accepted.join(" / ")}. Satu pasal per paragraf, dipisah baris kosong.
            </p>
          </div>
        </div>

        <button
          type="submit"
          disabled={pending}
          className="flex min-h-12 items-center justify-center gap-2 rounded-full bg-primary px-5 text-[0.9375rem] font-semibold text-ink transition-colors hover:bg-primary-deep focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:opacity-50"
        >
          <Upload className="size-4" strokeWidth={2} aria-hidden />
          {pending ? "Memproses…" : "Unggah"}
        </button>
      </div>

      {result && (
        // aria-live: hasil muncul tanpa pindah fokus — tak mengagetkan, tapi
        // tetap terbaca screen reader.
        <p
          aria-live="polite"
          className={`mt-4 flex items-start gap-2 rounded-[var(--radius-sm)] px-3 py-2.5 text-[0.875rem] ${
            result.ok ? "bg-primary-soft text-ink" : "bg-danger-soft text-ink"
          }`}
        >
          {result.ok ? (
            <CircleCheck className="mt-0.5 size-4 shrink-0 text-primary-ink" strokeWidth={2} aria-hidden />
          ) : (
            <CircleAlert className="mt-0.5 size-4 shrink-0 text-danger" strokeWidth={2} aria-hidden />
          )}
          {result.message}
        </p>
      )}
    </form>
  );
}
