import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { SESSION_COOKIE } from "@/lib/session";
import { readTranscript } from "@/lib/transcript";
import { FOLLOWUP_OPENER } from "@/lib/followup-copy";
import { StudentNav, type StudentSession } from "@/components/nav/StudentNav";
import { ChatScreen, type Msg } from "@/components/chat/ChatScreen";

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
  let session: StudentSession = null;

  if (sessionId) {
    const report = await prisma.report.findUnique({
      where: { id: sessionId },
      include: {
        referralCode: true,
        chatThreads: { include: { messages: { orderBy: { createdAt: "asc" } } } },
        followups: { where: { proactiveEnabled: true }, select: { id: true } },
      },
    });
    if (report) {
      initialMessages = readTranscript(report.rawTranscript).map((t) => ({
        role: t.role,
        content: t.content,
        ts: Date.parse(t.ts) || undefined,
      }));
      // Sesi follow-up (laporan dgn follow-up aktif) → buka dengan sapaan kabar.
      // Display-only & non-leading (tak dipersist ke transkrip). Chat API meng-inject
      // konteks narasi untuk balasan berikutnya.
      if (report.followups.length > 0) {
        initialMessages = [...initialMessages, { role: "assistant", content: FOLLOWUP_OPENER }];
      }
      const consult = report.chatThreads
        .flatMap((t: (typeof report.chatThreads)[number]) => t.messages)
        .sort(
          (
            a: (typeof report.chatThreads)[number]["messages"][number],
            b: (typeof report.chatThreads)[number]["messages"][number],
          ) => a.createdAt.getTime() - b.createdAt.getTime(),
        )
        .map((m) => ({ id: m.id, sender: m.sender, content: m.content, timeLabel: wibTime(m.createdAt) }));
      session = {
        code: report.referralCode?.code ?? null,
        status: report.status,
        hasDraft: report.status === "draft",
        narrative: report.narrative,
        consult,
      };
    }
  }

  return (
    <StudentNav session={session}>
      <h1 className="sr-only">Catatan Harian</h1>
      <ChatScreen initialMessages={initialMessages} />
    </StudentNav>
  );
}
