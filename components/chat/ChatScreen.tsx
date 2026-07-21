"use client";

import { useEffect, useRef, useState } from "react";
import { CheckCheck, FileText, RotateCcw, Send, Smile } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmergencyBar } from "@/components/EmergencyBar";
import { MicButton } from "@/components/chat/MicButton";
import { EvidenceUpload } from "@/components/chat/EvidenceUpload";
import { DraftCanvas, type StructuredDraft } from "@/components/draft/DraftCanvas";
import { LindraCharacter, BirdsMotif, GardenCorner } from "@/components/illustrations";
import { useChatUI } from "@/components/chat/chat-ui-context";
import { SAPA_WA } from "@/lib/emergency-contacts";

export type Msg = { role: "user" | "assistant"; content: string; ts?: number };
type Phase = "opening" | "gathering" | "danger";

// Transparansi AI (DESIGN.md §1.3) — tampil sebagai HERO INTRO CARD. Nama "Lindra"
// boleh di sini (AI memperkenalkan diri). Diringkas ~35% (satu kalimat, bukan dua).
const HERO_BODY =
  "cerita aja dengan caramu sendiri — kamu yang pegang kendali, bisa berhenti kapan aja, dan nggak ada yang dikirim sebelum kamu setuju.";

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
  "flex min-h-11 items-center rounded-full border px-4 text-sm font-medium shadow-[0_1px_6px_rgba(31,58,52,0.05)] transition-all duration-[180ms] ease-out hover:-translate-y-0.5";
const chipOutline = "border-border bg-surface text-primary-ink hover:border-primary/50 hover:bg-primary-soft";

function fmtTime(ts?: number) {
  return ts ? new Date(ts).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }) : "";
}

const delay = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

const prefersReducedMotion = () =>
  typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

// Jeda sebelum tiap bubble, diskalakan panjang kalimat (brief: pendek 500–800ms,
// normal 1.2–1.8s, panjang ~1.8–3s). Respek emosi, bukan lambat asal-asalan.
// ponytail: regex pemisah kalimat + band panjang — setel ulang bila bentuk output AI berubah.
function segmentDelay(t: string) {
  const n = t.trim().length;
  if (n < 60) return 500 + Math.min(300, n * 5); // ~500–800ms
  if (n < 160) return 1200 + Math.min(600, (n - 60) * 6); // ~1.2–1.8s
  return 1800 + Math.min(1200, (n - 160) * 4); // ~1.8–3s
}

// Bobot emosional pesan siswa (0..1) → pengali jeda balasan. Cerita berat/panjang
// → Lindra "menarik napas" sedikit lebih lama sebelum menjawab; obrolan ringan →
// sedikit lebih cepat. DIRASAKAN, tak terlihat: hanya memengaruhi timing, bukan warna.
// ponytail: heuristik afek — setel daftar kata & band dengan transkrip nyata.
const AFFECT_WORDS =
  /(takut|sedih|nangis|menangis|malu|capek|lelah|(g|ng)a+k?\s*kuat|putus asa|sendiri|kesepian|benci|marah|trauma|sakit|dipukul|ditendang|dipaksa|diancam|dilecehkan|disentuh|hancur|nyerah|menyerah|mati|bunuh|gapunya|nggak ada gunanya|ga ada gunanya)/i;
function messageIntensity(text: string) {
  const len = text.trim().length;
  let s = 0;
  if (len > 120) s += 1;
  else if (len > 40) s += 0.5;
  if (AFFECT_WORDS.test(text)) s += 1;
  return Math.min(1, s / 2); // 0..1
}
// 0.9 (ringan) … 1.35 (berat)
const paceMultiplier = (text: string) => 0.9 + messageIntensity(text) * 0.45;

// Batas kalimat terdekat dalam buffer: terminator (. ! ? …) diikuti spasi/akhir,
// ATAU newline (baris pendek jadi bubble sendiri). Kembalikan indeks tepat setelah
// batas, atau -1. Saat belum `done`, terminator di ujung buffer diabaikan (bisa jadi
// token belum utuh, mis. angka "3.14").
function nextBoundary(buf: string, done: boolean) {
  let best = -1;
  const nl = buf.indexOf("\n");
  if (nl !== -1) best = nl + 1;
  const re = /[.!?…]+["'”’)\]]*/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(buf))) {
    const after = m.index + m[0].length;
    const nextCh = buf[after];
    const ok = nextCh === undefined ? done : /\s/.test(nextCh);
    if (ok) {
      if (best === -1 || after < best) best = after;
      break;
    }
  }
  return best;
}

function TypingIndicator() {
  return (
    <div className="flex items-start gap-2.5 self-start bubble-in" aria-label="Lindra sedang menulis">
      {/* Avatar bernapas lembut selagi Lindra "memikirkan" balasan (reduced-motion → diam). */}
      <LindraCharacter size="sm" className="avatar-breathe" />
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
  const { started, markStarted } = useChatUI();
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
  // Pesan gagal terkirim (sambungan error) — disimpan agar bisa dikirim ULANG lewat
  // tombol, tanpa siswa mengetik ulang (temuan #5). null = tak ada error.
  const [failed, setFailed] = useState<{ text: string; panic: boolean; control?: "resolve-evidence" } | null>(null);
  const [phase, setPhase] = useState<Phase>(resumed ? "gathering" : "opening");
  const [infoMode, setInfoMode] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(initialSessionId);
  const [draft, setDraft] = useState<StructuredDraft | null>(initialDraft);
  const [draftReady, setDraftReady] = useState<boolean>(!!initialDraft);
  // W3 — langkah bukti: flag dari backend (business logic, bukan parsing teks AI).
  // Draf sudah ada (sesi lanjutan) → langkah bukti pasti sudah lewat.
  const [evidence, setEvidence] = useState({ questionAsked: false, resolved: !!initialDraft });
  const [consentDismissed, setConsentDismissed] = useState(false);
  const [panelOpen, setPanelOpen] = useState(false);
  const [badge, setBadge] = useState(false); // floating "Draft diperbarui"
  const [idle, setIdle] = useState(false); // hening lama → presence menenangkan
  const [heroLeaving, setHeroLeaving] = useState(false);
  const [heroGone, setHeroGone] = useState(resumed);
  const bottomRef = useRef<HTMLDivElement>(null);
  const badgeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Sesi dilanjutkan = percakapan sudah berjalan → langsung fokus (sidebar mengempis).
  useEffect(() => {
    if (resumed) markStarted();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, phase, infoMode, sending]);

  // Hening ~18 detik (percakapan sudah jalan, tak mengetik/mengirim) → presence
  // berganti ke kalimat menenangkan. Aktivitas apa pun mereset ke "siap mendengarkan".
  useEffect(() => {
    setIdle(false);
    if (sending || input.trim() || !started) return;
    const t = setTimeout(() => setIdle(true), 18000);
    return () => clearTimeout(t);
  }, [messages, sending, input, started]);

  // Welcome card keluar (fade + naik) begitu percakapan dimulai, lalu di-unmount.
  useEffect(() => {
    if (started && !resumed && !heroGone && !heroLeaving) {
      setHeroLeaving(true);
      const t = setTimeout(() => setHeroGone(true), 400);
      return () => clearTimeout(t);
    }
  }, [started, resumed, heroGone, heroLeaving]);

  function flashBadge() {
    setBadge(true);
    if (badgeTimer.current) clearTimeout(badgeTimer.current);
    badgeTimer.current = setTimeout(() => setBadge(false), 3500);
  }

  // control "resolve-evidence" (W3): sinyal tanpa pesan/bubble siswa — buka gate draf.
  async function send(text: string, panic = false, control?: "resolve-evidence", retry = false) {
    if ((!text.trim() && !control) || sending) return;
    markStarted(); // pesan pertama → sidebar mengempis, hero keluar, chat melebar
    setFailed(null); // kirim baru / kirim ulang → buang state error lama
    setInput("");
    setSending(true);
    // retry: bubble siswa sudah ada dari percobaan yang gagal — jangan digandakan.
    if (!control && !retry) setMessages((m) => [...m, { role: "user", content: text, ts: Date.now() }]);

    const reduce = prefersReducedMotion();
    // Pengali jeda dari bobot emosional pesan siswa (dirasakan, tak terlihat).
    const mult = paceMultiplier(text);
    let isCrisis = false;
    const pushBubble = (content: string) =>
      setMessages((m) => [...m, { role: "assistant", content, ts: Date.now() }]);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text, panic: panic || undefined, control }),
      });
      if (!res.body) throw new Error("no stream");

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let lineBuf = ""; // buffer baris SSE
      let sentenceBuf = ""; // teks asisten yang belum ditampilkan
      let streamDone = false;

      for (;;) {
        const { done, value } = await reader.read();
        if (done) streamDone = true;
        if (value) {
          lineBuf += decoder.decode(value, { stream: true });
          const lines = lineBuf.split("\n");
          lineBuf = lines.pop() ?? "";
          for (const line of lines) {
            if (!line.startsWith("data: ")) continue;
            const event = JSON.parse(line.slice(6));
            if (event.type === "session") setSessionId(event.id);
            if (event.type === "crisis") {
              isCrisis = true;
              setPhase("danger");
            }
            if (event.type === "draft") {
              setDraft(event.draft);
              setDraftReady(true);
              setConsentDismissed(false);
              flashBadge();
            }
            if (event.type === "evidence")
              setEvidence({ questionAsked: event.questionAsked, resolved: event.resolved });
            if (event.type === "text") sentenceBuf += event.delta;
          }
        }

        // KRISIS atau reduced-motion → tanpa pacing: tampilkan utuh saat stream selesai.
        // (DESIGN.md §5.2 — tak ada jeda di titik krisis; aksesibilitas reduced-motion.)
        if (isCrisis || reduce) {
          if (streamDone) {
            if (sentenceBuf.trim()) pushBubble(sentenceBuf.trim());
            break;
          }
          continue;
        }

        // Progresif: tampilkan tiap kalimat sebagai bubble sendiri begitu utuh.
        for (;;) {
          const b = nextBoundary(sentenceBuf, streamDone);
          if (b === -1) {
            if (streamDone && sentenceBuf.trim()) {
              await delay(segmentDelay(sentenceBuf) * mult);
              pushBubble(sentenceBuf.trim());
              sentenceBuf = "";
            }
            break;
          }
          const seg = sentenceBuf.slice(0, b).trim();
          sentenceBuf = sentenceBuf.slice(b);
          if (!seg) continue;
          await delay(segmentDelay(seg) * mult);
          pushBubble(seg);
        }
        if (streamDone) break;
      }
    } catch {
      // Sambungan putus → simpan pesan gagal supaya bisa dikirim ulang lewat tombol
      // (siswa tak perlu mengetik ulang). Tombol "Coba lagi" muncul di bawah thread.
      setFailed({ text, panic, control });
    } finally {
      setSending(false);
      setPhase((p) => (p === "danger" ? p : "gathering"));
    }
  }

  function chipClick(chip: (typeof CHIPS)[number]) {
    if (chip.danger) setPhase("danger");
    if (chip.info) setInfoMode(true);
    send(chip.label, chip.danger);
  }

  const lastIsAssistant =
    messages.length > 0 && messages[messages.length - 1].role === "assistant";
  const showHero = !heroGone;
  const showConsent = draftReady && !panelOpen && !consentDismissed && !sending;
  const showReopen = !!draft && !panelOpen && consentDismissed && !sending;

  return (
    // Chrome (judul netral "Catatan Harian" + hamburger) disediakan StudentNav.
    // Baris: kolom chat (mengecil saat panel draf terbuka di desktop) + panel draf.
    <div className="flex min-h-0 flex-1">
    <div className="chat-canvas relative flex min-h-0 min-w-0 flex-1 flex-col">
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
          yang scroll, bukan kontennya yang dipangkas. Gap lebih lega (ritme napas). */}
      <div className="no-scrollbar mx-auto flex w-full max-w-4xl 2xl:max-w-6xl flex-1 flex-col gap-5 overflow-y-auto px-4 pb-8 pt-6 sm:gap-6 sm:px-6 min-[900px]:pt-20 [&>*]:shrink-0">
        {/* HERO INTRO CARD — AI memperkenalkan diri (transparansi §1.3). Tinggi diringkas
            ~35%; keluar (fade+naik) saat percakapan dimulai lalu di-unmount. */}
        {showHero && (
        <section
          className={`relative overflow-hidden rounded-[var(--radius-lg)] border border-border bg-surface p-5 shadow-[var(--shadow-soft)] sm:rounded-[28px] sm:p-6 ${
            heroLeaving ? "hero-leave" : ""
          }`}
        >
          {/* art graphic pojok kanan — dekoratif, bleed ke tepi (disembunyikan di mobile) */}
          <div className="pointer-events-none absolute inset-y-0 right-0 hidden w-64 sm:block" aria-hidden>
            <BirdsMotif className="absolute right-24 top-4 w-20" />
            <GardenCorner className="absolute bottom-0 right-0 w-48" />
          </div>
          <div className="relative flex items-start gap-4 sm:pr-44">
            <LindraCharacter size="lg" className="size-14 shrink-0" />
            <div className="min-w-0">
              <h2 className="text-[1.25rem] font-bold text-ink">hai, aku Lindra —</h2>
              <p className="mt-0.5 font-semibold text-primary-ink">
                aku AI, bukan manusia, dan bukan layanan darurat.
              </p>
              <p className="mt-2 leading-relaxed text-text-soft">{HERO_BODY}</p>
            </div>
          </div>
        </section>
        )}

        {messages.map((m, i) =>
          m.role === "assistant" ? (
            <div key={i} className="flex max-w-[min(88%,44rem)] items-start gap-2.5 self-start bubble-in">
              <LindraCharacter size="sm" />
              <div className="min-w-0">
                <div className="rounded-[1.25rem] rounded-tl-[0.4rem] border border-border/50 bg-surface px-5 py-3.5 leading-relaxed whitespace-pre-wrap break-words text-text shadow-[0_3px_18px_rgba(31,58,52,0.05)]">
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

        {/* W3 — widget bukti dinamis, inline di thread, nempel di bawah pesan AI yang
            menanyakan bukti. Persist sampai resolved (upload/lewati), lalu jadi "selesai". */}
        {evidence.questionAsked && (
          <EvidenceUpload
            resolved={evidence.resolved}
            onResolve={() => send("", false, "resolve-evidence")}
          />
        )}

        {/* Ajakan susun draf — MEMINTA IZIN dulu. Tombol muncul di bawah pesan AI
            (COMPOSE_CONFIRM). Panel baru meluncur saat "Buat draf" ditekan. */}
        {showConsent && (
          <div className="bubble-in flex flex-wrap items-center gap-2.5 pl-[2.625rem]">
            <Button
              variant="outline"
              onClick={() => setConsentDismissed(true)}
              className="min-h-11 rounded-full px-5 font-semibold"
            >
              Belum
            </Button>
            <Button
              onClick={() => {
                setConsentDismissed(true);
                setPanelOpen(true);
              }}
              className="min-h-11 rounded-full px-5 font-semibold"
            >
              <FileText className="size-4" strokeWidth={2} aria-hidden />
              Buat draf
            </Button>
          </div>
        )}

        {/* Draf sudah tersusun tapi panel tertutup → tombol buka lagi (anti kepencet close) */}
        {showReopen && (
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
        {/* Sambungan error (#5) — muncul HANYA saat pengiriman gagal. Teks tenang &
            token netral (BUKAN --danger: hiccup koneksi bukan krisis). Kirim ulang
            pesan tersimpan tanpa siswa mengetik ulang. */}
        {failed && !sending && (
          <div className="bubble-in flex flex-wrap items-center gap-3 rounded-[var(--radius-md)] border border-border bg-surface-alt px-5 py-4 shadow-[var(--shadow-soft)]">
            <p className="flex-1 text-sm text-text-soft">
              Sambungannya lagi bermasalah. Pesanmu tersimpan — coba kirim lagi.
            </p>
            <Button
              variant="outline"
              onClick={() => send(failed.text, failed.panic, failed.control, true)}
              className="min-h-11 rounded-full px-5 font-semibold"
            >
              <RotateCcw className="size-4" strokeWidth={2} aria-hidden />
              Coba lagi
            </Button>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Badge mengambang "Draft diperbarui" — halus, auto-hilang. Tak menutup teks. */}
      {badge && (
        <div className="pointer-events-none absolute inset-x-0 bottom-24 z-20 flex justify-center px-4 sm:bottom-28">
          <span className="bubble-in flex items-center gap-2 rounded-full border border-primary/30 bg-surface px-4 py-2 text-sm font-medium text-primary-ink shadow-[var(--shadow-lift)]">
            <FileText className="size-4" strokeWidth={2} aria-hidden />
            Draf diperbarui
          </span>
        </div>
      )}

      <footer className="border-t border-border/70 bg-surface/85 px-4 py-3 backdrop-blur-sm max-sm:pb-16">
        {/* Presence — Lindra selalu "hadir", tak hilang antar-pesan (§brief PRESENCE) */}
        <div
          className="mx-auto mb-2 flex w-full max-w-4xl 2xl:max-w-6xl items-center gap-2 text-xs text-text-muted"
          aria-live="polite"
        >
          {sending ? (
            <>
              <span className="flex gap-1 motion-reduce:hidden" aria-hidden>
                {[0, 1, 2].map((i) => (
                  <span
                    key={i}
                    className="size-1.5 animate-bounce rounded-full bg-primary-deep/70"
                    style={{ animationDelay: `${i * 150}ms` }}
                  />
                ))}
              </span>
              Lindra sedang memahami ceritamu…
            </>
          ) : idle ? (
            <>
              <span className="presence-dot size-1.5 rounded-full bg-primary-deep/70" aria-hidden />
              Tidak apa-apa kalau ingin berhenti sebentar.
            </>
          ) : (
            <>
              <span className="presence-dot size-1.5 rounded-full bg-primary-deep" aria-hidden />
              Lindra siap mendengarkan.
            </>
          )}
        </div>

        <form
          className="mx-auto flex w-full max-w-4xl 2xl:max-w-6xl items-end gap-2"
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
              className="block max-h-40 min-h-[3.6rem] w-full resize-none rounded-[1.8rem] border border-border bg-surface py-4 pl-5 pr-12 leading-relaxed shadow-[0_2px_10px_rgba(31,58,52,0.05)] outline-none transition-shadow duration-[180ms] placeholder:text-text-muted focus-visible:border-primary/50 focus-visible:shadow-[0_0_0_4px_rgba(109,205,179,0.18),0_4px_18px_rgba(63,168,139,0.16)] focus-visible:ring-0"
            />
            {/* Emoji picker (opsional) — untuk input pengguna, bukan emoji dekoratif UI */}
            <button
              type="button"
              onClick={() => setInput((v) => v + "🙂")}
              aria-label="Tambahkan emoji"
              className="absolute right-2 top-1/2 flex size-10 -translate-y-1/2 items-center justify-center rounded-full text-text-muted transition-colors duration-[180ms] hover:bg-surface-alt hover:text-primary-ink"
            >
              <Smile className="size-5" strokeWidth={2} aria-hidden />
            </button>
          </div>

          <Button
            type="submit"
            size="icon"
            disabled={sending || !input.trim()}
            aria-label="Kirim pesan"
            className="size-[3.6rem] rounded-full bg-gradient-to-br from-[var(--primary)] to-[var(--primary-deep)] text-ink shadow-[0_4px_14px_rgba(63,168,139,0.35)] transition-all duration-[180ms] hover:brightness-105 disabled:from-[var(--primary)] disabled:to-[var(--primary)] disabled:shadow-none"
          >
            <Send className="size-6" strokeWidth={2.25} aria-hidden />
          </Button>
        </form>
        <p className="mx-auto mt-2 w-full max-w-4xl 2xl:max-w-6xl text-center text-xs text-text-muted">
          Bisa berhenti sebentar kapan saja — ceritamu tersimpan di perangkat ini.
        </p>
      </footer>
      </div>

      {/* Panel draf: desktop = menyempil di kanan (chat mengecil), mobile = overlay */}
      {draft && panelOpen && sessionId && (
        <DraftCanvas
          sessionId={sessionId}
          draft={draft}
          onClose={() => {
            setPanelOpen(false);
            setConsentDismissed(true);
          }}
        />
      )}
    </div>
  );
}
