// Peta tampilan penanganan / risiko / kekhawatiran — SATU sumber untuk tabel antrean
// & halaman detail. Plain data (tanpa "use client") supaya bisa dipakai server & client.
// Aturan warna: cerah HANYA di risiko/kekhawatiran/penanganan; --danger hanya sinyal
// kritis (Kritis, Eskalasi Hukum, kekhawatiran tertinggi) — bukan dekorasi.

export const HANDLING_STATUS = [
  "belum-diassign",
  "dijadwalkan",
  "investigasi",
  "eskalasi-hukum",
  "selesai",
] as const;
export type HandlingStatus = (typeof HANDLING_STATUS)[number];

export const HANDLING_LABEL: Record<string, string> = {
  "belum-diassign": "Belum ditangani",
  dijadwalkan: "Dijadwalkan",
  investigasi: "Investigasi",
  "eskalasi-hukum": "Eskalasi Hukum",
  selesai: "Selesai",
};

// Pill status penanganan. eskalasi-hukum = danger (sinyal hukum kritis, bukan dekor).
export const HANDLING_PILL: Record<string, string> = {
  "belum-diassign": "bg-surface-alt text-text-soft",
  dijadwalkan: "bg-primary-soft text-primary-ink",
  investigasi: "bg-primary-soft text-primary-ink",
  "eskalasi-hukum": "bg-danger-soft text-danger-deep",
  selesai: "bg-surface-alt text-muted-foreground",
};

// Badge titik risiko (dari urgencyLevel). Label teks membawa makna (bukan warna saja).
export const RISK: Record<string, { label: string; dot: string }> = {
  kritis: { label: "Kritis", dot: "var(--danger)" },
  tinggi: { label: "Tinggi", dot: "var(--warm)" },
  sedang: { label: "Sedang", dot: "var(--warm-butter)" },
  rendah: { label: "Rendah", dot: "var(--primary-ink)" },
};

// Badge tujuan rute (RoutingLog.destination) — dipakai di halaman detail.
export const DEST_BADGE: Record<string, { label: string; cls: string }> = {
  "dashboard-bk": { label: "Dashboard BK", cls: "bg-primary-soft text-primary-ink" },
  "satgas-eksternal": { label: "Satgas Eksternal", cls: "bg-warm-soft text-warm-deep" },
  sapa129: { label: "SAPA 129", cls: "bg-danger-soft text-danger-deep" },
  "eskalasi-darurat": { label: "Eskalasi Darurat", cls: "bg-danger-soft text-danger-deep" },
};

// Meter "Tingkat Kekhawatiran" — display-only, dipetakan dari urgencyLevel.
// warm-butter (kuning) dipakai sebagai indikator display, bukan teks/aksi.
export const WORRY: Record<string, { label: string; fill: string; pct: number }> = {
  kritis: { label: "Sangat Khawatir", fill: "var(--danger)", pct: 100 },
  tinggi: { label: "Khawatir", fill: "var(--warm)", pct: 72 },
  sedang: { label: "Cukup Khawatir", fill: "var(--warm-butter)", pct: 48 },
  rendah: { label: "Ringan", fill: "var(--primary-deep)", pct: 24 },
};
