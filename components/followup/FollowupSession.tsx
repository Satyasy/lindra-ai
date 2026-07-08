"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LindraCharacter } from "@/components/illustrations";

// Sesi check-in follow-up (reuse pola bubble + LindraCharacter dari chat).
// "Belum ada perkembangan" → noProgressCount++ (server). Saat mencapai 3, tawarkan
// OPSI SAPA 129 yang HARUS dipilih siswa — tak ada kiriman otomatis ke SAPA 129.
type Step = "checkin" | "done" | "sapa";

export function FollowupSession() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("checkin");
  const [busy, setBusy] = useState(false);

  async function checkin(progress: boolean) {
    setBusy(true);
    const res = await fetch("/api/followup/checkin", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ progress }),
    });
    const data = res.ok ? await res.json() : { noProgressCount: 0 };
    setBusy(false);
    setStep(!progress && data.noProgressCount >= 3 ? "sapa" : "done");
  }

  return (
    <div className="mx-auto w-full max-w-[560px] px-4 py-12 pb-28">
      <div className="mb-6 flex items-start gap-2.5">
        <LindraCharacter size="sm" />
        <div className="rounded-[1.25rem] rounded-tl-[0.4rem] border border-border/70 bg-surface px-5 py-3.5 leading-relaxed text-text shadow-[var(--shadow-bubble)]">
          {step === "checkin" &&
            "Hai, aku Lindra. Aku pengen tahu — gimana kabarmu sejak terakhir? Ada perkembangan?"}
          {step === "done" &&
            "Makasih udah mampir. Kamu yang pegang kendali — aku di sini kapan pun kamu butuh."}
          {step === "sapa" &&
            "Sepertinya ini terasa lama ya. Kalau kamu mau, kamu boleh menghubungi SAPA 129 — layanan nasional. Kamu yang memutuskan; aku tidak mengirim apa pun tanpa kamu."}
        </div>
      </div>

      {step === "checkin" && (
        <div className="flex flex-col gap-3 pl-[2.625rem]">
          <Button disabled={busy} onClick={() => checkin(true)} className="min-h-12 rounded-full font-semibold">
            Ada perkembangan baik
          </Button>
          <Button variant="outline" disabled={busy} onClick={() => checkin(false)} className="min-h-12 rounded-full font-semibold">
            Belum ada perkembangan
          </Button>
          <Button variant="secondary" disabled={busy} onClick={() => router.push("/chat")} className="min-h-12 rounded-full font-semibold">
            Aku ingin cerita lagi
          </Button>
        </div>
      )}

      {step === "sapa" && (
        <div className="pl-[2.625rem]">
          {/* --danger untuk SAPA 129 = sinyal krisis nyata; teks putih di atasnya ≥4.5:1 */}
          <a
            href="tel:129"
            className="flex min-h-12 items-center justify-center gap-2 rounded-full bg-danger px-6 font-semibold text-white transition-transform hover:scale-[1.02]"
          >
            <Phone className="size-5" strokeWidth={2} aria-hidden />
            Hubungi SAPA 129
          </a>
          <p className="mt-3 text-sm text-text-soft">
            Ini pilihanmu — tidak ada yang dikirim ke SAPA 129 secara otomatis.
          </p>
        </div>
      )}

      {step === "done" && (
        <div className="pl-[2.625rem]">
          <Button variant="secondary" onClick={() => router.push("/")} className="min-h-12 rounded-full font-semibold">
            Kembali ke beranda
          </Button>
        </div>
      )}
    </div>
  );
}
