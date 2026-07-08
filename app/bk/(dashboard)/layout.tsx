import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { auth, signOut, staffRole } from "@/lib/auth";
import { BKShell } from "@/components/bk/BKShell";

// Layout Portal BK (DESIGN.md §6) — TETAP server component untuk auth. Bagian shell
// interaktif (sidebar collapsible + main) di components/bk/BKShell.tsx. Cookie
// "bk-sidebar-collapsed" dibaca di sini → initialCollapsed (hindari flash saat reload).
export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session) redirect("/bk/login");
  const isSatgas = staffRole(session) === "satgas";
  const roleLabel = isSatgas ? "Satgas" : "BK Sekolah";

  const store = await cookies();
  const initialCollapsed = store.get("bk-sidebar-collapsed")?.value === "1";

  const signOutAction = async () => {
    "use server";
    await signOut({ redirectTo: "/bk/login" });
  };

  return (
    <BKShell
      userName={session.user?.name ?? ""}
      roleLabel={roleLabel}
      isSatgas={isSatgas}
      signOutAction={signOutAction}
      initialCollapsed={initialCollapsed}
    >
      {children}
    </BKShell>
  );
}
