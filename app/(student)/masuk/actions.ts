"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { SESSION_COOKIE, SESSION_MAX_AGE } from "@/lib/session";

export type ResumeState = { error: string } | null;

// Verifikasi kode referensi SERVER-SIDE → set cookie sesi (reportId httpOnly) → /chat.
// TANPA kode/token di URL: cookie httpOnly + redirect polos (tak ada query string).
export async function resumeWithCode(_prev: ResumeState, formData: FormData): Promise<ResumeState> {
  const code = String(formData.get("code") ?? "").trim().toLowerCase();
  if (!code) return { error: "Masukkan kodenya dulu ya." };

  const ref = await prisma.referralCode.findUnique({
    where: { code },
    include: { report: { select: { narrative: true } } },
  });
  if (!ref) return { error: "Kode itu tidak kami temukan. Coba periksa lagi ya — huruf kecil semua." };

  const store = await cookies();
  const secure = process.env.NODE_ENV === "production";

  // Selalu simpan cookie sesi lama (reportId) → chat lama TETAP bisa dibuka lewat dropdown
  // nav, walaupun kita default ke sesi tanya-kabar. (Ganti keputusan §7.2 lama: dua chat
  // kini bisa diakses bersamaan, atas permintaan produk.)
  store.set(SESSION_COOKIE, ref.reportId, { httpOnly: true, sameSite: "strict", path: "/", maxAge: SESSION_MAX_AGE, secure });

  // Siswa lama yang laporannya sudah punya narasi (kasus nyata) → default ke sesi tanya-kabar
  // (KABAR → CEK_KASUS). Intake yang belum kelar (belum ada narasi) → langsung lanjut /chat.
  if (ref.report?.narrative) {
    // Satu Followup per report (samakan pola dgn /api/followup/enable). proactiveEnabled
    // (consent EMAIL) TIDAK disentuh di sini — email tetap opt-in terpisah di /lacak.
    let followup = await prisma.followup.findFirst({ where: { reportId: ref.reportId } });
    if (!followup) {
      followup = await prisma.followup.create({
        data: { reportId: ref.reportId, scheduledAt: new Date(), state: "kabar" },
      });
    }
    store.set("lindra_followup", followup.id, {
      httpOnly: true,
      sameSite: "strict",
      path: "/",
      secure,
      maxAge: 1800,
    });
    redirect("/followup"); // throw NEXT_REDIRECT — jangan bungkus try/catch
  }

  redirect("/chat"); // throw NEXT_REDIRECT — jangan bungkus try/catch
}
