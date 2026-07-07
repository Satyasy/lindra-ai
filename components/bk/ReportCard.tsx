import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

const URGENCY_STYLE: Record<string, string> = {
  kritis: "bg-destructive text-white", // merah HANYA untuk krisis sungguhan
  tinggi: "bg-amber-100 text-amber-900",
  sedang: "bg-secondary text-secondary-foreground",
  rendah: "bg-muted text-muted-foreground",
};

const STATUS_LABEL: Record<string, string> = {
  terkirim: "Baru masuk",
  ditinjau: "Sedang ditinjau",
  selesai: "Selesai",
};

export function ReportCard({
  report,
}: {
  report: {
    id: string;
    narrative: string | null;
    urgencyLevel: string | null;
    status: string;
    urgentVisum: boolean;
    createdAt: Date;
  };
}) {
  return (
    <Link href={`/bk/${report.id}`} className="block rounded-xl focus-visible:outline-2 focus-visible:outline-ring">
      <Card className="transition-colors hover:border-primary/40">
        <CardContent className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <Badge className={URGENCY_STYLE[report.urgencyLevel ?? "rendah"]}>
              {report.urgencyLevel ?? "belum terklasifikasi"}
            </Badge>
            {report.urgentVisum && <Badge variant="outline">visum urgent</Badge>}
            <Badge variant="secondary">{STATUS_LABEL[report.status] ?? report.status}</Badge>
            <span className="ml-auto text-xs text-muted-foreground">
              {report.createdAt.toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short" })}
            </span>
          </div>
          <p className="line-clamp-2 text-sm leading-relaxed text-foreground">
            {report.narrative ?? "(narasi belum tersusun)"}
          </p>
        </CardContent>
      </Card>
    </Link>
  );
}
