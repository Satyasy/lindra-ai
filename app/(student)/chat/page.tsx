import { StudentNav } from "@/components/nav/StudentNav";
import { ChatScreen } from "@/components/chat/ChatScreen";

// /chat — aplikasi siswa. Shell StudentNav (judul netral "Catatan Harian" + nav),
// QuickExit disediakan (student)/layout.tsx. DESIGN.md §5.2.
export default function ChatPage() {
  return (
    <StudentNav>
      <h1 className="sr-only">Catatan Harian</h1>
      <ChatScreen />
    </StudentNav>
  );
}
