"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { SESSION_COOKIE } from "@/lib/session";

export type ResumeState = { error: string } | null;

// Verifikasi kode referensi SERVER-SIDE → set cookie sesi (reportId httpOnly) → /chat.
// TANPA kode/token di URL: cookie httpOnly + redirect polos (tak ada query string).
export async function resumeWithCode(_prev: ResumeState, formData: FormData): Promise<ResumeState> {
  const code = String(formData.get("code") ?? "").trim().toLowerCase();
  if (!code) return { error: "Masukkan kodenya dulu ya." };

  const ref = await prisma.referralCode.findUnique({ where: { code } });
  if (!ref) return { error: "Kode itu tidak kami temukan. Coba periksa lagi ya — huruf kecil semua." };

  const store = await cookies();

  // Kasus dengan follow-up proaktif aktif → arahkan ke sesi follow-up terstruktur
  // (KABAR → CEK_KASUS), bukan resume intake. Set cookie follow-up (followupId); SENGAJA
  // tidak set lindra_session → tombol "cerita lagi" nanti memulai intake BARU (bukan
  // menyambung sesi ini), sesuai batas scope §7.2.
  const followup = await prisma.followup.findFirst({
    where: { reportId: ref.reportId, proactiveEnabled: true },
  });
  if (followup) {
    store.set("lindra_followup", followup.id, {
      httpOnly: true,
      sameSite: "strict",
      path: "/",
      secure: process.env.NODE_ENV === "production",
      maxAge: 1800,
    });
    redirect("/followup"); // throw NEXT_REDIRECT — jangan bungkus try/catch
  }

  store.set(SESSION_COOKIE, ref.reportId, {
    httpOnly: true,
    sameSite: "strict",
    path: "/",
    secure: process.env.NODE_ENV === "production",
  });
  redirect("/chat"); // throw NEXT_REDIRECT — jangan bungkus try/catch
}
