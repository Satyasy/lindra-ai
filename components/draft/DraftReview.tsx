"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Check, Copy, Send, UserRound } from "lucide-react";

const DEST_LABEL: Record<string, string> = {
  "dashboard-bk": "Guru BK di sekolahmu",
  "satgas-eksternal": "Satgas di luar sekolah (bukan pihak sekolahmu)",
  sapa129: "SAPA 129 — layanan nasional perlindungan anak",
  "eskalasi-darurat": "Jalur eskalasi darurat",
};

export function DraftReview({ sessionId }: { sessionId: string }) {
  const router = useRouter();
  const [narrative, setNarrative] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [askName, setAskName] = useState(false);
  const [identity, setIdentity] = useState("");
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<{ referralCode: string; destinations: string[] } | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetch(`/api/draft/${sessionId}`)
      .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
      .then((d) => setNarrative(d.narrative))
      .catch(() => setError("Draf tidak bisa dibuka. Coba kembali ke halaman cerita dulu ya."));
  }, [sessionId]);

  async function send(mode: "anonymous" | "named") {
    setSending(true);
    try {
      const res = await fetch(`/api/draft/${sessionId}/send`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode, identity: mode === "named" ? identity : undefined }),
      });
      if (!res.ok) throw new Error();
      setResult(await res.json());
    } catch {
      setError("Pengiriman gagal. Ceritamu tetap tersimpan — coba lagi sebentar lagi.");
    } finally {
      setSending(false);
    }
  }

  // Layar konfirmasi setelah terkirim
  if (result) {
    return (
      <div className="mx-auto w-full max-w-2xl px-4 py-8">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Check className="size-5 text-primary" aria-hidden />
              Ceritamu sudah diteruskan
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm leading-relaxed">
            <div>
              <p className="mb-1 font-medium">Diteruskan ke:</p>
              <ul className="list-disc pl-5 text-muted-foreground">
                {result.destinations.map((d) => (
                  <li key={d}>{DEST_LABEL[d] ?? d}</li>
                ))}
              </ul>
            </div>
            <div>
              <p className="mb-2 font-medium">Kode referensimu — simpan untuk memantau status tanpa membuka identitas:</p>
              <div className="flex items-center gap-2">
                <code className="rounded-lg bg-muted px-4 py-2 font-mono text-base tracking-widest">
                  {result.referralCode}
                </code>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    navigator.clipboard.writeText(result.referralCode);
                    setCopied(true);
                  }}
                >
                  {copied ? <Check className="size-4" aria-hidden /> : <Copy className="size-4" aria-hidden />}
                  {copied ? "Tersalin" : "Salin"}
                </Button>
              </div>
            </div>
            <p className="text-muted-foreground">
              Kamu sudah melakukan hal yang berani. Apa pun yang terjadi selanjutnya, ini bukan salahmu.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-8">
      <h1 className="mb-1 text-xl font-semibold">Draf ceritamu</h1>
      <p className="mb-6 text-sm text-muted-foreground">
        Ini rangkuman dari yang kamu ceritakan. Kamu yang pegang kendali — tidak ada yang terkirim
        sebelum kamu memilih kirim.
      </p>

      {error && <p className="mb-4 rounded-lg bg-secondary px-4 py-3 text-sm">{error}</p>}

      <Card className="mb-6">
        <CardContent className="whitespace-pre-wrap text-sm leading-relaxed">
          {narrative ?? "Menyusun draf…"}
        </CardContent>
      </Card>

      {askName && (
        <div className="mb-6 space-y-2">
          <Label htmlFor="identity">Nama & kelas (hanya dibuka oleh pihak yang menangani)</Label>
          <Input
            id="identity"
            value={identity}
            onChange={(e) => setIdentity(e.target.value)}
            placeholder="contoh: Rani, kelas 8B"
            autoComplete="off"
          />
        </div>
      )}

      <div className="flex flex-col gap-3">
        {!askName ? (
          <>
            <Button variant="secondary" size="lg" onClick={() => router.push("/chat")}>
              <ArrowLeft className="size-4" aria-hidden />
              Aku masih mau cerita dulu
            </Button>
            <Button size="lg" disabled={!narrative || sending} onClick={() => send("anonymous")}>
              <Send className="size-4" aria-hidden />
              {sending ? "Mengirim…" : "Kirim tanpa nama"}
            </Button>
            <Button
              variant="outline"
              size="lg"
              disabled={!narrative || sending}
              onClick={() => setAskName(true)}
            >
              <UserRound className="size-4" aria-hidden />
              Kirim dengan nama
            </Button>
          </>
        ) : (
          <>
            <Button size="lg" disabled={!identity.trim() || sending} onClick={() => send("named")}>
              <Send className="size-4" aria-hidden />
              {sending ? "Mengirim…" : "Kirim dengan namaku"}
            </Button>
            <Button variant="secondary" size="lg" onClick={() => setAskName(false)}>
              Batal, kembali
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
