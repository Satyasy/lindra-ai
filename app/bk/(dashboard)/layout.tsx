import { redirect } from "next/navigation";
import { auth, signOut, staffRole } from "@/lib/auth";
import { Inbox, LogOut } from "lucide-react";

// Shell Portal BK (DESIGN.md §6) — sidebar gelap --ink, satu shell untuk
// kedua role, dibedakan aksen brand stack. Tanpa QuickExit (bukan halaman siswa).
export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session) redirect("/bk/login");
  const role = staffRole(session);

  return (
    <div className="flex min-h-dvh bg-background">
      <aside className="fixed inset-y-0 left-0 z-40 flex w-60 flex-col bg-ink px-5 py-6 text-white max-md:hidden">
        {/* Brand stack: nama + label peran beraksen */}
        <div className="mb-8">
          <p className="text-[1.7rem] font-extrabold tracking-tight">Lindra</p>
          <p
            className={`text-[0.8125rem] font-semibold uppercase tracking-widest ${
              role === "satgas" ? "text-[#F0B892]" : "text-[#8FD3C9]"
            }`}
          >
            {role === "satgas" ? "Satgas" : "BK Sekolah"}
          </p>
        </div>

        <div className="mb-6 border-b border-white/10 pb-4 text-sm text-white/70">
          {session.user?.name}
        </div>

        <nav className="flex-1">
          <span className="flex items-center gap-2.5 rounded-[var(--radius-sm)] bg-white/10 px-3 py-2.5 text-sm font-medium">
            <Inbox className="size-4" strokeWidth={2} aria-hidden />
            Antrean Laporan
          </span>
        </nav>

        <form
          action={async () => {
            "use server";
            await signOut({ redirectTo: "/bk/login" });
          }}
        >
          <button
            type="submit"
            className="flex min-h-11 w-full items-center gap-2.5 rounded-[var(--radius-sm)] px-3 text-sm text-white/70 hover:bg-white/10 hover:text-white"
          >
            <LogOut className="size-4" strokeWidth={2} aria-hidden />
            Keluar
          </button>
        </form>
      </aside>

      {/* Header ringkas untuk mobile (Portal BK desktop-first) */}
      <div className="fixed inset-x-0 top-0 z-40 flex items-center justify-between bg-ink px-4 py-3 text-white md:hidden">
        <p className="font-extrabold">Lindra</p>
        <form
          action={async () => {
            "use server";
            await signOut({ redirectTo: "/bk/login" });
          }}
        >
          <button type="submit" className="flex items-center gap-2 text-sm text-white/80">
            <LogOut className="size-4" aria-hidden />
            Keluar
          </button>
        </form>
      </div>

      <main className="min-w-0 flex-1 px-6 py-8 md:ml-60 max-md:pt-16">{children}</main>
    </div>
  );
}
