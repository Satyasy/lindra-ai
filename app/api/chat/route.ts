import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { detectCrisisSignal, CRISIS_RESPONSE } from "@/lib/ai/crisis-check";
import { detectMetaProbe, META_PROBE_RESPONSE } from "@/lib/ai/meta-probe";
import { SYSTEM_PROMPT } from "@/lib/ai/system-prompt";
import { followupSystemPrompt } from "@/lib/ai/prompts/followup-context-injection";
import {
  composeReport,
  updateSlots,
  advanceSlots,
  emptySlots,
  toStructuredDraft,
  isReadyForDraftOffer,
  SLOT_DIRECTIVE,
  type Slots,
} from "@/lib/ai/classify-narrative";
import { sse, buildMessages, streamChat } from "@/lib/ai/stream-chat";
import { logAction } from "@/lib/audit/log-action";
import { readTranscript, sealTranscript } from "@/lib/transcript";

import { SESSION_MAX_AGE } from "@/lib/session";

const SESSION_COOKIE = "lindra_session";

// Ajakan menyusun draf — MEMINTA IZIN dulu (bukan mengumumkan draf sudah muncul).
// Panel TIDAK terbuka otomatis; klien menampilkan tombol [Belum]/[Buat Draf] di
// bawah pesan ini, dan panel baru meluncur saat siswa menekan "Buat Draf".
const COMPOSE_CONFIRM =
  "makasih ya udah berani cerita sejauh ini — aku dengerin semua dan aku percaya kamu. kalau kamu udah siap aku bisa bantu rapihin ceritamu jadi draf buat BK, tapi kalau masih mau cerita dulu juga nggak apa-apa, aku di sini.";

// W3 — giliran tepat setelah SEMUA field inti selesai: tanyakan bukti SEKALI, natural.
// Widget upload muncul di UI setelah pesan ini; jangan menawarkan draf di sini.
const EVIDENCE_ASK_DIRECTIVE =
  "PERINTAH SISTEM (bukan dari siswa): info inti sudah lengkap. Giliran ini, validasi singkat lalu tanyakan SEKALI dengan hangat apakah dia punya bukti kejadian yang ingin dilampirkan — foto, screenshot, video, atau dokumen — dan tegaskan boleh dilewati kalau tidak ada. JANGAN menawarkan draf laporan, JANGAN menulis isi laporan, cukup pertanyaan bukti itu.";

// W3 — bukti sudah ditanyakan tapi siswa belum menjawab (masih mengetik hal lain).
// Jangan tanya bukti lagi, jangan tawarkan draf; cukup dengarkan.
const EVIDENCE_WAIT_DIRECTIVE =
  "PERINTAH SISTEM (bukan dari siswa): kamu sudah menanyakan soal bukti dan siswa belum memutuskan. JANGAN menanyakan bukti lagi dan JANGAN menawarkan draf laporan. Cukup tanggapi pesannya dengan hangat seperti biasa.";

function readSlots(raw: unknown): Slots {
  // Merge default: sesi lama (skema slot < 8 blok) dapat slot baru sebagai "empty",
  // bukan undefined — kalau undefined, nextEmptyField salah anggap sudah tersentuh.
  if (raw && typeof raw === "object" && "phase" in raw) return { ...emptySlots(), ...(raw as Slots) };
  return emptySlots();
}

// Direktif "tanya satu hal" dari target yang dipilih kode. Sebelum ada cerita inti
// (gambaran_kejadian masih kosong) → null: obrolan bebas, jangan interogasi.
function targetDirective(slots: Slots, target: string | null): string | null {
  if (!target || slots.gambaran_kejadian === "empty") return null;
  return `FOKUS GILIRAN INI (perintah sistem, bukan dari siswa): tanyakan HANYA SATU hal — ${SLOT_DIRECTIVE[target as keyof typeof SLOT_DIRECTIVE]} — lewat pertanyaan terbuka yang natural sesuai alur obrolan. JANGAN menanyakan hal lain, JANGAN ganti topik, JANGAN sebutkan istilah teknis apa pun.`;
}

export async function POST(request: Request) {
  const { message, panic, control } = await request.json();
  // control "resolve-evidence" = siswa selesai/lewati langkah bukti (W3): tak ada
  // pesan teks, murni sinyal bisnis untuk buka gate draf.
  const isControl = control === "resolve-evidence";
  if (!isControl && (typeof message !== "string" || !message.trim())) {
    return Response.json({ error: "message wajib diisi" }, { status: 400 });
  }
  // Batas panjang: pesan masuk transkrip yang dikirim ULANG ke LLM tiap giliran —
  // pesan raksasa membengkakkan row DB + menembus token limit Groq. 4000 char cukup
  // untuk cerita panjang sekalipun.
  if (!isControl && (message as string).length > 4000) {
    return Response.json({ error: "pesan terlalu panjang" }, { status: 413 });
  }

  // Identitas sesi = cookie httpOnly, bukan input klien (id report dipakai langsung sebagai sesi)
  const cookieStore = await cookies();
  let reportId = cookieStore.get(SESSION_COOKIE)?.value ?? null;
  let report = reportId ? await prisma.report.findUnique({ where: { id: reportId } }) : null;
  let isNew = false;

  if (!report) {
    report = await prisma.report.create({ data: { rawTranscript: [] } });
    reportId = report.id;
    isNew = true;
    await logAction(reportId, "system", "created");
  }

  // Sesi follow-up? (laporan lama dengan follow-up aktif) → prime system prompt dengan
  // konteks narasi (non-leading). Tier 1 di bawah TETAP aktif penuh, tanpa pengecualian.
  const followupMode =
    !isNew &&
    (await prisma.followup.count({ where: { reportId: reportId!, proactiveEnabled: true } })) > 0;

  const transcript = readTranscript(report.rawTranscript);
  if (!isControl) transcript.push({ role: "user", content: message, ts: new Date().toISOString() });

  // Tier 1 SEBELUM model utama — krisis skip semua tahap normal.
  // panic=true: siswa menekan chip "Aku sedang dalam bahaya" — deklarasi
  // eksplisit, diperlakukan sama dengan deteksi otomatis. Control (resolve-evidence)
  // tak membawa pesan → tak ada deteksi krisis.
  const crisis =
    !isControl && panic === true
      ? { isCrisis: true, matchedCategory: "panic-button" }
      : !isControl
        ? detectCrisisSignal(message)
        : { isCrisis: false, matchedCategory: null };

  const stream = new ReadableStream({
    async start(controller) {
      controller.enqueue(sse({ type: "session", id: reportId }));

      let assistantText = "";
      let slots = readSlots(report!.slots);
      let slotsChanged = false;

      if (isControl) {
        // W3 — siswa selesai/lewati langkah bukti. Buka gate & susun laporan (TANPA
        // model chat), TAPI hanya bila field inti benar-benar lengkap (jaring pengaman;
        // widget tak akan muncul sebelum itu).
        if (isReadyForDraftOffer(slots)) {
          slots = { ...slots, evidenceResolved: true, phase: "done", target: null, targetCount: 0 };
          slotsChanged = true;
          const draft = await composeReport(transcript);
          const structured = toStructuredDraft(draft);
          assistantText = COMPOSE_CONFIRM;
          controller.enqueue(sse({ type: "text", delta: COMPOSE_CONFIRM }));
          controller.enqueue(sse({ type: "draft", draft: structured }));
          await prisma.report.update({
            where: { id: reportId! },
            data: {
              narrative: draft.narrativeSummary,
              draft: structured,
              urgencyLevel: report!.urgencyLevel ?? draft.urgencyLevel, // krisis Tier 1 tak tertimpa
              perpetratorRole: draft.perpetratorRole,
              locationCategory: draft.locationCategory,
              violenceType: draft.violenceType,
              actionSignals: {
                cederaFisik: draft.cederaFisik,
                sudahBerulang: draft.sudahBerulang,
                relasiKuasaTimpang: draft.relasiKuasaTimpang,
                adaBukti: draft.bukti?.adaBukti ?? null,
                adaBahayaLangsung: draft.keamanan?.adaBahayaLangsung ?? null,
              },
            },
          });
        }
      } else if (crisis.isCrisis) {
        assistantText = CRISIS_RESPONSE;
        controller.enqueue(sse({ type: "crisis", category: crisis.matchedCategory }));
        controller.enqueue(sse({ type: "text", delta: CRISIS_RESPONSE }));
        await prisma.report.update({
          where: { id: reportId! },
          data: { urgencyLevel: "kritis" },
        });
      } else if (detectMetaProbe(message)) {
        // Tier 1.5 — upaya ekstraksi/override instruksi sistem: deflektor dalam
        // persona TANPA memanggil model (model bisa dibujuk bocor; ini tak bisa).
        assistantText = META_PROBE_RESPONSE;
        controller.enqueue(sse({ type: "text", delta: META_PROBE_RESPONSE }));
      } else if (followupMode) {
        // Sesi follow-up: narasi sudah ada, tak ada gathering ulang.
        assistantText = await streamChat(
          controller,
          buildMessages(followupSystemPrompt(report!.narrative), transcript)
        );
      } else if (slots.phase === "done") {
        // Sudah tersusun — obrolan lanjutan bebas, tanpa targeting/compose ulang.
        assistantText = await streamChat(controller, buildMessages(SYSTEM_PROMPT, transcript));
      } else {
        // phase "gathering" / "ready": ekstrak → kunci slot → tentukan target → inject → chat.
        const draft = await composeReport(transcript);
        const advanced = advanceSlots(updateSlots(slots, draft));
        slots = advanced.slots;
        slotsChanged = true;
        let directive: string | null;
        if (advanced.ready) {
          // Semua field inti selesai (W2). Tanyakan bukti SEKALI; giliran berikutnya
          // cukup dengarkan sampai siswa upload/lewati (widget) → control resolve.
          if (!slots.evidenceQuestionAsked) {
            directive = EVIDENCE_ASK_DIRECTIVE;
            slots.evidenceQuestionAsked = true;
          } else {
            directive = EVIDENCE_WAIT_DIRECTIVE;
          }
        } else {
          directive = targetDirective(slots, advanced.target);
        }
        const sys = directive ? `${SYSTEM_PROMPT}\n\n${directive}` : SYSTEM_PROMPT;
        assistantText = await streamChat(controller, buildMessages(sys, transcript));
      }

      // W3 — kirim state bukti terbaru tiap giliran; frontend memutuskan tampil widget
      // murni dari flag ini (bukan parsing teks AI).
      controller.enqueue(
        sse({
          type: "evidence",
          questionAsked: slots.evidenceQuestionAsked,
          resolved: slots.evidenceResolved,
        })
      );

      if (assistantText)
        transcript.push({ role: "assistant", content: assistantText, ts: new Date().toISOString() });
      await prisma.report.update({
        where: { id: reportId! },
        data: {
          rawTranscript: sealTranscript(transcript),
          ...(slotsChanged ? { slots } : {}),
        },
      });

      controller.enqueue(sse({ type: "done" }));
      controller.close();
    },
  });

  const headers = new Headers({
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-store",
    Connection: "keep-alive",
    // nginx (EC2) mem-buffer respons secara default → SSE muncul sekaligus di akhir
    "X-Accel-Buffering": "no",
  });
  if (isNew) {
    const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
    headers.set(
      "Set-Cookie",
      `${SESSION_COOKIE}=${reportId}; HttpOnly; SameSite=Strict; Path=/; Max-Age=${SESSION_MAX_AGE}${secure}`
    );
  }
  return new Response(stream, { headers });
}
