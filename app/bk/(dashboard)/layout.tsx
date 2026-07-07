import { redirect } from "next/navigation";
import { auth, signOut } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { LogOut, ShieldCheck } from "lucide-react";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session) redirect("/bk/login");

  return (
    <div className="min-h-dvh bg-background">
      <header className="border-b bg-card">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2">
            <ShieldCheck className="size-5 text-primary" aria-hidden />
            <span className="font-semibold">Portal BK — Lindra</span>
          </div>
          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            <span>{session.user?.name}</span>
            <form
              action={async () => {
                "use server";
                await signOut({ redirectTo: "/bk/login" });
              }}
            >
              <Button variant="ghost" size="sm" type="submit">
                <LogOut className="size-4" aria-hidden />
                Keluar
              </Button>
            </form>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-6">{children}</main>
    </div>
  );
}
