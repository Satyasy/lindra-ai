// Wrapper Groq — kerja infra Revano (bukan prompt).
// Key 1 (student) untuk percakapan utama, Key 2 (bk) untuk Tier 2 + RAG,
// Key 3 (backup) dipakai otomatis saat 429. Lihat Bagian IV.4.2 panduan.

const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";

// Pilihan model final milik Nabil — ini default sesuai dokumen panduan.
const MODELS = {
  student: "llama-3.3-70b-versatile",
  bk: "llama-3.1-8b-instant",
} as const;

const KEYS = {
  student: () => process.env.GROQ_API_KEY_STUDENT,
  bk: () => process.env.GROQ_API_KEY_BK,
} as const;

export type GroqKeyType = keyof typeof KEYS;

export type ChatMessage = { role: "system" | "user" | "assistant"; content: string };

async function request(key: string, keyType: GroqKeyType, messages: ChatMessage[], stream: boolean) {
  return fetch(GROQ_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
    body: JSON.stringify({ model: MODELS[keyType], messages, stream }),
  });
}

// Mengembalikan null bila key belum dikonfigurasi (dev tanpa key tetap jalan via fallback pemanggil)
export async function groqChat(
  messages: ChatMessage[],
  keyType: GroqKeyType,
  stream = true
): Promise<Response | null> {
  const primary = KEYS[keyType]();
  if (!primary) return null;

  let res = await request(primary, keyType, messages, stream);
  if (res.status === 429 && process.env.GROQ_API_KEY_BACKUP) {
    res = await request(process.env.GROQ_API_KEY_BACKUP, keyType, messages, stream);
  }
  return res;
}
