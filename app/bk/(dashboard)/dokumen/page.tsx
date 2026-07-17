import { FileText, Trash2 } from "lucide-react";
import { ACCEPTED_EXTENSIONS, listDocuments } from "@/lib/ai/ingest-policy";
import { UU_TITLE_PREFIX } from "@/lib/ai/recommend-policy";
import { DocumentUpload } from "@/components/bk/DocumentUpload";
import { removeDocument } from "./actions";

// Sumber dokumen untuk rekomendasi pasal (RAG). Menggantikan skrip CLI lama —
// satu jalur ingest, bukan dua.
export const dynamic = "force-dynamic";

const wib = (d: Date) =>
  new Date(d).toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "Asia/Jakarta",
  });

export default async function DokumenPage() {
  const docs = await listDocuments();

  return (
    <div className="mx-auto max-w-5xl">
      <header className="mb-6">
        <h1 className="text-[length:var(--t-h1)] font-bold tracking-[-0.03em] text-ink">
          Dokumen Aturan
        </h1>
        <p className="mt-1.5 max-w-2xl text-text-soft">
          Sumber kutipan untuk rekomendasi pasal di detail laporan. Sistem hanya mengutip dari
          dokumen di halaman ini — kalau kosong, tidak ada pasal yang bisa direkomendasikan.
        </p>
      </header>

      <DocumentUpload accepted={ACCEPTED_EXTENSIONS} />

      <section className="mt-8">
        <h2 className="mb-3 text-[length:var(--t-h2)] font-bold tracking-[-0.02em] text-ink">
          Dokumen tersimpan
        </h2>

        {docs.length === 0 ? (
          <div className="rounded-[var(--radius-md)] border border-dashed border-border bg-surface px-5 py-10 text-center">
            <FileText className="mx-auto size-6 text-text-muted" strokeWidth={2} aria-hidden />
            <p className="mt-2 text-text-soft">
              Belum ada dokumen. Rekomendasi pasal akan kosong sampai ada yang diunggah.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-[var(--radius-md)] border border-border bg-surface">
            <table className="w-full min-w-[44rem] border-collapse text-left">
              <thead>
                <tr className="border-b border-border">
                  <th scope="col" className="px-4 py-3 text-[0.8125rem] font-semibold text-text-soft">
                    Dokumen
                  </th>
                  <th scope="col" className="px-4 py-3 text-[0.8125rem] font-semibold text-text-soft">
                    Jenis
                  </th>
                  <th scope="col" className="px-4 py-3 text-[0.8125rem] font-semibold text-text-soft">
                    Bagian
                  </th>
                  <th scope="col" className="px-4 py-3 text-[0.8125rem] font-semibold text-text-soft">
                    Terindeks vektor
                  </th>
                  <th scope="col" className="px-4 py-3 text-[0.8125rem] font-semibold text-text-soft">
                    Ditambahkan
                  </th>
                  <th scope="col" className="px-4 py-3 text-[0.8125rem] font-semibold text-text-soft">
                    <span className="sr-only">Aksi</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {docs.map((doc) => {
                  const isUU = doc.title.startsWith(UU_TITLE_PREFIX);
                  const fullyIndexed = doc.embedded === doc.chunks;
                  return (
                    <tr key={doc.title} className="border-b border-border last:border-0">
                      <td className="px-4 py-3.5 font-medium text-ink">{doc.title}</td>
                      <td className="px-4 py-3.5">
                        <span
                          className={`inline-block rounded-full px-2.5 py-1 text-[0.75rem] font-medium ${
                            isUU ? "bg-surface-warm text-ink" : "bg-surface-alt text-ink"
                          }`}
                        >
                          {isUU ? "Perundang-undangan" : "Tata tertib"}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 tabular-nums text-text-soft">{doc.chunks}</td>
                      <td className="whitespace-nowrap px-4 py-3.5">
                        {/* Sinyal paling penting di tabel ini: 0/N berarti dokumen cuma
                            bisa ditemukan lewat kata kunci, bukan makna. Tanpa kolom ini,
                            kegagalan itu tak terlihat sampai rekomendasinya terasa aneh. */}
                        <span
                          className={`tabular-nums text-[0.875rem] font-medium ${
                            fullyIndexed ? "text-primary-ink" : "text-warm-deep"
                          }`}
                        >
                          {doc.embedded}/{doc.chunks}
                        </span>
                        {!fullyIndexed && (
                          <span className="ml-2 text-[0.75rem] text-text-soft">
                            hanya kata kunci
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3.5 text-[0.875rem] text-text-soft">
                        {wib(doc.createdAt)}
                      </td>
                      <td className="px-4 py-3.5 text-right">
                        <form action={removeDocument}>
                          <input type="hidden" name="title" value={doc.title} />
                          <button
                            type="submit"
                            className="inline-flex size-11 items-center justify-center rounded-full text-danger transition-colors hover:bg-danger-soft focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                            aria-label={`Hapus dokumen ${doc.title}`}
                            title={`Hapus dokumen ${doc.title}`}
                          >
                            <Trash2 className="size-4" strokeWidth={2} aria-hidden />
                          </button>
                        </form>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
