"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Check, Copy, FileText, Image as ImageIcon, Paperclip, Send, UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { EmergencyBar } from "@/components/EmergencyBar";
import { ROUTE_REASON, type RouteDestination } from "@/lib/routing/routing-engine";
import { FOLLOWUP_CONSENT } from "@/lib/followup-copy";
import { NO_EVIDENCE_SENTINEL, type EvidenceKind } from "@/lib/evidence";

export function DraftReview({ sessionId }: { sessionId: string }) {
  const router = useRouter();
  const [narrative, setNarrative] = useState<string | null>(null);
  const [evidence, setEvidence] = useState<EvidenceKind[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [askName, setAskName] = useState(false);
  const [identity, setIdentity] = useState("");
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<{ referralCode: string; destinations: RouteDestination[] } | null>(null);
  const [copied, setCopied] = useState(false);
  const [saved, setSaved] = useState(false); // gate: kode wajib disimpan sebelum lanjut
  const [followupOn, setFollowupOn] = useState(false); // opt-in, DEFAULT OFF
  const [followupEmail, setFollowupEmail] = useState("");
  const [followupSaved, setFollowupSaved] = useState(false);
  const [followupError, setFollowupError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/draft/${sessionId}`)
      .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
      .then((d) => {
        setNarrative(d.narrative);
        setEvidence(Array.isArray(d.evidence) ? d.evidence : []);
      })
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
      window.scrollTo({ top: 0 });
    } catch {
      setError("Pengiriman gagal. Ceritamu tetap tersimpan — coba lagi sebentar lagi.");
    } finally {
      setSending(false);
    }
  }

  async function saveFollowup(code: string) {
    setFollowupError(null);
    const res = await fetch("/api/followup/enable", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code, email: followupEmail.trim() }),
    });
    if (res.ok) setFollowupSaved(true);
    else setFollowupError("Gagal mengaktifkan follow-up. Coba lagi sebentar ya.");
  }

  // ===== Layar konfirmasi (DESIGN.md §5.4) =====
  if (result) {
    return (
      <div className="mx-auto w-full max-w-[600px] px-4 py-12 pb-28">
        <div className="mx-auto mb-6 flex size-16 items-center justify-center rounded-full bg-primary">
          <Check className="size-8 text-ink" strokeWidth={2.5} aria-hidden />
        </div>
        <h1 className="mb-2 text-center text-2xl">Laporanmu sudah dikirim dengan aman.</h1>
        <p className="mb-8 text-center text-text-soft">Kamu sudah melangkah, dan itu berani.</p>

        {/* Kartu kode referensi */}
        <div className="mb-4 rounded-[var(--radius-lg)] border bg-background p-6 shadow-[var(--shadow-soft)]">
          <p className="mb-3 text-sm text-text-soft">
            Simpan kode ini — dengan kode ini kamu bisa membuka lagi percakapan, dokumen laporan,
            dan memantau status penanganannya. Tanpa perlu membuka identitas.
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <code className="rounded-[var(--radius-md)] bg-surface-alt px-5 py-2 font-mono text-[clamp(1.8rem,4vw,2.6rem)] font-semibold tracking-[0.08em] text-primary-ink">
              {result.referralCode}
            </code>
            <Button
              variant="outline"
              onClick={() => {
                navigator.clipboard.writeText(result.referralCode);
                setCopied(true);
                setSaved(true);
              }}
              className="min-h-11 rounded-full font-semibold"
            >
              {copied ? <Check className="size-4" aria-hidden /> : <Copy className="size-4" aria-hidden />}
              {copied ? "Kode tersalin ✓" : "Salin kode"}
            </Button>
          </div>

          {/* Gate: jangan lanjut sebelum kode disimpan. Client-only, tanpa storage —
              simpan kode di localStorage = jejak berbahaya di perangkat terpantau. */}
          <label className="mt-4 flex items-center gap-2 text-sm text-ink">
            <input
              type="checkbox"
              checked={saved}
              onChange={(e) => setSaved(e.target.checked)}
              className="size-4 shrink-0 accent-[var(--primary-deep)]"
            />
            Aku sudah menyimpan kodeku
          </label>
        </div>

        {/* Kartu transparansi rute (DESIGN.md §1.11) — bukti "AI tidak memutuskan rute" */}
        <div className="mb-8 rounded-[var(--radius-lg)] border bg-surface-alt p-6">
          <h2 className="mb-2 text-base font-semibold">Kenapa laporanmu ke sini?</h2>
          <ul className="space-y-2 text-sm leading-relaxed text-text-soft">
            {result.destinations.map((d) => (
              <li key={d}>{ROUTE_REASON[d]}</li>
            ))}
          </ul>
        </div>

        {/* Follow-up proaktif — opt-in, DEFAULT OFF (Panduan §4). Consent verbatim SEBELUM form email. */}
        <div className="mb-8 rounded-[var(--radius-lg)] border bg-background p-6 shadow-[var(--shadow-soft)]">
          <label className="flex cursor-pointer items-start gap-3">
            <input
              type="checkbox"
              checked={followupOn}
              onChange={(e) => setFollowupOn(e.target.checked)}
              className="mt-1 size-5 shrink-0 accent-[var(--primary-deep)]"
            />
            <span>
              <span className="font-semibold text-ink">Mau Lindra tanya kabar kamu nanti?</span>
              <span className="mt-0.5 block text-sm text-text-soft">Opsional — kamu bisa lewati ini.</span>
            </span>
          </label>

          {followupOn && !followupSaved && (
            <div className="mt-4 space-y-3">
              <p className="rounded-[var(--radius-md)] bg-warm-soft px-4 py-3 text-sm leading-relaxed text-ink">
                {FOLLOWUP_CONSENT}
              </p>
              <Input
                type="email"
                inputMode="email"
                autoComplete="off"
                value={followupEmail}
                onChange={(e) => setFollowupEmail(e.target.value)}
                placeholder="email yang cuma kamu yang bisa buka"
                aria-label="Email follow-up"
                className="min-h-12 rounded-[var(--radius-md)]"
              />
              <Button
                onClick={() => saveFollowup(result.referralCode)}
                disabled={!followupEmail.trim()}
                className="min-h-11 rounded-full font-semibold"
              >
                Aktifkan follow-up
              </Button>
              {followupError && <p className="text-sm text-danger">{followupError}</p>}
            </div>
          )}

          {followupSaved && (
            <p className="mt-3 flex items-center gap-2 text-sm font-medium text-primary-ink">
              <Check className="size-4" aria-hidden />
              Follow-up diaktifkan — kami akan menyapa lewat email netral.
            </p>
          )}
        </div>

        {saved ? (
          <div className="mb-10 flex flex-wrap justify-center gap-x-6 gap-y-2 text-sm font-medium">
            <Link href="/lacak" className="text-primary-ink underline underline-offset-4">
              Cek status laporan
            </Link>
            <Link href="/" className="text-primary-ink underline underline-offset-4">
              Kembali ke beranda
            </Link>
          </div>
        ) : (
          <p className="mb-10 text-center text-sm text-text-soft">
            Simpan kodemu dulu ya — salin atau centang di atas, baru bisa lanjut.
          </p>
        )}

        <EmergencyBar title="Kalau keadaan mendesak, jangan tunggu —" />
      </div>
    );
  }

  // ===== Tinjau draf (DESIGN.md §5.3) =====
  return (
    <div className="mx-auto w-full max-w-[680px] px-4 py-12 pb-28">
      <h1 className="mb-2 text-2xl">Draf ceritamu</h1>
      <p className="mb-6 text-text-soft">
        Ini rangkuman dari yang kamu ceritakan. Kamu yang pegang kendali — tidak ada yang terkirim
        sebelum kamu memilih kirim.
      </p>

      {error && <p className="mb-4 rounded-[var(--radius-md)] bg-warm-soft px-4 py-3 text-sm">{error}</p>}

      <div className="mb-6 rounded-[var(--radius-lg)] border bg-background p-6 leading-[1.65] whitespace-pre-wrap shadow-[var(--shadow-soft)]">
        {narrative ?? "Menyusun draf…"}
      </div>

      {/* Lampiran bukti — label generik saja, nama file asli tidak pernah ditampilkan */}
      <div className="mb-8 rounded-[var(--radius-lg)] border bg-background p-6 shadow-[var(--shadow-soft)]">
        <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-ink">
          <Paperclip className="size-4 text-primary-ink" aria-hidden />
          Lampiran bukti
        </h2>
        {evidence.length === 0 ? (
          <p className="text-sm text-text-soft">{NO_EVIDENCE_SENTINEL}</p>
        ) : (
          <ul className="space-y-2">
            {evidence.map((kind, i) => (
              <li key={i} className="flex items-center gap-2 text-sm text-text">
                {kind === "foto" ? (
                  <ImageIcon className="size-4 shrink-0 text-primary-ink" aria-hidden />
                ) : (
                  <FileText className="size-4 shrink-0 text-primary-ink" aria-hidden />
                )}
                Bukti {i + 1} ({kind})
              </li>
            ))}
          </ul>
        )}
      </div>

      {askName && (
        <div className="mb-6 space-y-2">
          <Label htmlFor="identity">Nama & kelas (hanya dibuka oleh pihak yang menangani, tercatat di jejak audit)</Label>
          <Input
            id="identity"
            value={identity}
            onChange={(e) => setIdentity(e.target.value)}
            placeholder="contoh: Rani, kelas 8B"
            autoComplete="off"
            className="min-h-12 rounded-[var(--radius-md)]"
          />
        </div>
      )}

      <div className="flex flex-col gap-3">
        {!askName ? (
          <>
            <Button
              variant="secondary"
              onClick={() => router.push("/chat")}
              className="min-h-[50px] rounded-full font-semibold"
            >
              <ArrowLeft className="size-4" aria-hidden />
              Aku masih mau cerita dulu
            </Button>
            <Button
              disabled={!narrative || sending}
              onClick={() => send("anonymous")}
              className="min-h-[50px] rounded-full font-semibold"
            >
              <Send className="size-4" aria-hidden />
              {sending ? "Mengirim…" : "Kirim tanpa nama"}
            </Button>
            <Button
              variant="outline"
              disabled={!narrative || sending}
              onClick={() => setAskName(true)}
              className="min-h-[50px] rounded-full font-semibold"
            >
              <UserRound className="size-4" aria-hidden />
              Kirim dengan nama
            </Button>
          </>
        ) : (
          <>
            <Button
              disabled={!identity.trim() || sending}
              onClick={() => send("named")}
              className="min-h-[50px] rounded-full font-semibold"
            >
              <Send className="size-4" aria-hidden />
              {sending ? "Mengirim…" : "Kirim dengan namaku"}
            </Button>
            <Button
              variant="secondary"
              onClick={() => setAskName(false)}
              className="min-h-[50px] rounded-full font-semibold"
            >
              Batal, kembali
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
