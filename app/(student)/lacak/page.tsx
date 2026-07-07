"use client";

import { useState } from "react";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmergencyBar } from "@/components/EmergencyBar";

// Timeline 4 langkah sesuai DESIGN.md §5.5. key = status Report di Prisma.
// ponytail: "ditindaklanjuti" tahap penanganan lanjut — kalau backend belum
// mengeluarkan status ini, langkah tampil sebagai tahap berikutnya (muted).
// Konfirmasi enum status final ke tim skema; label mengikuti §5.5.
const STEPS = [
  { key: "terkirim", label: "Diterima", desc: "Laporanmu sudah masuk dan tercatat aman." },
  { key: "ditinjau", label: "Sedang ditinjau", desc: "Pihak yang menangani sedang membaca ceritamu." },
  { key: "ditindaklanjuti", label: "Sedang ditindaklanjuti", desc: "Laporanmu sedang ditangani lebih lanjut." },
  { key: "selesai", label: "Selesai", desc: "Penanganan laporan ini sudah dinyatakan selesai." },
];

export default function LacakPage() {
  const [code, setCode] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function check(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setStatus(null);
    const res = await fetch(`/api/lacak/${encodeURIComponent(code.trim())}`);
    setLoading(false);
    if (!res.ok) {
      setError("Kode itu tidak kami temukan. Coba periksa lagi ya — huruf kecil semua.");
      return;
    }
    setStatus((await res.json()).status);
  }

  const currentIdx = STEPS.findIndex((s) => s.key === status);

  return (
    <div className="mx-auto w-full max-w-[620px] px-4 py-12 pb-28">
      <h1 className="mb-2 text-2xl text-foreground">Lihat perkembangan laporanmu</h1>
      <p className="mb-8 text-text-soft">
        Masukkan kode referensi yang kamu simpan saat mengirim laporan.
      </p>

      <form onSubmit={check} className="mb-10 flex flex-wrap gap-2">
        <input
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder="Mis. eb3f8c64"
          aria-label="Kode referensi"
          className="min-h-12 w-full min-w-0 flex-1 basis-52 rounded-full border bg-background px-5 outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
        <Button type="submit" disabled={!code.trim() || loading} className="min-h-12 rounded-full px-6 font-semibold">
          {loading ? "Mengecek…" : "Cek status"}
        </Button>
      </form>

      {error && <p className="mb-8 rounded-[var(--radius-md)] bg-warm-soft px-4 py-3 text-sm">{error}</p>}

      {status && (
        <ol className="mb-12">
          {STEPS.map((step, i) => {
            const done = i < currentIdx || status === "selesai";
            const current = i === currentIdx && status !== "selesai";
            return (
              <li key={step.key} className="relative flex gap-4 pb-8 last:pb-0">
                {i < STEPS.length - 1 && (
                  <span className="absolute left-[13px] top-8 h-full w-0.5 bg-border" aria-hidden />
                )}
                <span
                  className={`z-10 flex size-7 shrink-0 items-center justify-center rounded-full ${
                    done
                      ? "bg-success text-ink"
                      : current
                        ? "bg-primary ring-4 ring-primary-soft"
                        : "bg-muted"
                  }`}
                >
                  {done && <Check className="size-4" strokeWidth={2.5} aria-hidden />}
                </span>
                <div>
                  <p className={`font-semibold ${done || current ? "text-foreground" : "text-muted-foreground"}`}>
                    {step.label}
                  </p>
                  {(done || current) && <p className="text-sm text-text-soft">{step.desc}</p>}
                </div>
              </li>
            );
          })}
        </ol>
      )}

      <EmergencyBar title="Kalau keadaan mendesak, jangan tunggu status —" />
    </div>
  );
}
