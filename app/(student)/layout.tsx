import type { Metadata } from "next";
import { QuickExit } from "@/components/QuickExit";

// Chrome aplikasi siswa memakai judul NETRAL (DESIGN.md §1.4) —
// nama "Lindra" tidak boleh mencolok di tab browser perangkat yang mungkin diawasi pelaku
export const metadata: Metadata = { title: "Catatan Harian" };

export default function StudentLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <QuickExit />
      {children}
    </>
  );
}
