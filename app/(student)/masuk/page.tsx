"use client";

import { useActionState } from "react";
import { KeyRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { resumeWithCode } from "./actions";

// /masuk — pengguna lama membuka lagi sesinya lewat kode. Di bawah (student)/layout
// jadi QuickExit + judul netral "Catatan Harian" ikut. Tanpa sidebar (belum ada sesi).
export default function MasukPage() {
  const [state, action, pending] = useActionState(resumeWithCode, null);

  return (
    <div className="mx-auto w-full max-w-[520px] px-4 py-12 pb-28">
      <h1 className="mb-2 text-2xl text-foreground">Lanjutkan dengan kodemu</h1>
      <p className="mb-8 text-text-soft">
        Punya kode dari cerita sebelumnya? Masukkan di sini untuk membuka lagi percakapan,
        dokumen laporan, dan status penanganannya.
      </p>

      <form action={action} className="flex flex-wrap gap-2">
        <input
          name="code"
          required
          autoComplete="off"
          placeholder="Mis. eb3f8c64"
          aria-label="Kode referensi"
          className="min-h-12 w-full min-w-0 flex-1 basis-52 rounded-full border bg-background px-5 outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
        <Button type="submit" disabled={pending} className="min-h-12 rounded-full px-6 font-semibold">
          <KeyRound className="size-4" aria-hidden />
          {pending ? "Membuka…" : "Buka"}
        </Button>
      </form>

      {state?.error && (
        <p className="mt-6 rounded-[var(--radius-md)] bg-warm-soft px-4 py-3 text-sm text-ink">
          {state.error}
        </p>
      )}

      <p className="mt-8 text-sm text-text-soft">
        Belum punya kode? Kamu bisa mulai cerita dulu — kodenya kamu dapat setelah membuat laporan.
      </p>
    </div>
  );
}
