"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const res = await signIn("credentials", { email, password, redirect: false });
    setLoading(false);
    if (res?.error) {
      setError("Email atau kata sandi salah.");
    } else {
      router.push("/bk");
      router.refresh();
    }
  }

  return (
    <div className="flex min-h-dvh items-center justify-center bg-background px-4 py-10">
      <div className="w-full max-w-sm">
        {/* Brand — "Lindra" boleh tampil penuh di Portal BK (DESIGN.md §1.4/§3.5) */}
        <div className="mb-7 flex flex-col items-center gap-3 text-center">
          <Logo href={null} markClassName="h-14" />
          <p className="text-[0.75rem] font-semibold uppercase tracking-[0.18em] text-primary-ink">
            Portal BK
          </p>
        </div>

        <div className="rounded-[var(--radius-lg)] border bg-surface p-6 shadow-[var(--shadow-soft)] sm:p-7">
          <form onSubmit={submit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="h-12"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Kata sandi</Label>
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="h-12"
              />
            </div>
            {error && (
              <p role="alert" className="text-sm text-danger">
                {error}
              </p>
            )}
            <Button
              type="submit"
              disabled={loading}
              className="h-12 w-full rounded-full text-base font-semibold"
            >
              {loading ? "Masuk…" : "Masuk"}
            </Button>
          </form>
        </div>

        <p className="mt-5 text-center text-[0.8125rem] text-muted-foreground">
          Hanya untuk staf BK &amp; Satgas sekolah.
        </p>
      </div>
    </div>
  );
}
