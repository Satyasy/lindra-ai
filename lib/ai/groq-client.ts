// Wrapper Groq — kerja infra Revano (bukan prompt).
// Key 1 (student) untuk percakapan utama, Key 2 (bk) untuk Tier 2 + RAG.
// Saat 429, failover ke SambaNova (provider berbeda = kuota berbeda; key Groq
// cadangan lama percuma karena limit dihitung per akun). Lihat Bagian IV.4.2 panduan.

const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";
const SAMBANOVA_URL = "https://api.sambanova.ai/v1/chat/completions";

// Pilihan model final milik Nabil — ini default sesuai dokumen panduan.
// Model SambaNova = bobot Llama yang sama (nama katalog beda) supaya perilaku
// prompt Tier 2 tidak berubah saat failover.
const MODELS = {
  student: "llama-3.3-70b-versatile",
  bk: "llama-3.1-8b-instant",
} as const;

const SAMBANOVA_MODELS = {
  student: "Meta-Llama-3.3-70B-Instruct",
  bk: "Meta-Llama-3.1-8B-Instruct",
} as const;

const KEYS = {
  student: () => process.env.GROQ_API_KEY_STUDENT,
  bk: () => process.env.GROQ_API_KEY_BK,
} as const;

export type GroqKeyType = keyof typeof KEYS;

export type ChatMessage = { role: "system" | "user" | "assistant"; content: string };

// Opsional, non-breaking: mode JSON Groq (format OpenAI). Default undefined = perilaku lama.
export type ResponseFormat = { type: "json_object" };

async function request(
  url: string,
  key: string,
  model: string,
  messages: ChatMessage[],
  stream: boolean,
  responseFormat?: ResponseFormat
) {
  return fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
    body: JSON.stringify({
      model,
      messages,
      stream,
      ...(responseFormat ? { response_format: responseFormat } : {}),
    }),
  });
}

// Mengembalikan null bila key belum dikonfigurasi (dev tanpa key tetap jalan via fallback pemanggil)
export async function groqChat(
  messages: ChatMessage[],
  keyType: GroqKeyType,
  stream = true,
  responseFormat?: ResponseFormat
): Promise<Response | null> {
  const primary = KEYS[keyType]();
  if (!primary) return null;

  let res = await request(GROQ_URL, primary, MODELS[keyType], messages, stream, responseFormat);
  const snKey = process.env.SAMBANOVA_API_KEY;
  if (res.status === 429 && snKey) {
    res = await request(SAMBANOVA_URL, snKey, SAMBANOVA_MODELS[keyType], messages, stream, responseFormat);
  }
  return res;
}
