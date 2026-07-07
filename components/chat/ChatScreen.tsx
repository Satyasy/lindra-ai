"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowUp, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmergencyBar } from "@/components/EmergencyBar";

type Msg = { role: "user" | "assistant"; content: string };
type Phase = "opening" | "gathering" | "ready" | "danger";

// Transparansi AI (DESIGN.md §1.3): Lindra memperkenalkan diri sebagai AI,
// bukan manusia, bukan layanan darurat, dan siswa pegang kendali
const OPENING =
  "hai, aku Lindra — aku AI, bukan manusia, dan bukan layanan darurat. " +
  "apa pun yang lagi kamu pikirin atau alami, kamu bisa cerita di sini dengan caramu sendiri. " +
  "kamu yang pegang kendali: bisa berhenti kapan aja, dan nggak ada yang dikirim sebelum kamu setuju.";

const CHIPS = [
  { label: "Aku ingin membuat laporan", danger: false },
  { label: "Aku butuh informasi dulu", danger: false },
  { label: "Aku cuma ingin didengar", danger: false },
  { label: "Aku sedang dalam bahaya", danger: true },
];

function TypingIndicator() {
  return (
    <div
      className="max-w-[80%] self-start rounded-[var(--radius-md)] rounded-bl-[var(--radius-sm)] border bg-background px-6 py-4"
      aria-label="Lindra sedang menulis"
    >
      {/* fallback teks untuk reduced-motion (DESIGN.md §2.4) */}
      <span className="hidden text-sm text-text-soft motion-reduce:inline">
        Lindra sedang menulis…
      </span>
      <span className="flex gap-1.5 motion-reduce:hidden" aria-hidden>
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="size-2 animate-bounce rounded-full bg-muted-foreground"
            style={{ animationDelay: `${i * 150}ms` }}
          />
        ))}
      </span>
    </div>
  );
}

export function ChatScreen() {
  const router = useRouter();
  const [messages, setMessages] = useState<Msg[]>([{ role: "assistant", content: OPENING }]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [phase, setPhase] = useState<Phase>("opening");
  const [nudgeDismissed, setNudgeDismissed] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const nudgeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, phase]);

  async function send(text: string, panic = false) {
    if (!text.trim() || sending) return;
    setInput("");
    setSending(true);
    if (nudgeTimer.current) clearTimeout(nudgeTimer.current);
    if (phase === "ready") setPhase("gathering");
    setMessages((m) => [...m, { role: "user", content: text }]);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text, panic: panic || undefined }),
      });
      if (!res.body) throw new Error("no stream");

      setMessages((m) => [...m, { role: "assistant", content: "" }]);
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
          const event = JSON.parse(line.slice(6));
          if (event.type === "crisis") setPhase("danger");
          if (event.type === "text") {
            setMessages((m) => {
              const next = [...m];
              next[next.length - 1] = {
                role: "assistant",
                content: next[next.length - 1].content + event.delta,
              };
              return next;
            });
          }
        }
      }
    } catch {
      setMessages((m) => [
        ...m.filter((x, i) => !(i === m.length - 1 && x.role === "assistant" && !x.content)),
        { role: "assistant", content: "maaf, sambungannya lagi bermasalah. coba kirim lagi ya." },
      ]);
    } finally {
      setSending(false);
      // Titik jeda alami: beberapa giliran cerita + 6 detik tanpa aktivitas
      setMessages((m) => {
        const turns = m.filter((x) => x.role === "user").length;
        setPhase((p) => {
          if (p === "danger") return p;
          if (turns >= 2 && !nudgeDismissed) {
            nudgeTimer.current = setTimeout(() => setPhase("ready"), 6000);
          }
          return "gathering";
        });
        return m;
      });
    }
  }

  function chipClick(chip: (typeof CHIPS)[number]) {
    if (chip.danger) setPhase("danger");
    send(chip.label, chip.danger);
  }

  return (
    // Chrome (judul "Catatan Harian" + hamburger) disediakan StudentNav — ChatScreen
    // hanya isi percakapan yang mengisi tinggi shell (flex-1, min-h-0 agar bisa scroll).
    <div className="flex min-h-0 flex-1 flex-col bg-background">
      <div className="mx-auto flex w-full max-w-[680px] flex-1 flex-col gap-3 overflow-y-auto px-4 py-5 pb-8">
        {messages.map((m, i) =>
          m.role === "assistant" && !m.content && sending ? null : (
            <div
              key={i}
              className={
                m.role === "assistant"
                  ? "max-w-[80%] self-start rounded-[var(--radius-md)] rounded-bl-[var(--radius-sm)] border bg-background px-6 py-4 leading-relaxed whitespace-pre-wrap shadow-[var(--shadow-soft)]"
                  : "max-w-[80%] self-end rounded-[var(--radius-md)] rounded-br-[var(--radius-sm)] bg-primary px-6 py-4 leading-relaxed whitespace-pre-wrap text-ink"
              }
            >
              {m.content}
            </div>
          )
        )}
        {sending && <TypingIndicator />}

        {/* Quick-reply chips di pembuka */}
        {phase === "opening" && !sending && (
          <div className="flex flex-wrap gap-2 pt-1">
            {CHIPS.map((chip) => (
              <button
                key={chip.label}
                onClick={() => chipClick(chip)}
                className={`min-h-11 rounded-full border px-4 text-sm font-medium transition-colors ${
                  chip.danger
                    ? // teks ink, bukan --danger: 14px medium butuh kontras 4.5:1 (danger/danger-soft cuma 3.2:1)
                      "border-danger/40 bg-danger-soft text-ink hover:border-danger"
                    : "bg-background text-primary-ink hover:bg-primary-soft"
                }`}
              >
                {chip.label}
              </button>
            ))}
          </div>
        )}

        {/* Fase danger: EmergencyBar inline, tanpa jeda/loading */}
        {phase === "danger" && (
          <div className="pt-2">
            <EmergencyBar />
          </div>
        )}

        {/* Banner ajakan halus inline di titik jeda alami — bukan modal */}
        {phase === "ready" && (
          <div className="flex items-center gap-3 rounded-[var(--radius-md)] border bg-surface-alt px-5 py-4 text-sm">
            <p className="flex-1">
              Kayaknya ceritamu udah cukup buat disusun jadi draf. Mau lihat? Kamu tetap bisa lanjut
              cerita kapan aja.
            </p>
            <Button
              onClick={() => router.push("/draft")}
              className="min-h-11 rounded-full px-5 font-semibold"
            >
              Lihat draf
            </Button>
            <button
              onClick={() => {
                setNudgeDismissed(true);
                setPhase("gathering");
              }}
              aria-label="Tutup ajakan"
              className="text-muted-foreground hover:text-foreground"
            >
              <X className="size-4" aria-hidden />
            </button>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <footer className="border-t bg-background px-4 py-3 max-sm:pb-16">
        <form
          className="mx-auto flex w-full max-w-[680px] items-end gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            send(input);
          }}
        >
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                send(input);
              }
            }}
            placeholder="Tulis dengan caramu sendiri…"
            rows={1}
            aria-label="Tulis pesan"
            className="max-h-32 min-h-12 flex-1 resize-none rounded-full border bg-background px-5 py-3 outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
          <Button
            type="submit"
            size="icon"
            disabled={sending || !input.trim()}
            aria-label="Kirim pesan"
            className="size-12 rounded-full bg-primary text-ink hover:bg-primary-deep"
          >
            <ArrowUp className="size-5" strokeWidth={2} aria-hidden />
          </Button>
        </form>
        <p className="mx-auto mt-2 w-full max-w-[680px] text-center text-xs text-muted-foreground">
          Bisa berhenti sebentar kapan saja — ceritamu tersimpan di perangkat ini.
        </p>
      </footer>
    </div>
  );
}
