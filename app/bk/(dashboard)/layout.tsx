import { redirect } from "next/navigation";
import { auth, signOut, staffRole } from "@/lib/auth";
import { Inbox, LogOut, User } from "lucide-react";

// Shell Portal BK (DESIGN.md §6) — sidebar gelap --ink, satu shell untuk
// kedua role, dibedakan aksen brand stack (--role-accent). Tanpa QuickExit
// /EmergencyBar (bukan halaman siswa) — disengaja.
export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session) redirect("/bk/login");
  const role = staffRole(session);
  const isSatgas = role === "satgas";
  const roleLabel = isSatgas ? "Satgas" : "BK Sekolah";

  // Satu sumber warna aksen role dari token (bukan hex hardcode) — dipakai
  // brand sublabel, avatar, dan indikator nav aktif di bawah.
  const accentVar = {
    "--role-accent": isSatgas ? "var(--role-satgas)" : "var(--role-bk)",
  } as React.CSSProperties;

  const signOutAction = async () => {
    "use server";
    await signOut({ redirectTo: "/bk/login" });
  };

  return (
    <div className="flex min-h-dvh bg-background">
      <aside
        style={accentVar}
        className="fixed inset-y-0 left-0 z-40 flex w-60 flex-col bg-ink px-5 py-6 text-white max-md:hidden"
      >
        {/* Brand stack: nama + label peran beraksen (DESIGN.md §3.5) */}
        <div className="mb-7">
          <p className="text-[1.7rem] font-extrabold leading-none tracking-tight">Lindra</p>
          <p className="mt-1.5 text-[0.75rem] font-semibold uppercase tracking-[0.18em] text-[color:var(--role-accent)]">
            {roleLabel}
          </p>
        </div>

        {/* Profil staf — avatar + nama + peran */}
        <div className="mb-7 flex items-center gap-3 border-y border-white/10 py-4">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-white/10">
            <User className="size-4.5 text-[color:var(--role-accent)]" strokeWidth={2} aria-hidden />
          </span>
          <span className="min-w-0">
            <span className="block truncate text-sm font-medium text-white">
              {session.user?.name}
            </span>
            <span className="block text-[0.75rem] text-white/55">{roleLabel}</span>
          </span>
        </div>

        <nav className="flex-1">
          <span className="relative flex items-center gap-2.5 rounded-[var(--radius-sm)] bg-white/10 px-3 py-2.5 text-sm font-medium">
            <span
              className="absolute inset-y-1.5 left-0 w-[3px] rounded-full bg-[var(--role-accent)]"
              aria-hidden
            />
            <Inbox className="size-4 text-[color:var(--role-accent)]" strokeWidth={2} aria-hidden />
            Antrean Laporan
          </span>
        </nav>

        <form action={signOutAction}>
          <button
            type="submit"
            className="flex min-h-11 w-full items-center gap-2.5 rounded-[var(--radius-sm)] px-3 text-sm text-white/65 transition-colors hover:bg-white/10 hover:text-white"
          >
            <LogOut className="size-4" strokeWidth={2} aria-hidden />
            Keluar
          </button>
        </form>
      </aside>

      {/* Header ringkas untuk mobile (Portal BK desktop-first) */}
      <div
        style={accentVar}
        className="fixed inset-x-0 top-0 z-40 flex items-center justify-between bg-ink px-4 py-3 text-white md:hidden"
      >
        <p className="font-extrabold">
          Lindra{" "}
          <span className="text-[0.7rem] font-semibold uppercase tracking-widest text-[color:var(--role-accent)]">
            {roleLabel}
          </span>
        </p>
        <form action={signOutAction}>
          <button type="submit" className="flex min-h-11 items-center gap-2 text-sm text-white/80">
            <LogOut className="size-4" aria-hidden />
            Keluar
          </button>
        </form>
      </div>

      <main className="min-w-0 flex-1 px-6 py-8 md:ml-60 max-md:pt-16">{children}</main>
    </div>
  );
}
