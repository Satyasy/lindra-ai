"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ArrowUp, BookOpen, LogOut, X } from "lucide-react";

type Msg = { role: "user" | "assistant"; content: string };

const OPENING =
  "hai! aku Lindra. apa pun yang lagi kamu pikirin atau alami, kamu bisa cerita di sini — pelan-pelan aja, aku dengerin.";

export function ChatScreen() {
  const router = useRouter();
  const [messages, setMessages] = useState<Msg[]>([{ role: "assistant", content: OPENING }]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [showNudge, setShowNudge] = useState(false);
  const [nudgeDismissed, setNudgeDismissed] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const nudgeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Banner ajakan halus di titik jeda alami (bukan modal): muncul setelah
  // beberapa giliran cerita + 6 detik tanpa aktivitas
  function armNudge(turnCount: number) {
    if (nudgeTimer.current) clearTimeout(nudgeTimer.current);
    if (turnCount >= 2 && !nudgeDismissed) {
      nudgeTimer.current = setTimeout(() => setShowNudge(true), 6000);
    }
  }

  async function send() {
    const text = input.trim();
    if (!text || sending) return;
    setInput("");
    setSending(true);
    setShowNudge(false);
    if (nudgeTimer.current) clearTimeout(nudgeTimer.current);
    setMessages((m) => [...m, { role: "user", content: text }, { role: "assistant", content: "" }]);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text }),
      });
      if (!res.body) throw new Error("no stream");

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
          if (event.type === "session") setSessionId(event.id);
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
      setMessages((m) => {
        const next = [...m];
        next[next.length - 1] = {
          role: "assistant",
          content: "maaf, sambungannya lagi bermasalah. coba kirim lagi ya.",
        };
        return next;
      });
    } finally {
      setSending(false);
      setMessages((m) => {
        armNudge(m.filter((x) => x.role === "user").length);
        return m;
      });
    }
  }

  return (
    <div className="flex h-dvh flex-col bg-background">
      {/* Header netral — judul tidak mengungkap fungsi aplikasi */}
      <header className="flex items-center justify-between border-b bg-card px-4 py-3">
        <h1 className="text-base font-semibold text-foreground">Catatan Harian</h1>
        {/* Keluar cepat: instan, tanpa loading state, replace() agar tak tercatat di riwayat */}
        <Button
          variant="secondary"
          size="sm"
          onClick={() => window.location.replace("https://www.google.com")}
          aria-label="Keluar cepat dari halaman ini"
        >
          <LogOut className="size-4" aria-hidden />
          Keluar cepat
        </Button>
      </header>

      {/* Percakapan */}
      <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-3 overflow-y-auto px-4 py-4">
        {messages.map((m, i) => (
          <div
            key={i}
            className={
              m.role === "assistant"
                ? "max-w-[85%] self-start rounded-2xl rounded-bl-sm bg-muted px-4 py-2.5 text-sm leading-relaxed text-foreground whitespace-pre-wrap"
                : "max-w-[85%] self-end rounded-2xl rounded-br-sm bg-primary px-4 py-2.5 text-sm leading-relaxed text-primary-foreground whitespace-pre-wrap"
            }
          >
            {m.content || "…"}
          </div>
        ))}
        <div ref={bottomRef} />
      </main>

      {/* Banner ajakan halus — bisa ditutup, bukan pop-up */}
      {showNudge && sessionId && (
        <div className="mx-auto w-full max-w-2xl px-4 pb-2">
          <div className="flex items-center gap-3 rounded-xl border bg-secondary px-4 py-3 text-sm text-secondary-foreground">
            <BookOpen className="size-4 shrink-0" aria-hidden />
            <p className="flex-1">
              Ceritamu sudah mulai tersusun. Mau lihat drafnya? Tidak harus dikirim sekarang.
            </p>
            <Button size="sm" variant="outline" onClick={() => router.push(`/draft/${sessionId}`)}>
              Lihat draf
            </Button>
            <button
              onClick={() => {
                setShowNudge(false);
                setNudgeDismissed(true);
              }}
              aria-label="Tutup ajakan"
              className="text-muted-foreground hover:text-foreground"
            >
              <X className="size-4" aria-hidden />
            </button>
          </div>
        </div>
      )}

      {/* Input */}
      <footer className="border-t bg-card px-4 py-3">
        <form
          className="mx-auto flex w-full max-w-2xl items-end gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            send();
          }}
        >
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                send();
              }
            }}
            placeholder="Tulis ceritamu di sini…"
            rows={1}
            aria-label="Tulis pesan"
            className="max-h-32 min-h-11 flex-1 resize-none rounded-xl border bg-background px-4 py-2.5 text-base outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
          <Button type="submit" size="icon" disabled={sending || !input.trim()} aria-label="Kirim pesan" className="size-11 rounded-xl">
            <ArrowUp className="size-5" aria-hidden />
          </Button>
        </form>
      </footer>
    </div>
  );
}
