"use client";

import { useState, useTransition } from "react";
import { Unlock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { revealIdentity } from "@/app/bk/(dashboard)/[reportId]/actions";

export function IdentityReveal({ reportId }: { reportId: string }) {
  const [identity, setIdentity] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  if (identity) return <p className="font-medium">{identity}</p>;

  return (
    <div>
      <Button
        variant="outline"
        disabled={pending}
        onClick={() => startTransition(async () => setIdentity(await revealIdentity(reportId)))}
        className="min-h-11 rounded-full font-semibold"
      >
        <Unlock className="size-4" strokeWidth={2} aria-hidden />
        {pending ? "Membuka…" : "Buka identitas"}
      </Button>
      <p className="mt-2 text-[0.8125rem] text-muted-foreground">
        Pembukaan identitas tercatat di jejak audit.
      </p>
    </div>
  );
}
