"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  FileText,
  Heart,
  Home,
  KeyRound,
  LogOut,
  Menu,
  MessageCircle,
  Phone,
  Route,
  Send,
  Sparkles,
  Users,
  X,
} from "lucide-react";
import { LeafSpray } from "@/components/illustrations";
import { sendStudentConsult } from "@/app/(student)/chat/actions";
import { GURU_BK_TEL, SAPA_TEL } from "@/lib/emergency-contacts";

// Data sesi siswa yang aktif (dibaca dari cookie di app/(student)/chat/page.tsx).
export type StudentSession = {
  code: string | null;
  status: string;
  hasDraft: boolean;
  narrative: string | null;
  consult: { id: string; sender: string; content: string; timeLabel: string }[];
} | null;

// Sisi siswa: HANYA 2 jalur darurat — Guru BK (dummy) + SAPA 129. Polisi/Ambulans dihapus.
const DARURAT = [
  { label: "Guru BK", tel: GURU_BK_TEL },
  { label: "SAPA", tel: SAPA_TEL },
];

// Logo Lindra dapat diklik → "/". object-contain + max-w-full agar tak melebihi sidebar.
function BrandLogo({ className = "h-9" }: { className?: string }) {
  return (
    <Link href="/" aria-label="Lindra — ke beranda" className="inline-flex shrink-0">
      <Image
        src="/lindra-logo.png"
        alt="Lindra"
        width={2000}
        height={2000}
        priority
        className={`${className} w-auto max-w-full object-contain`}
      />
    </Link>
  );
}

const primaryItem =
  "flex min-h-12 items-center gap-2 rounded-full bg-primary px-4 font-semibold text-ink transition-colors hover:bg-primary-deep";
const normalItem =
  "flex min-h-11 items-center gap-2 rounded-[var(--radius-sm)] px-3 text-sm font-medium text-ink transition-colors hover:bg-surface-alt";

export function StudentNav({
  children,
  session,
}: {
  children?: React.ReactNode;
  session?: StudentSession;
}) {
  const [open, setOpen] = useState(false);
  const [panel, setPanel] = useState<"consult" | "doc" | null>(null);
  const close = () => setOpen(false);
  const hasSession = !!session;

  // Keluar = hapus sesi lokal siswa (cookie + state) lalu ke "/". Privasi perangkat
  // bersama, bukan akun. Full-nav sengaja: mereset state klien & baca cookie terhapus.
  async function logout() {
    try {
      await fetch("/api/session", { method: "DELETE" });
    } catch {
      /* tetap keluar walau gagal */
    }
    window.location.assign("/");
  }

  const nav = (
    <nav className="flex h-full flex-col gap-1 p-4">
      <div className="mb-5 flex items-center gap-2.5 px-2 py-1">
        <BrandLogo className="h-9" />
        <span className="min-w-0">
          <span className="mt-0.5 block text-xs text-text-soft">Teman bicara yang aman</span>
        </span>
      </div>

      {/* Lanjut / mulai percakapan */}
      <Link href="/chat" onClick={close} className={primaryItem}>
        <MessageCircle className="size-4" strokeWidth={2} aria-hidden />
        {hasSession ? "Lanjutkan percakapan" : "Percakapan baru"}
      </Link>

      {/* Dokumen laporan — read-only narasi (bila sudah tersusun) */}
      {hasSession && session!.narrative && (
        <button
          type="button"
          onClick={() => {
            setPanel("doc");
            close();
          }}
          className={normalItem}
        >
          <FileText className="size-4" strokeWidth={2} aria-hidden />
          Dokumen laporan
        </button>
      )}

      {/* Tinjau & kirim draf (bila masih draf) */}
      {hasSession && session!.hasDraft && (
        <Link href="/draft" onClick={close} className={normalItem}>
          <Send className="size-4" strokeWidth={2} aria-hidden />
          Tinjau &amp; kirim draf
        </Link>
      )}

      {/* Tracking penanganan */}
      <Link href="/lacak" onClick={close} className={normalItem}>
        <Route className="size-4" strokeWidth={2} aria-hidden />
        Lacak status
      </Link>

      {/* Chat dengan guru BK — kosong/disabled bila belum ada sesi */}
      <button
        type="button"
        disabled={!hasSession}
        title={hasSession ? undefined : "Tersedia setelah kamu membuat laporan"}
        onClick={() => {
          if (!hasSession) return;
          setPanel("consult");
          close();
        }}
        className={`${normalItem} justify-between disabled:cursor-not-allowed disabled:opacity-45`}
      >
        <span className="flex items-center gap-2">
          <Users className="size-4" strokeWidth={2} aria-hidden />
          Chat dengan guru BK
        </span>
        {hasSession && session!.consult.length > 0 && (
          <span className="flex min-w-5 items-center justify-center rounded-full bg-primary-ink px-1 text-[0.6875rem] font-bold text-white tabular-nums">
            {session!.consult.length}
          </span>
        )}
      </button>

      {/* Pengguna tanpa sesi bisa masuk pakai kode */}
      {!hasSession && (
        <Link href="/masuk" onClick={close} className={normalItem}>
          <KeyRound className="size-4" strokeWidth={2} aria-hidden />
          Masukkan kode
        </Link>
      )}

      <Link href="/" onClick={close} className={normalItem}>
        <Home className="size-4" strokeWidth={2} aria-hidden />
        Kembali ke beranda
      </Link>

      {/* Keluar — area terpisah: hapus sesi lokal (perangkat bersama) lalu ke "/" */}
      <button
        type="button"
        onClick={() => {
          close();
          logout();
        }}
        className={`${normalItem} border-t border-border/60 mt-1 pt-3`}
      >
        <LogOut className="size-4" strokeWidth={2} aria-hidden />
        Keluar
      </button>

      <div className="mt-auto space-y-4 border-t border-border pt-4">
        <div className="relative overflow-hidden rounded-[var(--radius-md)] border border-border bg-surface-warm p-3.5">
          <div className="flex items-center gap-1.5">
            <Sparkles className="size-4 text-warm-deep" strokeWidth={2} aria-hidden />
            <p className="text-sm font-semibold text-ink">Tip Hari Ini</p>
          </div>
          <p className="mt-1.5 max-w-[10.5rem] text-sm leading-snug text-text-soft">
            Berani mencari bantuan adalah langkah penting. Kamu tidak sendirian.
          </p>
          <Heart className="mt-2.5 size-4 text-primary-deep" strokeWidth={2} aria-hidden />
          <LeafSpray className="pointer-events-none absolute -bottom-3 -right-2 w-20 opacity-80" />
        </div>

        <p className="px-2 text-sm leading-relaxed text-text-soft">
          Kamu pegang kendali — bisa berhenti kapan saja.
        </p>

        <div className="px-2">
          <p className="mb-2 text-xs font-semibold tracking-wide text-text-soft">DARURAT</p>
          <div className="flex flex-wrap gap-2">
            {DARURAT.map(({ label, tel }) => (
              <a
                key={tel}
                href={`tel:${tel}`}
                className="flex min-h-11 items-center gap-1.5 rounded-full border border-danger px-3.5 text-sm font-semibold text-danger transition-colors hover:bg-danger-soft"
              >
                <Phone className="size-3.5" strokeWidth={2} aria-hidden />
                {label} {tel}
              </a>
            ))}
          </div>
        </div>
      </div>
    </nav>
  );

  return (
    <div className="flex h-dvh flex-col overflow-hidden min-[900px]:flex-row">
      {open && (
        <button
          type="button"
          aria-label="Tutup menu"
          onClick={close}
          className="fixed inset-0 z-[930] bg-ink/40 min-[900px]:hidden"
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-[940] w-[248px] shrink-0 border-r border-border bg-surface shadow-[var(--shadow-lift)] transition-transform duration-200 min-[900px]:static min-[900px]:translate-x-0 min-[900px]:shadow-none ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <button
          type="button"
          onClick={close}
          aria-label="Tutup menu"
          className="absolute right-3 top-3 flex size-9 items-center justify-center rounded-full text-ink transition-colors hover:bg-surface-alt min-[900px]:hidden"
        >
          <X className="size-5" aria-hidden />
        </button>
        {nav}
      </aside>

      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <header className="flex items-center gap-2 border-b border-border bg-surface px-4 py-3 min-[900px]:hidden">
          <button
            type="button"
            onClick={() => setOpen(true)}
            aria-label="Buka menu"
            aria-expanded={open}
            className="flex size-11 items-center justify-center rounded-full text-ink transition-colors hover:bg-surface-alt"
          >
            <Menu className="size-6" aria-hidden />
          </button>
          <BrandLogo className="h-8" />
        </header>

        <main className="flex min-h-0 flex-1 flex-col">{children}</main>
      </div>

      {panel === "consult" && session && (
        <ConsultPanel session={session} onClose={() => setPanel(null)} />
      )}
      {panel === "doc" && session?.narrative && (
        <DocPanel narrative={session.narrative} code={session.code} onClose={() => setPanel(null)} />
      )}
    </div>
  );
}

function ConsultPanel({
  session,
  onClose,
}: {
  session: NonNullable<StudentSession>;
  onClose: () => void;
}) {
  const [pending, start] = useTransition();
  const [text, setText] = useState("");

  return (
    <div
      className="fixed inset-0 z-[970] flex justify-end"
      role="dialog"
      aria-modal="true"
      aria-label="Chat dengan guru BK"
    >
      <button type="button" aria-label="Tutup panel" onClick={onClose} className="absolute inset-0 bg-ink/40" />
      <aside className="relative flex h-full w-full max-w-md flex-col bg-surface shadow-[var(--shadow-lift)]">
        <header className="flex items-center justify-between border-b border-border px-5 py-4">
          <div>
            <p className="text-sm font-semibold text-ink">Chat dengan guru BK</p>
            <p className="text-xs text-text-soft">Pendampingan — bukan layanan darurat.</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup panel"
            className="flex size-11 items-center justify-center rounded-full text-ink transition-colors hover:bg-surface-alt"
          >
            <X className="size-5" aria-hidden />
          </button>
        </header>

        <div className="flex flex-1 flex-col gap-3 overflow-y-auto px-5 py-4">
          {session.consult.length === 0 ? (
            <div className="m-auto max-w-[16rem] text-center text-sm text-text-soft">
              Belum ada percakapan dengan guru BK. Kamu bisa mulai menyapa di sini — guru akan
              membalas saat meninjau laporanmu.
            </div>
          ) : (
            session.consult.map((m) => (
              <div
                key={m.id}
                className={`flex max-w-[80%] flex-col ${
                  m.sender === "student" ? "items-end self-end" : "items-start self-start"
                }`}
              >
                <div
                  className={`rounded-[var(--radius-md)] px-4 py-2.5 text-sm leading-relaxed ${
                    m.sender === "student"
                      ? "bg-primary text-ink"
                      : "border border-border bg-surface-alt text-text"
                  }`}
                >
                  {m.content}
                </div>
                <span className="mt-1 block px-1 text-[0.6875rem] text-text-muted">
                  {m.sender === "student" ? "Kamu" : "Guru BK"} · {m.timeLabel}
                </span>
              </div>
            ))
          )}
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!text.trim()) return;
            const body = text;
            start(async () => {
              await sendStudentConsult(body);
              setText("");
            });
          }}
          className="flex items-end gap-2 border-t border-border p-4"
        >
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Tulis pesan untuk guru BK…"
            aria-label="Pesan untuk guru BK"
            className="min-h-11 flex-1 rounded-full border border-border bg-surface px-4 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
          <button
            type="submit"
            disabled={pending || !text.trim()}
            aria-label="Kirim pesan"
            className="flex size-11 shrink-0 items-center justify-center rounded-full bg-primary text-ink transition-colors hover:bg-primary-deep disabled:opacity-50"
          >
            <Send className="size-5" aria-hidden />
          </button>
        </form>
      </aside>
    </div>
  );
}

function DocPanel({
  narrative,
  code,
  onClose,
}: {
  narrative: string;
  code: string | null;
  onClose: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-[970] flex justify-end"
      role="dialog"
      aria-modal="true"
      aria-label="Dokumen laporan"
    >
      <button type="button" aria-label="Tutup panel" onClick={onClose} className="absolute inset-0 bg-ink/40" />
      <aside className="relative flex h-full w-full max-w-md flex-col bg-surface shadow-[var(--shadow-lift)]">
        <header className="flex items-center justify-between border-b border-border px-5 py-4">
          <div>
            <p className="text-sm font-semibold text-ink">Dokumen laporan</p>
            {code && <p className="font-mono text-xs text-text-soft">Kode: {code}</p>}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup panel"
            className="flex size-11 items-center justify-center rounded-full text-ink transition-colors hover:bg-surface-alt"
          >
            <X className="size-5" aria-hidden />
          </button>
        </header>
        <div className="flex-1 overflow-y-auto px-5 py-4">
          <p className="whitespace-pre-wrap leading-[1.7] text-text">{narrative}</p>
        </div>
      </aside>
    </div>
  );
}
