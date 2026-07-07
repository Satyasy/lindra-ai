"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowUp, BookOpen, X } from "lucide-react";
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

// Avatar Lindra — lingkaran hijau tua (anchor --ink) + ikon "Catatan Harian".
// Deep green vs bubble putih = hierarki jelas & modern; ikon putih 11:1 (aman).
function LindraAvatar() {
  return (
    <div
      className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full bg-ink text-white shadow-[0_2px_8px_rgba(31,58,52,0.25)]"
      aria-hidden
    >
      <BookOpen className="size-4" strokeWidth={2} />
    </div>
  );
}

function TypingIndicator() {
  return (
    <div className="flex items-start gap-2.5 self-start bubble-in" aria-label="Lindra sedang menulis">
      <LindraAvatar />
      <div className="rounded-[1.25rem] rounded-tl-[0.4rem] border border-border/70 bg-surface px-5 py-4 shadow-[var(--shadow-bubble)]">
        {/* fallback teks untuk reduced-motion (DESIGN.md §2.4) */}
        <span className="hidden text-sm text-text-soft motion-reduce:inline">
          Lindra sedang menulis…
        </span>
        <span className="flex gap-1.5 motion-reduce:hidden" aria-hidden>
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              className="size-2 animate-bounce rounded-full bg-primary-deep/70"
              style={{ animationDelay: `${i * 150}ms` }}
            />
          ))}
        </span>
      </div>
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
    // chat-canvas: kanvas ber-tint lembut supaya bubble putih terangkat.
    <div className="chat-canvas flex min-h-0 flex-1 flex-col">
      <div className="mx-auto flex w-full max-w-[720px] flex-1 flex-col gap-4 overflow-y-auto px-4 py-6 pb-8">
        {messages.map((m, i) =>
          m.role === "assistant" && !m.content && sending ? null : m.role === "assistant" ? (
            <div key={i} className="flex max-w-[88%] items-start gap-2.5 self-start bubble-in">
              <LindraAvatar />
              <div className="rounded-[1.25rem] rounded-tl-[0.4rem] border border-border/70 bg-surface px-5 py-3.5 leading-relaxed whitespace-pre-wrap text-text shadow-[var(--shadow-bubble)]">
                {m.content}
              </div>
            </div>
          ) : (
            <div
              key={i}
              className="bubble-user bubble-in max-w-[82%] self-end rounded-[1.25rem] rounded-br-[0.4rem] px-5 py-3.5 leading-relaxed whitespace-pre-wrap text-ink shadow-[0_3px_16px_rgba(63,168,139,0.28)]"
            >
              {m.content}
            </div>
          )
        )}
        {sending && <TypingIndicator />}

        {/* Quick-reply chips di pembuka */}
        {phase === "opening" && !sending && (
          <div className="flex flex-wrap gap-2 pt-1 pl-[2.625rem]">
            {CHIPS.map((chip) => (
              <button
                key={chip.label}
                onClick={() => chipClick(chip)}
                className={`min-h-11 rounded-full border px-4 text-sm font-medium shadow-[0_1px_6px_rgba(31,58,52,0.05)] transition-all hover:-translate-y-0.5 ${
                  chip.danger
                    ? // teks ink, bukan --danger: 14px medium butuh kontras 4.5:1 (danger/danger-soft cuma 3.2:1)
                      "border-danger/40 bg-danger-soft text-ink hover:border-danger"
                    : "border-border bg-surface text-primary-ink hover:border-primary/50 hover:bg-primary-soft"
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
          <div className="bubble-in flex items-center gap-3 rounded-[var(--radius-md)] border border-primary/25 bg-surface px-5 py-4 text-sm shadow-[var(--shadow-soft)]">
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

      <footer className="border-t border-border/70 bg-surface/85 px-4 py-3 backdrop-blur-sm max-sm:pb-16">
        <form
          className="mx-auto flex w-full max-w-[720px] items-end gap-2"
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
            className="max-h-32 min-h-12 flex-1 resize-none rounded-[1.6rem] border border-border bg-surface px-5 py-3 shadow-[0_2px_10px_rgba(31,58,52,0.05)] outline-none transition-shadow placeholder:text-text-muted focus-visible:border-primary/50 focus-visible:shadow-[0_2px_14px_rgba(63,168,139,0.18)] focus-visible:ring-2 focus-visible:ring-ring/40"
          />
          <Button
            type="submit"
            size="icon"
            disabled={sending || !input.trim()}
            aria-label="Kirim pesan"
            className="size-12 rounded-full bg-gradient-to-br from-[var(--primary)] to-[var(--primary-deep)] text-ink shadow-[0_4px_14px_rgba(63,168,139,0.35)] transition-all hover:brightness-105 disabled:from-[var(--primary)] disabled:to-[var(--primary)] disabled:shadow-none"
          >
            <ArrowUp className="size-5" strokeWidth={2.25} aria-hidden />
          </Button>
        </form>
        <p className="mx-auto mt-2 w-full max-w-[720px] text-center text-xs text-text-muted">
          Bisa berhenti sebentar kapan saja — ceritamu tersimpan di perangkat ini.
        </p>
      </footer>
    </div>
  );
}