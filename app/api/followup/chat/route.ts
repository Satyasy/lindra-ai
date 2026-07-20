import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { detectCrisisSignal, CRISIS_RESPONSE } from "@/lib/ai/crisis-check";
import {
  followupSystemPrompt,
  cekKasusQuestion,
} from "@/lib/ai/prompts/followup-context-injection";
import { sse, buildMessages, streamChat } from "@/lib/ai/stream-chat";
import { logAction } from "@/lib/audit/log-action";
import { SAPA129_THRESHOLD } from "@/lib/config";
import { FOLLOWUP_OPENER } from "@/lib/followup-copy";

// Sesi follow-up KABAR → CEK_KASUS (SSE).
// - AI (Lapis 2) HANYA mengisi konten balasan di state KABAR; SEMUA transisi state
//   deterministik (business logic auditable), bukan AI.
// - Tier 1 (regex, sinkron, tanpa LLM) membungkus SETIAP input user — persis intake.
// - Rangkuman kasus = report.narrative (di-inject via followupSystemPrompt), sudah persist
//   & immutable selama sesi → tak perlu kolom snapshot terpisah (audit bisa rujuk narasi).
// - ponytail: chat follow-up TIDAK dipersist ke Report.rawTranscript (sesi 1–2 giliran,
//   bukan intake) → tak ada polusi riwayat & tak ada risiko few-shot bocor.

// Tawaran SAPA 129 (dipicu KEMANDEKAN ADMIN, bukan desakan user) — transparan, tak menyalahkan.
const SAPA129_OFFER_TEXT =
  "Laporanmu sudah dinaikkan ke petugas, tapi sampai sekarang belum ada tindak lanjut dari " +
  "mereka. Ini bukan salahmu. Kalau kamu mau, kamu juga bisa menghubungi SAPA 129 — layanan " +
  "nasional, gratis, 24 jam (telepon 129 atau WhatsApp 08111-129-129). Kamu yang memutuskan; " +
  "aku tidak mengirim apa pun tanpa kamu.";

export async function POST(request: Request) {
  const cookieStore = await cookies();
  const followupId = cookieStore.get("lindra_followup")?.value;
  if (!followupId) return Response.json({ error: "sesi tidak ada" }, { status: 401 });

  const { message, init } = await request.json().catch(() => ({}));
  const isInit = init === true;
  if (!isInit && (typeof message !== "string" || !message.trim())) {
    return Response.json({ error: "message wajib diisi" }, { status: 400 });
  }

  const followup = await prisma.followup.findUnique({
    where: { id: followupId },
    include: { report: { include: { auditLogs: { where: { action: "opened" }, take: 1 } } } },
  });
  if (!followup) return Response.json({ error: "tidak ditemukan" }, { status: 404 });
  const report = followup.report;

  // Tier 1 SEBELUM apa pun (kecuali init yang tak membawa pesan). Krisis → override total.
  const crisis = !isInit
    ? detectCrisisSignal(message)
    : { isCrisis: false as const, matchedCategory: undefined };

  const stream = new ReadableStream({
    async start(controller) {
      // ── INIT: buka sesi baru dari KABAR (opener statik, non-leading). Kalau kasus ter-flag
      //    tapi admin tetap diam melewati ambang → tawarkan SAPA 129 (dihitung dari counter,
      //    bukan state yang ditulis cron → tak ada race dgn sesi berjalan).
      if (isInit) {
        const opened = report.auditLogs.length > 0;
        const offerSapa =
          followup.followUpFlaggedAt != null &&
          !opened &&
          followup.noProgressCount >= SAPA129_THRESHOLD;

        // Sesi baru → mulai KABAR. followUpFlaggedAt & noProgressCount TIDAK di-reset
        // (sinyal persist untuk antrean BK & deteksi kemandekan).
        await prisma.followup.update({ where: { id: followupId }, data: { state: "kabar" } });
        await logAction(report.id, "student", "followup-session-started");

        if (offerSapa) {
          controller.enqueue(sse({ type: "sapa129" }));
          controller.enqueue(sse({ type: "text", delta: SAPA129_OFFER_TEXT }));
          await logAction(report.id, "student", "followup-sapa129-offered", {
            noProgressCount: followup.noProgressCount,
          });
        } else {
          controller.enqueue(sse({ type: "text", delta: FOLLOWUP_OPENER }));
        }
        controller.enqueue(sse({ type: "done" }));
        controller.close();
        return;
      }

      // ── Tier 1: krisis → protokol darurat, hentikan alur kabar/kasus.
      if (crisis.isCrisis) {
        await prisma.followup.update({
          where: { id: followupId },
          data: { state: "crisis_override" },
        });
        await prisma.report.update({ where: { id: report.id }, data: { urgencyLevel: "kritis" } });
        await logAction(report.id, "student", "followup-crisis-override", {
          category: crisis.matchedCategory,
        });
        controller.enqueue(sse({ type: "crisis", category: crisis.matchedCategory }));
        controller.enqueue(sse({ type: "text", delta: CRISIS_RESPONSE }));
        controller.enqueue(sse({ type: "done" }));
        controller.close();
        return;
      }

      // ── KABAR: AI membalas jawaban kabar (non-leading, tak dipersist). Lalu TRANSISI
      //    deterministik → CEK_KASUS (pertanyaan template + tombol Iya/Tidak dari klien).
      await streamChat(
        controller,
        buildMessages(followupSystemPrompt(report.narrative), [
          { role: "user", content: message, ts: new Date().toISOString() },
        ])
      );
      const cek = cekKasusQuestion(report.violenceType);
      await prisma.followup.update({ where: { id: followupId }, data: { state: "cek_kasus" } });
      controller.enqueue(sse({ type: "cek_kasus", question: cek.question, category: cek.category }));
      controller.enqueue(sse({ type: "done" }));
      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-store",
      Connection: "keep-alive",
      // nginx (EC2) mem-buffer respons secara default → SSE muncul sekaligus di akhir
      "X-Accel-Buffering": "no",
    },
  });
}
