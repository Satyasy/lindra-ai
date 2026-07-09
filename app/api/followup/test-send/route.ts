import { prisma } from "@/lib/prisma";
import { decryptFromBase64 } from "@/lib/identity-crypto";
import { sendFollowupEmail } from "@/lib/email";

// DEMO/DEV ONLY — tombol "Kirim tes sekarang" di /lacak. Cron Vercel tak jalan di
// `next dev`, jadi ini memicu email follow-up LANGSUNG (bypass scheduledAt) supaya
// leg Resend bisa diuji tanpa deploy. Digerbang NEXT_PUBLIC_DEMO_MODE di server →
// 404 saat flag mati, jadi tak pernah aktif di produksi. Error Resend dipantulkan
// apa adanya (mis. domain belum verified) supaya jadi diagnostik, bukan 500 buram.
export async function POST(request: Request) {
  if (process.env.NEXT_PUBLIC_DEMO_MODE !== "true") {
    return new Response("not found", { status: 404 });
  }

  const { code } = await request.json().catch(() => ({}));
  if (typeof code !== "string" || !code.trim()) {
    return Response.json({ error: "input tidak valid" }, { status: 400 });
  }

  const ref = await prisma.referralCode.findUnique({ where: { code: code.trim().toLowerCase() } });
  if (!ref) return Response.json({ error: "kode tidak ditemukan" }, { status: 404 });

  const f = await prisma.followup.findFirst({ where: { reportId: ref.reportId } });
  if (!f?.contactEmail) {
    return Response.json({ error: "follow-up belum aktif / email belum tersimpan" }, { status: 400 });
  }

  try {
    const result = await sendFollowupEmail(decryptFromBase64(f.contactEmail)); // dekripsi in-memory
    return Response.json(result, { headers: { "Cache-Control": "no-store" } });
  } catch (e) {
    return Response.json({ error: (e as Error).message }, { status: 502 });
  }
}
