// Wrapper Groq — SATU API key (plan Developer) untuk semua model LLM. `keyType` hanya
// memilih MODEL: "student" = 70B untuk percakapan siswa, "bk" = 8B-instant untuk Tier 2
// + RAG (model beda, key sama). Failover SambaNova dihapus: plan Developer punya limit
// tinggi sehingga 429 langka, dan tiap pemanggil sudah mendegradasi anggun saat galat.

const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";

// Pilihan model final milik Nabil — default sesuai dokumen panduan.
const MODELS = {
  student: "llama-3.3-70b-versatile",
  bk: "llama-3.1-8b-instant",
} as const;

export type GroqKeyType = keyof typeof MODELS;

export type ChatMessage = { role: "system" | "user" | "assistant"; content: string };

// Opsional, non-breaking: mode JSON Groq (format OpenAI). Default undefined = perilaku lama.
export type ResponseFormat = { type: "json_object" };

// Mengembalikan null bila key belum dikonfigurasi (dev tanpa key tetap jalan via fallback pemanggil)
export async function groqChat(
  messages: ChatMessage[],
  keyType: GroqKeyType,
  stream = true,
  responseFormat?: ResponseFormat
): Promise<Response | null> {
  const key = process.env.GROQ_API_KEY;
  if (!key) return null;

  return fetch(GROQ_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
    body: JSON.stringify({
      model: MODELS[keyType],
      messages,
      stream,
      ...(responseFormat ? { response_format: responseFormat } : {}),
    }),
  });
}
