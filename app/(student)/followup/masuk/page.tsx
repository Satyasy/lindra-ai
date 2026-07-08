"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

// Halaman input kode MANUAL (dari email netral yang tak memuat kode/link).
// Verifikasi kode → cookie sesi httpOnly → /followup. TANPA kode/token di URL.
export default function FollowupMasukPage() {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const res = await fetch("/api/followup/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code: code.trim() }),
    });
    setLoading(false);
    if (res.ok) {
      router.push("/followup"); // tanpa kode di URL
    } else {
      setError("Kode itu tidak kami temukan atau follow-up belum aktif. Coba periksa lagi ya.");
    }
  }

  return (
    <div className="mx-auto w-full max-w-[560px] px-4 py-12 pb-28">
      <h1 className="mb-2 text-2xl">Lanjutkan follow-up</h1>
      <p className="mb-8 text-text-soft">
        Masukkan kodemu untuk melanjutkan. Kami sengaja tidak menautkannya di email demi
        keamananmu.
      </p>

      <form onSubmit={submit} className="flex flex-wrap gap-2">
        <input
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder="Mis. eb3f8c64"
          aria-label="Kode referensi"
          autoComplete="off"
          className="min-h-12 w-full min-w-0 flex-1 basis-52 rounded-full border bg-background px-5 outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
        <Button type="submit" disabled={!code.trim() || loading} className="min-h-12 rounded-full px-6 font-semibold">
          {loading ? "Memeriksa…" : "Lanjut"}
        </Button>
      </form>

      {error && (
        <p className="mt-6 rounded-[var(--radius-md)] bg-warm-soft px-4 py-3 text-sm">{error}</p>
      )}
    </div>
  );
}
