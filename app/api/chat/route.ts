import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { detectCrisisSignal, CRISIS_RESPONSE } from "@/lib/ai/crisis-check";
import { SYSTEM_PROMPT } from "@/lib/ai/system-prompt";
import { followupSystemPrompt } from "@/lib/ai/prompts/followup-context-injection";
import { groqChat, type ChatMessage } from "@/lib/ai/groq-client";
import { logAction } from "@/lib/audit/log-action";
import { readTranscript, sealTranscript } from "@/lib/transcript";

const SESSION_COOKIE = "lindra_session";

// Balasan saat GROQ_API_KEY_STUDENT belum diisi — alur tetap demoable tanpa key
const NO_KEY_FALLBACK =
  "aku di sini, dengerin kok. cerita aja pelan-pelan, mulai dari mana pun yang kamu mau.";

const encoder = new TextEncoder();
const sse = (data: object) => encoder.encode(`data: ${JSON.stringify(data)}\n\n`);

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

      if (crisis.isCrisis) {
        assistantText = CRISIS_RESPONSE;
        controller.enqueue(sse({ type: "crisis", category: crisis.matchedCategory }));
        controller.enqueue(sse({ type: "text", delta: CRISIS_RESPONSE }));
        await prisma.report.update({
          where: { id: reportId! },
          data: { urgencyLevel: "kritis" },
        });
      } else {
        const messages: ChatMessage[] = [
          { role: "system", content: followupMode ? followupSystemPrompt(report.narrative) : SYSTEM_PROMPT },
          ...transcript.map(({ role, content }) => ({ role, content })),
        ];
        const groqRes = await groqChat(messages, "student");

        if (!groqRes || !groqRes.ok || !groqRes.body) {
          assistantText = NO_KEY_FALLBACK;
          controller.enqueue(sse({ type: "text", delta: NO_KEY_FALLBACK }));
        } else {
          // Parse SSE Groq (format OpenAI) → teruskan delta bersih ke klien
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
                  assistantText += delta;
                  controller.enqueue(sse({ type: "text", delta }));
                }
              } catch {
                // potongan JSON tidak utuh — abaikan
              }
            }
          }
        }
      }

      transcript.push({ role: "assistant", content: assistantText, ts: new Date().toISOString() });
      await prisma.report.update({
        where: { id: reportId! },
        data: { rawTranscript: sealTranscript(transcript) },
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
