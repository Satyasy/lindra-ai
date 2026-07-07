// ============================================================
// STUB — modul milik Nabil (Tier 2: klasifikasi + narrative composer,
// satu panggilan Groq Key 2 dengan JSON mode + few-shot).
// ============================================================

export interface TranscriptTurn {
  role: "user" | "assistant";
  content: string;
  ts: string;
}

export interface ReportDraft {
  narrative: string;
  urgencyLevel: "rendah" | "sedang" | "tinggi" | "kritis";
  perpetratorRole: "siswa" | "guru-staf" | "orangtua-wali" | null;
  locationCategory: "dalam-sekolah" | "lintas-sekolah" | null;
  violenceType: string[];
}

export async function composeReport(transcript: TranscriptTurn[]): Promise<ReportDraft> {
  // Stub: rangkum transkrip apa adanya, klasifikasi default paling aman (non-krisis, rute BK).
  const studentLines = transcript.filter((t) => t.role === "user").map((t) => t.content);
  return {
    narrative:
      studentLines.length > 0
        ? `Siswa menyatakan bahwa: ${studentLines.join(" ")}`
        : "Belum ada cerita yang bisa dirangkum.",
    urgencyLevel: "sedang",
    perpetratorRole: "siswa",
    locationCategory: "dalam-sekolah",
    violenceType: [],
  };
}
