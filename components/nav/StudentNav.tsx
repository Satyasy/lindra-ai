"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Logo } from "@/components/Logo";
import { usePathname } from "next/navigation";
import {
  ChevronRight,
  FileText,
  Heart,
  Home,
  KeyRound,
  LogOut,
  Menu,
  MessageCircle,
  PanelLeftClose,
  Phone,
  Route,
  Send,
  Sparkles,
  Users,
  X,
  type LucideIcon,
} from "lucide-react";
import { LeafSpray } from "@/components/illustrations";
import { ChatUIContext } from "@/components/chat/chat-ui-context";
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

// BrandLogo lokal dihapus — pakai <Logo> terpusat (@/components/Logo, §1.4).

const primaryItem =
  "flex min-h-12 items-center gap-2 rounded-full bg-primary px-4 font-semibold text-ink transition-colors duration-[180ms] hover:bg-primary-deep";
const normalItem =
  "flex min-h-11 w-full items-center gap-2 rounded-[var(--radius-sm)] px-3 text-sm font-medium text-ink transition-all duration-[180ms] hover:bg-surface-alt hover:opacity-100";

// Item menu berbasis data → dipakai bersama oleh nav penuh & rail ikon.
type NavItem = {
  key: string;
  icon: LucideIcon;
  label: string;
  href?: string;
  panel?: "consult" | "doc";
  primary?: boolean;
  disabled?: boolean;
  disabledTitle?: string;
  badge?: number;
};

export function StudentNav({
  children,
  session,
}: {
  children?: React.ReactNode;
  session?: StudentSession;
}) {
  const [open, setOpen] = useState(false); // drawer mobile
  const [collapsed, setCollapsed] = useState(false); // rail ikon (desktop)
  const [started, setStarted] = useState(false);
  const [panel, setPanel] = useState<"consult" | "doc" | null>(null);
  const pathname = usePathname();
  const close = () => setOpen(false);
  const hasSession = !!session;

  // Percakapan dimulai → sidebar mengempis ke rail ikon (fokus percakapan).
  const markStarted = () => {
    setStarted(true);
    setCollapsed(true);
  };

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

  const items: NavItem[] = [
    {
      key: "chat",
      icon: MessageCircle,
      label: hasSession ? "Lanjutkan percakapan" : "Percakapan baru",
      href: "/chat",
      primary: true,
    },
    ...(hasSession && session!.narrative
      ? [{ key: "doc", icon: FileText, label: "Dokumen laporan", panel: "doc" as const }]
      : []),
    ...(hasSession && session!.hasDraft
      ? [{ key: "draft", icon: Send, label: "Tinjau & kirim draf", href: "/draft" }]
      : []),
    { key: "lacak", icon: Route, label: "Lacak status", href: "/lacak" },
    {
      key: "consult",
      icon: Users,
      label: "Chat dengan guru BK",
      panel: "consult",
      disabled: !hasSession,
      disabledTitle: "Tersedia setelah kamu membuat laporan",
      badge: hasSession ? session!.consult.length : 0,
    },
    ...(!hasSession
      ? [{ key: "masuk", icon: KeyRound, label: "Masukkan kode", href: "/masuk" }]
      : []),
    { key: "home", icon: Home, label: "Kembali ke beranda", href: "/" },
  ];

  const isActive = (it: NavItem) =>
    !!it.href && (it.href === "/" ? pathname === "/" : pathname.startsWith(it.href));

  const onItem = (it: NavItem) => {
    if (it.disabled) return;
    if (it.panel) {
      setPanel(it.panel);
      close();
    } else {
      close();
    }
  };

  // Item menu (nav penuh). Non-aktif diredupkan ke 65% opasitas (§brief SIDEBAR).
  function MenuItem({ it }: { it: NavItem }) {
    const active = isActive(it);
    const dim = !it.primary && !active ? "opacity-65" : "opacity-100";
    const inner = (
      <>
        <span className="flex items-center gap-2">
          <it.icon className="size-4" strokeWidth={2} aria-hidden />
          {it.label}
        </span>
        {it.badge ? (
          <span className="flex min-w-5 items-center justify-center rounded-full bg-primary-ink px-1 text-[0.6875rem] font-bold text-white tabular-nums">
            {it.badge}
          </span>
        ) : null}
      </>
    );
    if (it.primary && it.href) {
      return (
        <Link href={it.href} onClick={() => onItem(it)} className={primaryItem}>
          <it.icon className="size-4" strokeWidth={2} aria-hidden />
          {it.label}
        </Link>
      );
    }
    if (it.href) {
      return (
        <Link
          href={it.href}
          onClick={() => onItem(it)}
          aria-current={active ? "page" : undefined}
          className={`${normalItem} justify-between ${dim}`}
        >
          {inner}
        </Link>
      );
    }
    return (
      <button
        type="button"
        disabled={it.disabled}
        title={it.disabled ? it.disabledTitle : undefined}
        onClick={() => onItem(it)}
        className={`${normalItem} justify-between ${dim} disabled:cursor-not-allowed disabled:opacity-45`}
      >
        {inner}
      </button>
    );
  }

  // Tombol ikon (rail sempit). Label jadi tooltip + aria-label.
  function RailItem({ it }: { it: NavItem }) {
    const active = isActive(it);
    const base =
      "relative flex size-11 items-center justify-center rounded-[var(--radius-sm)] transition-colors duration-[180ms]";
    const tone = it.primary
      ? "bg-primary text-ink hover:bg-primary-deep"
      : active
        ? "text-ink opacity-100 hover:bg-surface-alt"
        : "text-ink opacity-65 hover:bg-surface-alt hover:opacity-100";
    const dot = it.badge ? (
      <span className="absolute right-1 top-1 size-2 rounded-full bg-primary-ink" aria-hidden />
    ) : null;
    if (it.href) {
      return (
        <Link
          href={it.href}
          onClick={() => onItem(it)}
          aria-label={it.label}
          title={it.label}
          aria-current={active ? "page" : undefined}
          className={`${base} ${tone}`}
        >
          <it.icon className="size-5" strokeWidth={2} aria-hidden />
          {dot}
        </Link>
      );
    }
    return (
      <button
        type="button"
        disabled={it.disabled}
        title={it.label}
        aria-label={it.label}
        onClick={() => onItem(it)}
        className={`${base} ${tone} disabled:cursor-not-allowed disabled:opacity-40`}
      >
        <it.icon className="size-5" strokeWidth={2} aria-hidden />
        {dot}
      </button>
    );
  }

  // Nav penuh (drawer mobile + desktop saat tidak mengempis).
  const fullNav = (
    <nav className="flex h-full flex-col gap-1 p-4">
      <div className="mb-5 flex items-center justify-between gap-2 px-2 py-1">
        <div className="flex min-w-0 items-center gap-2.5">
          <Logo href="/" wordmark={false} markClassName="h-9" className="shrink-0" />
          <span className="mt-0.5 block text-xs text-text-soft">Teman bicara yang aman</span>
        </div>
        {/* Kempiskan sidebar (desktop) → rail ikon */}
        <button
          type="button"
          onClick={() => setCollapsed(true)}
          aria-label="Kecilkan menu"
          className="hidden size-8 items-center justify-center rounded-full text-text-muted transition-colors hover:bg-surface-alt hover:text-ink min-[900px]:flex"
        >
          <PanelLeftClose className="size-4" aria-hidden />
        </button>
      </div>

      {items.map((it) => (
        <MenuItem key={it.key} it={it} />
      ))}

      {/* Keluar — area terpisah: hapus sesi lokal (perangkat bersama) lalu ke "/" */}
      <button
        type="button"
        onClick={() => {
          close();
          logout();
        }}
        className={`${normalItem} justify-start border-t border-border/60 mt-1 pt-3 opacity-65`}
      >
        <LogOut className="size-4" strokeWidth={2} aria-hidden />
        Keluar
      </button>

      <div className="mt-auto space-y-4 border-t border-border pt-4">
        {/* Tip card — tertutup default (§brief), buka via ringkasan native <details> */}
        <details className="group relative overflow-hidden rounded-[var(--radius-md)] border border-border bg-surface-warm">
          <summary className="flex cursor-pointer list-none items-center gap-1.5 p-3.5">
            <Sparkles className="size-4 text-warm-deep" strokeWidth={2} aria-hidden />
            <p className="text-sm font-semibold text-ink">Tip Hari Ini</p>
            <ChevronRight className="faq-chevron ml-auto size-4 text-text-muted group-open:rotate-90" aria-hidden />
          </summary>
          <div className="px-3.5 pb-3.5">
            <p className="max-w-[10.5rem] text-sm leading-snug text-text-soft">
              Berani mencari bantuan adalah langkah penting. Kamu tidak sendirian.
            </p>
            <Heart className="mt-2.5 size-4 text-primary-deep" strokeWidth={2} aria-hidden />
          </div>
          <LeafSpray className="pointer-events-none absolute -bottom-3 -right-2 w-20 opacity-80" />
        </details>

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

  // Rail ikon (desktop, saat mengempis). Emergency tetap terjangkau di bawah.
  const railNav = (
    <nav className="flex h-full flex-col items-center gap-1.5 py-4">
      <Logo href="/" wordmark={false} markClassName="h-8 w-8" />
      <button
        type="button"
        onClick={() => setCollapsed(false)}
        aria-label="Perbesar menu"
        title="Perbesar menu"
        className="mt-1 flex size-11 items-center justify-center rounded-[var(--radius-sm)] text-text-muted transition-colors hover:bg-surface-alt hover:text-ink"
      >
        <ChevronRight className="size-5" aria-hidden />
      </button>
      <div className="my-1 h-px w-8 bg-border" />
      {items.map((it) => (
        <RailItem key={it.key} it={it} />
      ))}
      <div className="mt-auto flex flex-col items-center gap-1.5 border-t border-border pt-3">
        {DARURAT.map(({ label, tel }) => (
          <a
            key={tel}
            href={`tel:${tel}`}
            aria-label={`Darurat: ${label} ${tel}`}
            title={`${label} ${tel}`}
            className="flex size-11 items-center justify-center rounded-full border border-danger text-danger transition-colors hover:bg-danger-soft"
          >
            <Phone className="size-4" strokeWidth={2} aria-hidden />
          </a>
        ))}
        <button
          type="button"
          onClick={logout}
          aria-label="Keluar"
          title="Keluar"
          className="flex size-11 items-center justify-center rounded-[var(--radius-sm)] text-text-muted transition-colors hover:bg-surface-alt hover:text-ink"
        >
          <LogOut className="size-5" aria-hidden />
        </button>
      </div>
    </nav>
  );

  return (
    <ChatUIContext.Provider value={{ started, markStarted, collapsed, setCollapsed }}>
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
          className={`sidebar-shell fixed inset-y-0 left-0 z-[940] w-[248px] shrink-0 border-r border-border bg-surface shadow-[var(--shadow-lift)] transition-transform duration-200 min-[900px]:static min-[900px]:translate-x-0 min-[900px]:shadow-none ${
            open ? "translate-x-0" : "-translate-x-full"
          } ${collapsed ? "min-[900px]:w-[76px]" : "min-[900px]:w-[248px]"}`}
        >
          <button
            type="button"
            onClick={close}
            aria-label="Tutup menu"
            className="absolute right-3 top-3 flex size-9 items-center justify-center rounded-full text-ink transition-colors hover:bg-surface-alt min-[900px]:hidden"
          >
            <X className="size-5" aria-hidden />
          </button>
          {/* Nav penuh: selalu di mobile; di desktop sembunyi saat mengempis. */}
          <div className={`h-full ${collapsed ? "min-[900px]:hidden" : ""}`}>{fullNav}</div>
          {/* Rail ikon: hanya desktop saat mengempis. */}
          {collapsed && <div className="hidden h-full min-[900px]:block">{railNav}</div>}
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
            <Logo href="/" wordmark={false} markClassName="h-8" className="shrink-0" />
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
    </ChatUIContext.Provider>
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
