"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Phone, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LindraCharacter } from "@/components/illustrations";

// Sesi follow-up KABAR → CEK_KASUS. AI mengisi balasan KABAR; transisi & pertanyaan
// CEK_KASUS (template + tombol Iya/Tidak) deterministik dari server. Tier 1 (krisis) dan
// tawaran SAPA 129 dikirim server sebagai event SSE — klien hanya merender.
type Msg = { role: "assistant" | "user"; content: string };
type Phase = "loading" | "kabar" | "cek_kasus" | "closed" | "crisis";
type Event =
  | { type: "text"; delta: string }
  | { type: "sapa129" }
  | { type: "crisis"; category?: string }
  | { type: "cek_kasus"; question: string; category: string }
  | { type: "done" };

export function FollowupSession() {
  const router = useRouter();
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [phase, setPhase] = useState<Phase>("loading");
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [showSapa, setShowSapa] = useState(false);
  const [offeredNewIntake, setOfferedNewIntake] = useState(false); // "Tidak" → tawarkan cerita lagi
  const started = useRef(false);
  const bottom = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Tanpa `behavior` eksplisit → ikut CSS scroll-behavior (globals: smooth, tapi
    // dipaksa auto saat prefers-reduced-motion). Jangan hardcode "smooth" (rule #10).
    bottom.current?.scrollIntoView({ block: "end" });
  }, [msgs]);

  // Buka sesi sekali: minta opener (atau tawaran SAPA 129) dari server.
  useEffect(() => {
    if (started.current) return;
    started.current = true;
    void send({ init: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Kirim init/message, baca SSE, rangkai balasan asisten (streaming ke bubble terakhir).
  async function send(body: { init: true } | { message: string }) {
    setBusy(true);
    setMsgs((m) => [...m, { role: "assistant", content: "" }]); // bubble kosong utk streaming
    let nextPhase: Phase = "kabar";
    try {
      const res = await fetch("/api/followup/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok || !res.body) throw new Error("no stream");
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";
        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          let ev: Event;
          try {
            ev = JSON.parse(line.slice(6));
          } catch {
            continue;
          }
          if (ev.type === "text") {
            setMsgs((m) => appendToLastAssistant(m, ev.delta));
          } else if (ev.type === "sapa129") {
            setShowSapa(true);
          } else if (ev.type === "crisis") {
            nextPhase = "crisis";
            setShowSapa(true);
          } else if (ev.type === "cek_kasus") {
            setMsgs((m) => [...m, { role: "assistant", content: ev.question }]);
            nextPhase = "cek_kasus";
          }
        }
      }
    } catch {
      setMsgs((m) => appendToLastAssistant(m, "Maaf, ada gangguan sebentar. Coba lagi ya."));
    }
    setBusy(false);
    setPhase(nextPhase);
  }

  async function answerKabar(e: React.FormEvent) {
    e.preventDefault();
    const text = input.trim();
    if (!text || busy) return;
    setInput("");
    setMsgs((m) => [...m, { role: "user", content: text }]);
    await send({ message: text });
  }

  async function decide(decision: "iya" | "tidak") {
    if (busy) return;
    setBusy(true);
    const res = await fetch("/api/followup/decision", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ decision }),
    });
    const data = res.ok ? await res.json() : { message: "Makasih ya. Kamu yang pegang kendali." };
    setMsgs((m) => [...m, { role: "assistant", content: data.message }]);
    setBusy(false);
    setPhase("closed");
    if (decision === "tidak") setOfferedNewIntake(true);
  }

  return (
    <div className="mx-auto w-full max-w-[560px] px-4 py-12 pb-28">
      <div className="flex flex-col gap-6">
        {msgs.map((m, i) =>
          m.role === "assistant" ? (
            <div key={i} className="flex items-start gap-2.5">
              <LindraCharacter size="sm" />
              <div className="whitespace-pre-line rounded-[1.25rem] rounded-tl-[0.4rem] border border-border/70 bg-surface px-5 py-3.5 leading-relaxed text-text shadow-[var(--shadow-bubble)]">
                {m.content || "…"}
              </div>
            </div>
          ) : (
            <div key={i} className="flex justify-end">
              <div className="whitespace-pre-line rounded-[1.25rem] rounded-tr-[0.4rem] bg-primary px-5 py-3.5 leading-relaxed text-ink">
                {m.content}
              </div>
            </div>
          )
        )}
        <div ref={bottom} />
      </div>

      {/* KABAR — jawaban bebas (Tier 1 memindai di server). */}
      {phase === "kabar" && (
        <form onSubmit={answerKabar} className="mt-6 flex flex-wrap gap-2 pl-[2.625rem]">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Tulis kabarmu…"
            aria-label="Kabarmu"
            disabled={busy}
            autoComplete="off"
            className="min-h-12 w-full min-w-0 flex-1 basis-52 rounded-full border bg-background px-5 outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-60"
          />
          <Button
            type="submit"
            disabled={busy || !input.trim()}
            aria-label="Kirim"
            className="flex size-12 shrink-0 items-center justify-center rounded-full p-0"
          >
            <Send className="size-5" aria-hidden />
          </Button>
        </form>
      )}

      {/* CEK_KASUS — sinyal terstruktur (bukan AI menafsir teks). "Nggak yakin" = tetap boleh tak menjawab. */}
      {phase === "cek_kasus" && (
        <div className="mt-6 flex flex-col gap-3 pl-[2.625rem]">
          <Button
            disabled={busy}
            onClick={() => decide("iya")}
            className="min-h-12 rounded-full font-semibold"
          >
            Iya, masih perlu ditindaklanjuti
          </Button>
          <Button
            variant="outline"
            disabled={busy}
            onClick={() => decide("tidak")}
            className="min-h-12 rounded-full font-semibold"
          >
            Tidak, sudah tidak perlu
          </Button>
        </div>
      )}

      {/* SAPA 129 — hanya saat ditawarkan server (kemandekan admin) atau krisis Tier 1. */}
      {showSapa && (
        <div className="mt-6 pl-[2.625rem]">
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

      {/* Penutup — "Tidak" menawarkan cerita lagi (intake BARU, bukan sesi ini). */}
      {phase === "closed" && (
        <div className="mt-6 flex flex-col gap-3 pl-[2.625rem]">
          {offeredNewIntake && (
            <Button
              onClick={() => router.push("/chat")}
              className="min-h-12 rounded-full font-semibold"
            >
              Aku ingin cerita hal baru
            </Button>
          )}
          <Button
            variant="secondary"
            onClick={() => router.push("/")}
            className="min-h-12 rounded-full font-semibold"
          >
            Kembali ke beranda
          </Button>
        </div>
      )}
    </div>
  );
}

// Tambah delta ke bubble asisten terakhir (satu stream aktif pada satu waktu → aman).
function appendToLastAssistant(m: Msg[], delta: string): Msg[] {
  const last = m[m.length - 1];
  if (!last || last.role !== "assistant") return [...m, { role: "assistant", content: delta }];
  return [...m.slice(0, -1), { ...last, content: last.content + delta }];
}
