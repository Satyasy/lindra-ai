import type { Metadata } from "next";
import { ChatScreen } from "@/components/chat/ChatScreen";

// Judul netral — tidak mengungkap fungsi pelaporan di riwayat browser
export const metadata: Metadata = { title: "Catatan Harian" };

export default function ChatPage() {
  return <ChatScreen />;
}
