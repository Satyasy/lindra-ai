// Routing engine — business logic murni, TANPA AI.
// Ini bukti kode dari prinsip Bagian I.1.3: AI tidak pernah memutuskan rute.
// Aturan berurutan, aturan pertama yang cocok menang.

export type RouteDestination =
  | "dashboard-bk"
  | "satgas-eksternal"
  | "sapa129"
  | "eskalasi-darurat";

export interface RoutableReport {
  urgencyLevel: string | null;
  perpetratorRole: string | null;
  locationCategory: string | null;
  violenceType: string[];
}

export interface RoutingResult {
  destinations: RouteDestination[];
  parallel: boolean;
  urgentVisum: boolean;
}

// Transparansi rute (DESIGN.md §1.11) — alasan singkat per tujuan,
// ditampilkan ke siswa di konfirmasi dan ke staf di detail laporan
export const ROUTE_REASON: Record<RouteDestination, string> = {
  "dashboard-bk": "Laporanmu diteruskan ke guru BK sekolahmu untuk ditindaklanjuti.",
  "satgas-eksternal":
    "Karena melibatkan pihak sekolah atau lintas sekolah, laporanmu diteruskan ke Satgas eksternal — bukan BK sekolahmu.",
  sapa129:
    "Laporanmu diteruskan ke SAPA 129, layanan nasional perlindungan anak — jalur yang tidak bergantung pada sekolah.",
  "eskalasi-darurat":
    "Ceritamu menunjukkan keadaan darurat, jadi laporanmu masuk jalur eskalasi tercepat.",
};

export function determineRoute(report: RoutableReport): RoutingResult {
  // Aturan 5 — kekerasan seksual: flag visum urgent, berlaku di rute mana pun
  const urgentVisum = report.violenceType.includes("seksual");

  // Aturan 1 — krisis: eskalasi darurat + SAPA 129 paralel sebagai jaring pengaman kedua
  if (report.urgencyLevel === "kritis") {
    return { destinations: ["eskalasi-darurat", "sapa129"], parallel: true, urgentVisum };
  }
  // Aturan 2 — pelaku guru/staf: bypass sekolah, TIDAK PERNAH lewat dashboard BK
  if (report.perpetratorRole === "guru-staf") {
    return { destinations: ["satgas-eksternal"], parallel: false, urgentVisum };
  }
  // Aturan 3 — pelaku orangtua/wali: rumah bukan tempat aman, rute nasional
  if (report.perpetratorRole === "orangtua-wali") {
    return { destinations: ["sapa129"], parallel: false, urgentVisum };
  }
  // Aturan 4 — lintas sekolah: yurisdiksi Satgas, bukan TPPK satu sekolah
  if (report.locationCategory === "lintas-sekolah") {
    return { destinations: ["satgas-eksternal"], parallel: false, urgentVisum };
  }
  // Aturan 6 — default: antar-siswa satu sekolah, dashboard BK
  return { destinations: ["dashboard-bk"], parallel: false, urgentVisum };
}
