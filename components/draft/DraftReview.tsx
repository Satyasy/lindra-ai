"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Check, Copy, Eye, FileText, Image as ImageIcon, Loader2, Paperclip, Plus, Send, Trash2, UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { EmergencyBar } from "@/components/EmergencyBar";
import { ROUTE_REASON, type RouteDestination } from "@/lib/routing/routing-engine";
import { FOLLOWUP_CONSENT } from "@/lib/followup-copy";
import { NO_EVIDENCE_SENTINEL, type EvidenceKind } from "@/lib/evidence";

// Mirror batas /api/evidence — filter picker; server tetap re-validasi.
const EVIDENCE_ACCEPT = "image/jpeg,image/png,image/webp,application/pdf";

type EvidenceItem = { id: string; kind: EvidenceKind };

export function DraftReview({ sessionId }: { sessionId: string }) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [narrative, setNarrative] = useState<string | null>(null);
  const [evidence, setEvidence] = useState<EvidenceItem[]>([]);
  const [addingEvidence, setAddingEvidence] = useState(false);
  const [evidenceError, setEvidenceError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [viewing, setViewing] = useState<string | null>(null);
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

  async function refetchEvidence() {
    const r = await fetch(`/api/draft/${sessionId}`);
    if (r.ok) {
      const d = await r.json();
      setEvidence(Array.isArray(d.evidence) ? d.evidence : []);
    }
  }

  async function addEvidence(files: FileList | null) {
    const list = Array.from(files ?? []);
    if (list.length === 0) return;
    setEvidenceError(null);
    setAddingEvidence(true);
    try {
      for (const file of list) {
        const body = new FormData();
        body.append("file", file);
        const res = await fetch("/api/evidence", { method: "POST", body });
        if (!res.ok)
          setEvidenceError(
            res.status === 413
              ? "Ada file yang terlalu besar — maksimal 10 MB."
              : res.status === 415
                ? "Ada file yang tipenya tidak didukung (hanya JPG/PNG/WebP/PDF)."
                : "Sebagian bukti gagal ditambahkan. Coba lagi sebentar ya."
          );
      }
      await refetchEvidence();
    } finally {
      setAddingEvidence(false);
    }
  }

  async function deleteEvidence(id: string) {
    setConfirmDelete(null);
    setViewing((v) => (v === id ? null : v));
    const res = await fetch(`/api/evidence/${id}`, { method: "DELETE" });
    if (res.ok) setEvidence((list) => list.filter((e) => e.id !== id));
    else setEvidenceError("Gagal menghapus bukti. Coba lagi sebentar ya.");
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

      {/* Bukti terlampir — kelola sebelum kirim: lihat / tambah / hapus. Label generik,
          nama file asli tak pernah ditampilkan. */}
      <div className="mb-8 rounded-[var(--radius-lg)] border bg-background p-6 shadow-[var(--shadow-soft)]">
        <h2 className="mb-1 flex items-center gap-2 text-sm font-semibold text-ink">
          <Paperclip className="size-4 text-primary-ink" aria-hidden />
          Bukti terlampir
        </h2>
        <p className="mb-3 text-sm text-text-soft">
          Kamu bisa menambah atau menghapus bukti di sini sebelum mengirim. Boleh kosong kalau tidak ada.
        </p>

        {evidence.length === 0 ? (
          <p className="text-sm text-text-soft">{NO_EVIDENCE_SENTINEL}</p>
        ) : (
          <ul className="space-y-2">
            {evidence.map((e, i) => (
              <li key={e.id} className="rounded-[var(--radius-md)] border bg-surface-alt p-2.5">
                <div className="flex items-center gap-2 text-sm text-text">
                  {e.kind === "foto" ? (
                    <ImageIcon className="size-4 shrink-0 text-primary-ink" aria-hidden />
                  ) : (
                    <FileText className="size-4 shrink-0 text-primary-ink" aria-hidden />
                  )}
                  <span className="flex-1">
                    Bukti {i + 1} ({e.kind})
                  </span>
                  <button
                    type="button"
                    onClick={() => setViewing((v) => (v === e.id ? null : e.id))}
                    aria-expanded={viewing === e.id}
                    className="flex min-h-11 items-center gap-1 rounded-full px-3 text-xs font-medium text-primary-ink hover:bg-primary-soft"
                  >
                    <Eye className="size-3.5" aria-hidden />
                    {viewing === e.id ? "Tutup" : "Lihat"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmDelete(e.id)}
                    aria-label={`Hapus bukti ${i + 1}`}
                    className="flex size-11 items-center justify-center rounded-full text-text-soft hover:bg-danger-soft hover:text-danger-deep"
                  >
                    <Trash2 className="size-4" aria-hidden />
                  </button>
                </div>

                {viewing === e.id && (
                  <div className="mt-2">
                    {e.kind === "foto" ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={`/api/evidence/${e.id}`}
                        alt={`Pratinjau bukti ${i + 1}`}
                        className="max-h-64 rounded-[var(--radius-md)] border"
                      />
                    ) : (
                      <a
                        href={`/api/evidence/${e.id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm font-medium text-primary-ink underline underline-offset-4"
                      >
                        Buka dokumen
                      </a>
                    )}
                  </div>
                )}

                {confirmDelete === e.id && (
                  <div className="mt-2 flex items-center gap-3 rounded-[var(--radius-md)] bg-danger-soft px-3 py-2 text-sm text-danger-deep">
                    <span className="flex-1">Hapus bukti ini?</span>
                    <button
                      type="button"
                      onClick={() => deleteEvidence(e.id)}
                      className="font-semibold underline underline-offset-2"
                    >
                      Ya, hapus
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmDelete(null)}
                      className="font-medium text-text-soft underline underline-offset-2"
                    >
                      Batal
                    </button>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}

        <input
          ref={fileRef}
          type="file"
          accept={EVIDENCE_ACCEPT}
          multiple
          hidden
          onChange={(ev) => {
            addEvidence(ev.target.files);
            ev.target.value = "";
          }}
        />
        <Button
          type="button"
          variant="outline"
          onClick={() => fileRef.current?.click()}
          disabled={addingEvidence}
          className="mt-3 min-h-11 rounded-full font-semibold"
        >
          {addingEvidence ? (
            <Loader2 className="size-4 animate-spin" aria-hidden />
          ) : (
            <Plus className="size-4" aria-hidden />
          )}
          {addingEvidence ? "Menambahkan…" : "Tambah bukti"}
        </Button>
        {evidenceError && <p className="mt-2 text-sm text-danger">{evidenceError}</p>}
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
