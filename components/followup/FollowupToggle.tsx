"use client";

import { useState } from "react";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FOLLOWUP_CONSENT } from "@/lib/followup-copy";

// Demo juri — tombol kirim-email-tes (cron tak jalan di next dev). Off di produksi.
const demo = process.env.NEXT_PUBLIC_DEMO_MODE === "true";

// Toggle follow-up di /lacak — terikat ke laporan yang barusan dicek (via kode).
// DEFAULT OFF. ON → wajib "email rahasia" + peringatan verbatim SEBELUM form; email
// disimpan TERENKRIPSI (server). OFF → proactiveEnabled=false. Switch aksesibel
// (role="switch", keyboard), target sentuh ≥44px.
export function FollowupToggle({ code, initialEnabled }: { code: string; initialEnabled: boolean }) {
  const [enabled, setEnabled] = useState(initialEnabled);
  const [arming, setArming] = useState(false); // switch ON, form tampil, belum tersimpan
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [testMsg, setTestMsg] = useState<string | null>(null);

  const on = enabled || arming;

  async function toggle() {
    setError(null);
    if (enabled) {
      setBusy(true);
      const res = await fetch("/api/followup/enable", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, enabled: false }),
      });
      setBusy(false);
      if (res.ok) setEnabled(false);
      else setError("Gagal mematikan follow-up. Coba lagi sebentar ya.");
    } else if (arming) {
      setArming(false); // batal sebelum simpan
    } else {
      setArming(true); // buka form + peringatan
    }
  }

  async function save() {
    setError(null);
    setBusy(true);
    const res = await fetch("/api/followup/enable", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code, email: email.trim() }),
    });
    setBusy(false);
    if (res.ok) {
      setEnabled(true);
      setArming(false);
      setEmail("");
    } else {
      setError("Gagal mengaktifkan. Periksa emailnya lalu coba lagi ya.");
    }
  }

  // Demo juri — picu email follow-up sekarang (cron tak jalan di next dev).
  async function testSend() {
    setTestMsg("Mengirim…");
    const res = await fetch("/api/followup/test-send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) setTestMsg(`Gagal: ${data.error ?? res.status}`);
    else if (data.skipped) setTestMsg("Di-skip: RESEND_API_KEY belum diset.");
    else setTestMsg("Terkirim ke email follow-up — cek inbox (dan folder spam).");
  }

  return (
    <section className="rounded-[var(--radius-lg)] border bg-background p-6 shadow-[var(--shadow-soft)]">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="font-semibold text-ink">Mau ditanyain kabarnya nanti?</p>
          <p className="mt-0.5 text-sm text-text-soft">
            Opsional — Lindra bisa menyapa lewat email netral. Kamu bisa matikan kapan saja.
          </p>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={on}
          aria-label="Aktifkan follow-up"
          disabled={busy}
          onClick={toggle}
          className="inline-flex min-h-11 shrink-0 items-center rounded-full focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:opacity-50"
        >
          <span
            className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors ${
              on ? "bg-primary" : "bg-border"
            }`}
          >
            <span
              className={`inline-block size-5 rounded-full bg-surface shadow transition-transform ${
                on ? "translate-x-6" : "translate-x-1"
              }`}
            />
          </span>
        </button>
      </div>

      {enabled && (
        <div className="mt-4 space-y-3">
          <p className="flex items-center gap-2 text-sm font-medium text-primary-ink">
            <Check className="size-4" aria-hidden />
            Follow-up aktif — kami akan menyapa lewat email netral.
          </p>
          {demo && (
            <div className="space-y-2">
              <Button
                type="button"
                variant="outline"
                onClick={testSend}
                className="min-h-11 rounded-full font-semibold"
              >
                Kirim email tes sekarang
              </Button>
              {testMsg && <p className="text-sm text-text-soft">{testMsg}</p>}
            </div>
          )}
        </div>
      )}

      {arming && !enabled && (
        <div className="mt-4 space-y-3">
          <p className="rounded-[var(--radius-md)] bg-warm-soft px-4 py-3 text-sm leading-relaxed text-ink">
            {FOLLOWUP_CONSENT}
          </p>
          <Input
            type="email"
            inputMode="email"
            autoComplete="off"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="email yang cuma kamu yang bisa buka"
            aria-label="Email follow-up"
            className="min-h-12 rounded-[var(--radius-md)]"
          />
          <Button onClick={save} disabled={!email.trim() || busy} className="min-h-11 rounded-full font-semibold">
            Aktifkan follow-up
          </Button>
        </div>
      )}

      {error && <p className="mt-3 text-sm text-danger">{error}</p>}
    </section>
  );
}
