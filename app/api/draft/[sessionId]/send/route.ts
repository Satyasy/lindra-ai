import { randomBytes } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { guardSession } from "@/lib/session";
import { sha256 } from "@/lib/hash";
import { encryptIdentity } from "@/lib/identity-crypto";
import { determineRoute } from "@/lib/routing/routing-engine";
import { logAction } from "@/lib/audit/log-action";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  const { sessionId } = await params;
  if (!(await guardSession(sessionId))) {
    return Response.json({ error: "sesi tidak cocok" }, { status: 403 });
  }

  const body = await request.json();
  const mode: "anonymous" | "named" = body.mode === "named" ? "named" : "anonymous";

  const report = await prisma.report.findUnique({ where: { id: sessionId } });
  if (!report) return Response.json({ error: "tidak ditemukan" }, { status: 404 });
  if (report.status !== "draft") {
    return Response.json({ error: "laporan sudah terkirim" }, { status: 409 });
  }

  const contentHash = sha256(report.narrative ?? "");
  const routing = determineRoute(report);

  // Kode referensi untuk siswa memantau status tanpa membuka identitas.
  // Prefix "lin-" (disimpan lowercase — semua lookup /lacak,/masuk,/followup meng-
  // lowercase input, jadi siswa boleh ketik "LIN-.." atau "lin-..").
  const code = "lin-" + randomBytes(4).toString("hex");

  await prisma.$transaction([
    prisma.report.update({
      where: { id: sessionId },
      data: {
        status: "terkirim",
        contentHash,
        urgentVisum: routing.urgentVisum,
        isAnonymous: mode === "anonymous",
        identityData:
          mode === "named" && typeof body.identity === "string" && body.identity.trim()
            ? encryptIdentity(body.identity.trim())
            : null,
      },
    }),
    ...routing.destinations.map((destination) =>
      prisma.routingLog.create({
        data: { reportId: sessionId, destination, hashAtSend: contentHash },
      })
    ),
    prisma.referralCode.create({ data: { reportId: sessionId, code } }),
  ]);
  await logAction(sessionId, "system", "sent", { destinations: routing.destinations, mode });

  return Response.json(
    { referralCode: code, destinations: routing.destinations, urgentVisum: routing.urgentVisum },
    {
      headers: {
        "Cache-Control": "no-store",
        // Sesi selesai — cookie dihapus supaya cerita berikutnya jadi laporan baru
        "Set-Cookie": "lindra_session=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0",
      },
    }
  );
}
