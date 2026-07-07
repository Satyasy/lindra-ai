import type { Metadata } from "next";
import { DraftReview } from "@/components/draft/DraftReview";

export const metadata: Metadata = { title: "Catatan Harian" };

export default async function DraftPage({
  params,
}: {
  params: Promise<{ sessionId: string }>;
}) {
  const { sessionId } = await params;
  return <DraftReview sessionId={sessionId} />;
}
