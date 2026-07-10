import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { SESSION_COOKIE } from "@/lib/session";
import { readTranscript } from "@/lib/transcript";
import { StudentNav, type StudentSession } from "@/components/nav/StudentNav";
import { ChatScreen, type Msg } from "@/components/chat/ChatScreen";
import type { StructuredDraft } from "@/components/draft/DraftCanvas";

// /chat — aplikasi siswa. Shell StudentNav (judul netral "Catatan Harian" + nav),
// QuickExit disediakan (student)/layout. DESIGN.md §5.2.
// Sesi dibaca dari cookie httpOnly (reportId). Pengguna lama masuk lewat /masuk yang
// men-set cookie ini → riwayat + tombol sidebar (dokumen/tracking/guru) termuat.
const wibTime = (d: Date) =>
  d.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Jakarta", hour12: false });

export default async function ChatPage() {
  const store = await cookies();
  const sessionId = store.get(SESSION_COOKIE)?.value;

  let initialMessages: Msg[] = [];
  let initialDraft: StructuredDraft | null = null;
  let session: StudentSession = null;
  let criticalSummary: string | null = null; // PEMICU 1: dokumen kritis → tombol WA SAPA 129

  if (sessionId) {
    const report = await prisma.report.findUnique({
      where: { id: sessionId },
      include: {
        referralCode: true,
        chatThreads: { include: { messages: { orderBy: { createdAt: "asc" } } } },
        followups: { select: { id: true }, take: 1 },
      },
    });
    if (report) {
      initialMessages = readTranscript(report.rawTranscript).map((t) => ({
        role: t.role,
        content: t.content,
        ts: Date.parse(t.ts) || undefined,
      }));
      // Sapaan kabar TIDAK lagi diselipkan di sini — sesi tanya-kabar punya halaman sendiri
      // (/followup). /chat murni menampilkan transkrip lama.
      const consult = report.chatThreads
        .flatMap((t: (typeof report.chatThreads)[number]) => t.messages)
        .sort(
          (
            a: (typeof report.chatThreads)[number]["messages"][number],
            b: (typeof report.chatThreads)[number]["messages"][number],
          ) => a.createdAt.getTime() - b.createdAt.getTime(),
        )
        .map((m) => ({ id: m.id, sender: m.sender, content: m.content, timeLabel: wibTime(m.createdAt) }));
      // Draf editable hanya selama belum terkirim (biar tombol "Buka draf" tetap ada
      // walau siswa refresh atau tak sengaja tutup panel).
      if (report.status === "draft" && report.draft) {
        initialDraft = report.draft as unknown as StructuredDraft;
      }
      session = {
        code: report.referralCode?.code ?? null,
        status: report.status,
        hasDraft: report.status === "draft",
        narrative: report.narrative,
        consult,
        hasFollowup: report.followups.length > 0, // ada sesi tanya-kabar → dropdown nav
      };
      // Dokumen ditandai KRITIS + sudah ada ringkasan → tombol kirim ke SAPA 129.
      if (report.urgencyLevel === "kritis" && report.narrative) {
        criticalSummary = report.narrative;
      }
    }
  }

  return (
    <StudentNav session={session}>
      <h1 className="sr-only">Catatan Harian</h1>
      <ChatScreen
        initialMessages={initialMessages}
        initialDraft={initialDraft}
        initialSessionId={sessionId ?? null}
        criticalSummary={criticalSummary}
      />
    </StudentNav>
  );
}
