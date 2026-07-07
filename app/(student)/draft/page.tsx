import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { DraftReview } from "@/components/draft/DraftReview";
import { SESSION_COOKIE } from "@/lib/session";

// /draft tanpa id di URL (DESIGN.md §4) — sesi dibaca dari cookie httpOnly,
// tidak ada id laporan yang bocor ke riwayat browser
export default async function DraftPage() {
  const cookieStore = await cookies();
  const sessionId = cookieStore.get(SESSION_COOKIE)?.value;
  if (!sessionId) redirect("/chat");
  return <DraftReview sessionId={sessionId} />;
}
