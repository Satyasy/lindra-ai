import { groqChat, type ChatMessage } from "@/lib/ai/groq-client";
import type { TranscriptTurn } from "@/lib/ai/classify-narrative";

// Helper stream chat siswa (Lapis 2) — dipakai intake (app/api/chat) & sesi follow-up
// (app/api/followup/chat). Satu sumber parsing SSE Groq + fallback tanpa key.

const encoder = new TextEncoder();
// Encode satu event SSE.
export const sse = (data: object) => encoder.encode(`data: ${JSON.stringify(data)}\n\n`);

// Balasan saat GROQ_API_KEY_STUDENT belum diisi — alur tetap demoable tanpa key.
export const NO_KEY_FALLBACK =
  "aku di sini, dengerin kok. cerita aja pelan-pelan, mulai dari mana pun yang kamu mau.";

export function buildMessages(sysContent: string, transcript: TranscriptTurn[]): ChatMessage[] {
  return [
    { role: "system", content: sysContent },
    ...transcript.map(({ role, content }) => ({ role, content })),
  ];
}

// Stream balasan model chat siswa ke controller; kembalikan teks lengkapnya. Fallback aman
// (tanpa key / API error / body kosong) supaya chat tidak crash.
export async function streamChat(
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
