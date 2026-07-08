import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { FollowupSession } from "@/components/followup/FollowupSession";

// Sesi follow-up — hanya boleh dibuka lewat cookie sesi (di-set /api/followup/verify
// setelah kode dimasukkan manual). Tanpa cookie → balik ke halaman input kode.
export default async function FollowupPage() {
  const cookieStore = await cookies();
  if (!cookieStore.get("lindra_followup")?.value) redirect("/followup/masuk");
  return <FollowupSession />;
}
