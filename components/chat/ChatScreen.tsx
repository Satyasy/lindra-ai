"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCheck, FileText, Send, Smile, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmergencyBar } from "@/components/EmergencyBar";
import { MicButton } from "@/components/chat/MicButton";
import { DraftCanvas, type StructuredDraft } from "@/components/draft/DraftCanvas";
import { LindraCharacter, BirdsMotif, GardenCorner } from "@/components/illustrations";

export type Msg = { role: "user" | "assistant"; content: string; ts?: number };
type Phase = "opening" | "gathering" | "ready" | "danger";

// Transparansi AI (DESIGN.md §1.3) — tampil sebagai HERO INTRO CARD. Nama "Lindra"
// boleh di sini (AI memperkenalkan diri).
const HERO_BODY =
  "apa pun yang lagi kamu pikirin atau alami, kamu bisa cerita di sini dengan caramu sendiri. " +
  "kamu yang pegang kendali — bisa berhenti kapan aja, dan nggak ada yang dikirim sebelum kamu setuju.";

const CHIPS = [
  { label: "Aku ingin membuat laporan", danger: false, info: false, primary: true },
  { label: "Aku butuh informasi dulu", danger: false, info: true, primary: false },
  { label: "Aku cuma ingin didengar", danger: false, info: false, primary: false },
  { label: "Aku sedang dalam bahaya", danger: true, info: false, primary: false },
];

// Sub-chip topik info (§5.2) — muncul saat siswa memilih "butuh informasi dulu"
const TOPICS = [
  "Apa itu kekerasan?",
  "Jenis kekerasan",
  "Hak dan perlindungan",
  "Layanan bantuan terdekat",
  "Lainnya",
];

const chipBase =
  "flex min-h-11 items-center rounded-full border px-4 text-sm font-medium shadow-[0_1px_6px_rgba(31,58,52,0.05)] transition-all hover:-translate-y-0.5";
const chipOutline = "border-border bg-surface text-primary-ink hover:border-primary/50 hover:bg-primary-soft";

function fmtTime(ts?: number) {
  return ts ? new Date(ts).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }) : "";
}

function TypingIndicator() {
  return (
    <div className="flex items-start gap-2.5 self-start bubble-in" aria-label="Lindra sedang menulis">
      <LindraCharacter size="sm" />
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

export function ChatScreen({
  initialMessages = [],
  initialDraft = null,
  initialSessionId = null,
  criticalSummary = null,
}: {
  initialMessages?: Msg[];
  initialDraft?: StructuredDraft | null;
  initialSessionId?: string | null;
  // Ringkasan (Report.narrative) bila dokumen ditandai KRITIS → tombol kirim ke SAPA 129.
  criticalSummary?: string | null;
} = {}) {
  const router = useRouter();
  // PEMICU 1 (korban, kasus kritis): link WhatsApp SAPA 129 dengan ringkasan ter-prefill.
  const waHref = criticalSummary
    ? `https://wa.me/${SAPA_WA}?text=${encodeURIComponent(criticalSummary.slice(0, 600))}`
    : null;
  // Sesi dilanjutkan (pengguna lama masukkan kode): mulai dari transkrip tersimpan,
  // fase langsung "gathering" (sembunyikan chip pembuka), dan hero intro tak diulang.
  const resumed = initialMessages.length > 0;
  const [messages, setMessages] = useState<Msg[]>(initialMessages);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [phase, setPhase] = useState<Phase>(resumed ? "gathering" : "opening");
  const [infoMode, setInfoMode] = useState(false);
  const [nudgeDismissed, setNudgeDismissed] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(initialSessionId);
  const [draft, setDraft] = useState<StructuredDraft | null>(initialDraft);
  const [panelOpen, setPanelOpen] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const nudgeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, phase, infoMode]);

  async function send(text: string, panic = false) {
    if (!text.trim() || sending) return;
    setInput("");
    setSending(true);
    if (nudgeTimer.current) clearTimeout(nudgeTimer.current);
    if (phase === "ready") setPhase("gathering");
    setMessages((m) => [...m, { role: "user", content: text, ts: Date.now() }]);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text, panic: panic || undefined }),
      });
      if (!res.body) throw new Error("no stream");

      setMessages((m) => [...m, { role: "assistant", content: "", ts: Date.now() }]);
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
          if (event.type === "crisis") setPhase("danger");
          if (event.type === "draft") {
            setDraft(event.draft);
            setPanelOpen(true);
          }
          if (event.type === "text") {
            setMessages((m) => {
              const next = [...m];
              next[next.length - 1] = {
                ...next[next.length - 1],
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
        { role: "assistant", content: "maaf, sambungannya lagi bermasalah. coba kirim lagi ya.", ts: Date.now() },
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
    if (chip.info) setInfoMode(true);
    send(chip.label, chip.danger);
  }

  const lastIsAssistant =
    messages.length > 0 && messages[messages.length - 1].role === "assistant";

  return (
    // Chrome (judul netral "Catatan Harian" + hamburger) disediakan StudentNav.
    // Baris: kolom chat (mengecil saat panel draf terbuka di desktop) + panel draf.
    <div className="flex min-h-0 flex-1">
    <div className="chat-canvas flex min-h-0 min-w-0 flex-1 flex-col">
      {/* PEMICU 1 — dokumen KRITIS: DI ATAS kolom chat, tombol kirim ringkasan ke SAPA 129
          (korban yang menekan — student agency). Merah = konteks krisis sungguhan. */}
      {waHref && (
        <div className="border-b border-danger-deep/40 bg-danger px-4 py-3 text-white sm:px-6">
          <div className="mx-auto flex w-full max-w-4xl 2xl:max-w-6xl flex-wrap items-center justify-between gap-3">
            <p className="font-bold">
              Kasus ini ditandai darurat. Kalau kamu mau, kirim ringkasannya ke SAPA 129.
            </p>
            <a
              href={waHref}
              target="_blank"
              rel="noopener noreferrer"
              className="flex min-h-11 items-center gap-2 rounded-full border border-white/25 bg-danger-deep px-4 text-sm font-semibold text-white transition-colors hover:border-white/60"
            >
              <Send className="size-4" strokeWidth={2} aria-hidden />
              Kirim dokumen ke SAPA 129
            </a>
          </div>
        </div>
      )}
      {/* pt besar di desktop supaya hero tidak tertabrak QuickExit fixed kanan-atas */}
      {/* [&>*]:shrink-0 — anak area scroll TIDAK boleh menyusut; kalau menyusut,
          section overflow-hidden (hero) ter-kompres & teksnya terklip. Biar kolom
          yang scroll, bukan kontennya yang dipangkas. */}
      <div className="no-scrollbar mx-auto flex w-full max-w-4xl 2xl:max-w-6xl flex-1 flex-col gap-4 overflow-y-auto px-4 pb-8 pt-6 sm:px-6 min-[900px]:pt-20 [&>*]:shrink-0">
        {/* HERO INTRO CARD — AI memperkenalkan diri (transparansi §1.3).
            Tak diulang saat sesi dilanjutkan: transkrip lama sudah memuat intro aslinya. */}
        {!resumed && (
        <section className="relative overflow-hidden rounded-[var(--radius-lg)] border border-border bg-surface p-6 shadow-[var(--shadow-soft)] sm:rounded-[28px] sm:p-7">
          {/* art graphic pojok kanan — dekoratif, bleed ke tepi (disembunyikan di mobile) */}
          <div className="pointer-events-none absolute inset-y-0 right-0 hidden w-64 sm:block" aria-hidden>
            <BirdsMotif className="absolute right-24 top-5 w-24" />
            <GardenCorner className="absolute bottom-0 right-0 w-56" />
          </div>
          <div className="relative flex items-start gap-4 sm:pr-44">
            <LindraCharacter size="lg" className="size-20 shrink-0" />
            <div className="min-w-0">
              <h2 className="text-[1.4rem] font-bold text-ink">hai, aku Lindra —</h2>
              <p className="mt-1 font-semibold text-primary-ink">
                aku AI, bukan manusia, dan bukan layanan darurat.
              </p>
              <p className="mt-3 leading-relaxed text-text-soft">{HERO_BODY}</p>
            </div>
          </div>
        </section>
        )}

        {messages.map((m, i) =>
          m.role === "assistant" && !m.content && sending ? null : m.role === "assistant" ? (
            <div key={i} className="flex max-w-[min(88%,44rem)] items-start gap-2.5 self-start bubble-in">
              <LindraCharacter size="sm" />
              <div className="min-w-0">
                <div className="rounded-[1.25rem] rounded-tl-[0.4rem] border border-border/70 bg-surface px-5 py-3.5 leading-relaxed whitespace-pre-wrap break-words text-text shadow-[var(--shadow-bubble)]">
                  {m.content}
                </div>
                {m.ts && (
                  <span className="mt-1 block pl-1 text-[0.6875rem] text-text-muted">{fmtTime(m.ts)}</span>
                )}
              </div>
            </div>
          ) : (
            <div key={i} className="flex max-w-[min(82%,40rem)] flex-col items-end gap-1 self-end bubble-in">
              {/* Bubble siswa: mint-gradient, teks --ink (≥4.5:1) */}
              <div className="bubble-user rounded-[1.25rem] rounded-br-[0.4rem] px-5 py-3.5 leading-relaxed whitespace-pre-wrap break-words text-ink shadow-[0_3px_16px_rgba(63,168,139,0.28)]">
                {m.content}
              </div>
              <span className="flex items-center gap-1 pr-1 text-[0.6875rem] text-text-muted">
                {fmtTime(m.ts)}
                <CheckCheck className="size-3.5 text-primary-deep" strokeWidth={2.5} aria-hidden />
                <span className="sr-only">terkirim</span>
              </span>
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
                className={`${chipBase} ${
                  chip.danger
                    ? "border-danger/40 bg-danger-soft text-danger-deep hover:border-danger"
                    : chip.primary
                      ? "border-transparent bg-primary text-ink hover:bg-primary-deep"
                      : chipOutline
                }`}
              >
                {chip.label}
              </button>
            ))}
          </div>
        )}

        {/* Sub-chip topik info di bawah bubble AI */}
        {infoMode && !sending && lastIsAssistant && (
          <div className="flex flex-wrap gap-2 pl-[2.625rem]">
            {TOPICS.map((t) => (
              <button key={t} onClick={() => send(t)} className={`${chipBase} ${chipOutline}`}>
                {t}
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

        {/* Draf sudah tersusun tapi panel tertutup → tombol buka lagi (anti kepencet close) */}
        {draft && !panelOpen && (
          <div className="bubble-in flex items-center gap-3 rounded-[var(--radius-md)] border border-primary/25 bg-surface px-5 py-4 shadow-[var(--shadow-soft)]">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-[var(--radius-md)] bg-primary-soft text-primary-ink">
              <FileText className="size-4" strokeWidth={2} aria-hidden />
            </span>
            <p className="flex-1 text-sm">
              Draf laporanmu tersimpan. Buka lagi kapan aja buat baca atau betulin.
            </p>
            <Button
              onClick={() => setPanelOpen(true)}
              className="min-h-11 rounded-full px-5 font-semibold"
            >
              Buka draf
            </Button>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <footer className="border-t border-border/70 bg-surface/85 px-4 py-3 backdrop-blur-sm max-sm:pb-16">
        <form
          className="mx-auto flex w-full max-w-4xl 2xl:max-w-6xl items-center gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            send(input);
          }}
        >
          {/* Mic STT (W1) menggantikan tombol upload statis. Hasil transkrip di-append
              ke input, tak menimpa ketikan, tak auto-send. Upload → EvidenceUpload (W3). */}
          <MicButton
            onTranscript={(t) => setInput((v) => (v ? `${v} ${t}` : t))}
          />

          <div className="relative flex-1">
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
              className="block max-h-32 min-h-12 w-full resize-none rounded-[1.6rem] border border-border bg-surface py-3 pl-5 pr-12 shadow-[0_2px_10px_rgba(31,58,52,0.05)] outline-none transition-shadow placeholder:text-text-muted focus-visible:border-primary/50 focus-visible:shadow-[0_2px_14px_rgba(63,168,139,0.18)] focus-visible:ring-2 focus-visible:ring-ring/40"
            />
            {/* Emoji picker (opsional) — untuk input pengguna, bukan emoji dekoratif UI */}
            <button
              type="button"
              onClick={() => setInput((v) => v + "🙂")}
              aria-label="Tambahkan emoji"
              className="absolute right-1.5 top-1/2 flex size-10 -translate-y-1/2 items-center justify-center rounded-full text-text-muted transition-colors hover:bg-surface-alt hover:text-primary-ink"
            >
              <Smile className="size-5" strokeWidth={2} aria-hidden />
            </button>
          </div>

          <Button
            type="submit"
            size="icon"
            disabled={sending || !input.trim()}
            aria-label="Kirim pesan"
            className="size-12 rounded-full bg-gradient-to-br from-[var(--primary)] to-[var(--primary-deep)] text-ink shadow-[0_4px_14px_rgba(63,168,139,0.35)] transition-all hover:brightness-105 disabled:from-[var(--primary)] disabled:to-[var(--primary)] disabled:shadow-none"
          >
            <Send className="size-5" strokeWidth={2.25} aria-hidden />
          </Button>
        </form>
        <p className="mx-auto mt-2 w-full max-w-4xl 2xl:max-w-6xl text-center text-xs text-text-muted">
          Bisa berhenti sebentar kapan saja — ceritamu tersimpan di perangkat ini.
        </p>
      </footer>
      </div>

      {/* Panel draf: desktop = menyempil di kanan (chat mengecil), mobile = overlay */}
      {draft && panelOpen && sessionId && (
        <DraftCanvas sessionId={sessionId} draft={draft} onClose={() => setPanelOpen(false)} />
      )}
    </div>
  );
}
