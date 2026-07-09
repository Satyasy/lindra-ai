import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { detectCrisisSignal, CRISIS_RESPONSE } from "@/lib/ai/crisis-check";
import { SYSTEM_PROMPT } from "@/lib/ai/system-prompt";
import { followupSystemPrompt } from "@/lib/ai/prompts/followup-context-injection";
import { groqChat, type ChatMessage } from "@/lib/ai/groq-client";
import {
  composeReport,
  updateSlots,
  advanceSlots,
  emptySlots,
  toStructuredDraft,
  SLOT_DIRECTIVE,
  type Slots,
  type TranscriptTurn,
} from "@/lib/ai/classify-narrative";
import { logAction } from "@/lib/audit/log-action";
import { readTranscript, sealTranscript } from "@/lib/transcript";

const SESSION_COOKIE = "lindra_session";

// Balasan saat GROQ_API_KEY_STUDENT belum diisi — alur tetap demoable tanpa key
const NO_KEY_FALLBACK =
  "aku di sini, dengerin kok. cerita aja pelan-pelan, mulai dari mana pun yang kamu mau.";

// Ajakan menyusun draf — MEMINTA IZIN dulu (bukan mengumumkan draf sudah muncul).
// Panel TIDAK terbuka otomatis; klien menampilkan tombol [Belum]/[Buat Draf] di
// bawah pesan ini, dan panel baru meluncur saat siswa menekan "Buat Draf".
const COMPOSE_CONFIRM =
  "terima kasih sudah cerita sejauh ini. aku rasa aku sudah cukup memahami ceritamu. kalau kamu setuju, aku bisa bantu menyusunnya jadi draf laporan.";

// Direktif giliran validasi (semua field cukup, belum boleh compose).
const READY_DIRECTIVE =
  "PERINTAH SISTEM (bukan dari siswa): info inti sudah lengkap. Giliran ini JANGAN bertanya apa pun lagi. Cukup satu-dua kalimat validasi hangat, lalu bilang kamu akan bantu susun laporannya sekarang — tanpa menulis isi laporan apa pun.";

const encoder = new TextEncoder();
const sse = (data: object) => encoder.encode(`data: ${JSON.stringify(data)}\n\n`);

function readSlots(raw: unknown): Slots {
  // Merge default: sesi lama (skema slot < 8 blok) dapat slot baru sebagai "empty",
  // bukan undefined — kalau undefined, nextEmptyField salah anggap sudah tersentuh.
  if (raw && typeof raw === "object" && "phase" in raw) return { ...emptySlots(), ...(raw as Slots) };
  return emptySlots();
}

function buildMessages(sysContent: string, transcript: TranscriptTurn[]): ChatMessage[] {
  return [
    { role: "system", content: sysContent },
    ...transcript.map(({ role, content }) => ({ role, content })),
  ];
}

// Direktif "tanya satu hal" dari target yang dipilih kode. Sebelum ada cerita inti
// (gambaran_kejadian masih kosong) → null: obrolan bebas, jangan interogasi.
function targetDirective(slots: Slots, target: string | null): string | null {
  if (!target || slots.gambaran_kejadian === "empty") return null;
  return `FOKUS GILIRAN INI (perintah sistem, bukan dari siswa): tanyakan HANYA SATU hal — ${SLOT_DIRECTIVE[target as keyof typeof SLOT_DIRECTIVE]} — lewat pertanyaan terbuka yang natural sesuai alur obrolan. JANGAN menanyakan hal lain, JANGAN ganti topik, JANGAN sebutkan istilah teknis apa pun.`;
}

// Stream balasan model chat ke klien; kembalikan teks lengkapnya. Fallback aman
// (tanpa key / API error / body kosong) supaya chat tidak crash.
async function streamChat(
  controller: ReadableStreamDefaultController,
  messages: ChatMessage[]
): Promise<string> {
  const groqRes = await groqChat(messages, "student");
  if (!groqRes || !groqRes.ok || !groqRes.body) {
    if (!groqRes) {
      console.error("[Lapis2] groqChat return null — GROQ_API_KEY_STUDENT tidak ter-set/kosong");
    } else if (!groqRes.ok) {
      console.error(`[Lapis2] Groq API gagal — status ${groqRes.status}: ${await groqRes.text()}`);
    } else {
      console.error("[Lapis2] Groq response tanpa body — fallback dipakai");
    }
    controller.enqueue(sse({ type: "text", delta: NO_KEY_FALLBACK }));
    return NO_KEY_FALLBACK;
  }

  let text = "";
  const reader = groqRes.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";
    for (const line of lines) {
      if (!line.startsWith("data: ") || line.includes("[DONE]")) continue;
      try {
        const delta = JSON.parse(line.slice(6)).choices?.[0]?.delta?.content;
        if (delta) {
          text += delta;
          controller.enqueue(sse({ type: "text", delta }));
        }
      } catch {
        // potongan JSON tidak utuh — abaikan
      }
    }
  }
  return text;
}

export async function POST(request: Request) {
  const { message, panic } = await request.json();
  if (typeof message !== "string" || !message.trim()) {
    return Response.json({ error: "message wajib diisi" }, { status: 400 });
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
  transcript.push({ role: "user", content: message, ts: new Date().toISOString() });

  // Tier 1 SEBELUM model utama — krisis skip semua tahap normal.
  // panic=true: siswa menekan chip "Aku sedang dalam bahaya" — deklarasi
  // eksplisit, diperlakukan sama dengan deteksi otomatis
  const crisis =
    panic === true
      ? { isCrisis: true, matchedCategory: "panic-button" }
      : detectCrisisSignal(message);

  const stream = new ReadableStream({
    async start(controller) {
      controller.enqueue(sse({ type: "session", id: reportId }));

      let assistantText = "";
      let slots = readSlots(report!.slots);
      let slotsChanged = false;

      if (crisis.isCrisis) {
        assistantText = CRISIS_RESPONSE;
        controller.enqueue(sse({ type: "crisis", category: crisis.matchedCategory }));
        controller.enqueue(sse({ type: "text", delta: CRISIS_RESPONSE }));
        await prisma.report.update({
          where: { id: reportId! },
          data: { urgencyLevel: "kritis" },
        });
      } else if (followupMode) {
        // Sesi follow-up: narasi sudah ada, tak ada gathering ulang.
        assistantText = await streamChat(
          controller,
          buildMessages(followupSystemPrompt(report!.narrative), transcript)
        );
      } else if (slots.phase === "ready") {
        // Field cukup + giliran validasi sudah lewat → siswa konfirmasi.
        // TRANSISI DIPAKSA KODE: susun laporan TANPA memanggil model chat.
        const draft = await composeReport(transcript);
        const structured = toStructuredDraft(draft);
        assistantText = COMPOSE_CONFIRM;
        controller.enqueue(sse({ type: "text", delta: COMPOSE_CONFIRM }));
        controller.enqueue(sse({ type: "draft", draft: structured }));
        slots = { ...slots, phase: "done", target: null, targetCount: 0 };
        slotsChanged = true;
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
      } else if (slots.phase === "done") {
        // Sudah tersusun — obrolan lanjutan bebas, tanpa targeting/compose ulang.
        assistantText = await streamChat(controller, buildMessages(SYSTEM_PROMPT, transcript));
      } else {
        // phase "gathering": ekstrak → kunci slot → tentukan target → inject → chat.
        const draft = await composeReport(transcript);
        const advanced = advanceSlots(updateSlots(slots, draft));
        slots = advanced.slots;
        slotsChanged = true;
        const directive = advanced.ready
          ? READY_DIRECTIVE
          : targetDirective(slots, advanced.target);
        const sys = directive ? `${SYSTEM_PROMPT}\n\n${directive}` : SYSTEM_PROMPT;
        assistantText = await streamChat(controller, buildMessages(sys, transcript));
      }

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
  });
  if (isNew) {
    const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
    headers.set(
      "Set-Cookie",
      `${SESSION_COOKIE}=${reportId}; HttpOnly; SameSite=Strict; Path=/${secure}`
    );
  }
  return new Response(stream, { headers });
}
