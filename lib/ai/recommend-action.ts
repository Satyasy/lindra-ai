// ============================================================
// Rekomendasi aksi BK (korban & pelaku) + perakitan narasi kasus.
// Pola SAMA seperti recommend-policy.ts: KEPUTUSAN di kode deterministik
// (computeActionSignals — pure, no LLM), LLM cuma MENJELASKAN sinyal yang
// sudah menyala (explainAction). LLM tak pernah menentukan/menilai ulang.
// Semua path gagal → fallback, tak pernah throw. Modul Nabil.
// ============================================================

import { groqChat } from "./groq-client";
import { recommendArticles, recommendLaws, type PolicyRecommendation } from "./recommend-policy";
import { UU_RETRIEVAL_ENABLED } from "@/lib/config";

// --- Kontrak sinyal & rekomendasi -------------------------------------------

export interface ActionSignals {
  urgencyLevel: "rendah" | "sedang" | "tinggi" | "kritis";
  violenceType: string[];
  cederaFisik: boolean | null;
  sudahBerulang: boolean | null;
  relasiKuasaTimpang: boolean | null;
  adaBukti: boolean | null; // ponytail: belum dibaca rule manapun; disimpan utk tuning ke depan
  adaBahayaLangsung: boolean | null;
  adaDampak: boolean | null; // tambahan dari spec — rule korban.psikolog butuh "dampak ada"
}

type SideKey = "mediasiBk" | "psikolog" | "ranahHukum";
type SideFlags = Record<SideKey, boolean>;

export interface ActionRecommendation {
  korban: SideFlags;
  pelaku: SideFlags;
  cukupData: boolean; // false kalau cederaFisik/sudahBerulang/relasiKuasaTimpang SEMUA null
}

// --- Rule engine (PURE, deterministik — satu-satunya penentu) ----------------

// Threshold sebagai named const supaya gampang di-tuning, tak tersebar sbg magic value.
const URGENSI_TINGGI = new Set(["tinggi", "kritis"]);
const URGENSI_MEDIASI = new Set(["rendah", "sedang"]);

export function computeActionSignals(s: ActionSignals): ActionRecommendation {
  const u = s.urgencyLevel;

  // Data belum cukup: tiga sinyal inti semua null → default konservatif.
  // Hanya mediasi BK; JANGAN nyalakan psikolog/hukum dari data yang tak ada.
  const cukupData = !(
    s.cederaFisik === null &&
    s.sudahBerulang === null &&
    s.relasiKuasaTimpang === null
  );
  if (!cukupData) {
    return {
      korban: { mediasiBk: true, psikolog: false, ranahHukum: false },
      pelaku: { mediasiBk: true, psikolog: false, ranahHukum: false },
      cukupData: false,
    };
  }

  // mediasi umum: urgensi rendah/sedang & tak ada cedera & tak berulang (dipakai 2 sisi).
  const mediasiUmum =
    URGENSI_MEDIASI.has(u) && s.cederaFisik !== true && s.sudahBerulang !== true;

  return {
    korban: {
      mediasiBk: mediasiUmum,
      psikolog: s.adaDampak === true || s.cederaFisik === true || URGENSI_TINGGI.has(u),
      ranahHukum:
        s.cederaFisik === true ||
        s.adaBahayaLangsung === true ||
        u === "kritis" ||
        (s.sudahBerulang === true && s.relasiKuasaTimpang === true),
    },
    pelaku: {
      mediasiBk: mediasiUmum,
      psikolog: s.sudahBerulang === true || s.relasiKuasaTimpang === true,
      ranahHukum:
        s.cederaFisik === true ||
        s.adaBahayaLangsung === true ||
        u === "kritis" ||
        s.violenceType.includes("kekerasan-seksual"),
    },
    cukupData: true,
  };
}

// --- Label ------------------------------------------------------------------

const OPSI_LABEL: Record<SideKey, string> = {
  mediasiBk: "Mediasi / pendampingan BK",
  psikolog: "Rujukan psikolog / konseling",
  ranahHukum: "Pertimbangkan jalur ranah hukum",
};

const VIOLENCE_LABEL: Record<string, string> = {
  "kekerasan-fisik": "kekerasan fisik",
  "kekerasan-psikis": "kekerasan psikis",
  perundungan: "perundungan (bullying)",
  "kekerasan-seksual": "kekerasan seksual",
  "diskriminasi-intoleransi": "diskriminasi/intoleransi",
  "kebijakan-kekerasan": "kebijakan yang berpotensi menimbulkan kekerasan",
  lainnya: "bentuk kekerasan lain",
};

// --- LLM explainer (BUKAN penentu — cuma merangkai alasan sinyal yg sudah on) -

const EXPLAINER_SYSTEM =
  "Kamu menjelaskan REKOMENDASI aksi yang SUDAH ditentukan sistem berdasarkan sinyal terstruktur. Jangan mengubah rekomendasi, jangan menilai ulang, jangan menambah opsi yang tidak menyala. Tulis sebagai PERTIMBANGAN untuk staf, bukan perintah.";

// Rangkuman sinyal yang ON, untuk diberikan ke explainer (LLM tak lihat narasi mentah).
function describeSignals(s: ActionSignals): string {
  const parts = [`tingkat urgensi ${s.urgencyLevel}`];
  if (s.cederaFisik === true) parts.push("ada indikasi cedera fisik");
  if (s.sudahBerulang === true) parts.push("kejadian disebut berulang");
  if (s.relasiKuasaTimpang === true) parts.push("ada ketimpangan relasi kuasa");
  if (s.adaBahayaLangsung === true) parts.push("ada indikasi bahaya langsung");
  if (s.adaDampak === true) parts.push("ada dampak yang dirasakan korban");
  if (s.violenceType.length)
    parts.push(`jenis: ${s.violenceType.map((v) => VIOLENCE_LABEL[v] ?? v).join(", ")}`);
  return parts.join("; ");
}

async function explainAction(
  pihak: "korban" | "pelaku",
  opsi: { key: SideKey; label: string }[],
  s: ActionSignals
): Promise<string> {
  const labels = opsi.map((o) => o.label).join(", ");
  const fallback = `Berdasarkan sinyal yang tercatat (${describeSignals(
    s
  )}), staf dapat mempertimbangkan untuk ${pihak}: ${labels}. Keputusan tetap di tangan staf.`;
  try {
    const res = await groqChat(
      [
        { role: "system", content: EXPLAINER_SYSTEM },
        {
          role: "user",
          content: `Pihak: ${pihak}\nOpsi yang menyala (jangan tambah/kurangi): ${labels}\nSinyal terstruktur yang aktif: ${describeSignals(
            s
          )}\n\nTulis SATU paragraf singkat sebagai pertimbangan untuk staf BK, menjelaskan alasan tiap opsi mengacu ke sinyal di atas. Gunakan bahasa "dapat mempertimbangkan", bukan perintah.`,
        },
      ],
      "bk",
      false
    );
    if (!res || !res.ok) return fallback;
    const data = await res.json();
    const text = data?.choices?.[0]?.message?.content;
    return typeof text === "string" && text.trim() ? text.trim() : fallback;
  } catch {
    return fallback;
  }
}

// --- Perakitan narasi kasus --------------------------------------------------

export interface SideRecommendation {
  opsi: { key: SideKey; label: string }[];
  alasan: string;
}
export interface UUItem {
  pasal: string;
  kutipan: string;
  alasan: string;
}
export interface CaseRecommendation {
  narasiTindakan: string;
  tataTertib: PolicyRecommendation[];
  undangUndang?: UUItem[]; // KEY ABSEN total kalau UU_RETRIEVAL_ENABLED=false
  korban?: SideRecommendation;
  pelaku?: SideRecommendation;
  cukupData: boolean;
}

export interface CaseInput {
  narrative: string;
  terlaporDeskripsi: string | null;
  kejadianDeskripsi: string | null;
  signals: ActionSignals;
}

// Narasi tindakan — TEMPLATE murni: hedging "menurut penuturan siswa / diduga"
// DIJAMIN kode (bukan LLM) supaya kualifier tak pernah hilang.
function buildNarasiTindakan(
  terlaporDeskripsi: string | null,
  kejadianDeskripsi: string | null,
  violenceType: string[]
): string {
  const who = terlaporDeskripsi?.trim() || "identitas belum jelas";
  const jenis = violenceType.map((v) => VIOLENCE_LABEL[v] ?? v);
  const perbuatan = kejadianDeskripsi?.trim();
  const daftar = [...jenis, ...(perbuatan ? [perbuatan] : [])];
  const isi = daftar.length ? daftar.join("; ") : "tindakan yang belum terklasifikasi";
  return `Menurut penuturan siswa, terlapor (${who}) diduga melakukan: ${isi}.`;
}

async function buildSide(
  pihak: "korban" | "pelaku",
  flags: SideFlags,
  s: ActionSignals
): Promise<SideRecommendation | null> {
  const opsi = (Object.keys(OPSI_LABEL) as SideKey[])
    .filter((k) => flags[k])
    .map((k) => ({ key: k, label: OPSI_LABEL[k] }));
  if (opsi.length === 0) return null;
  return { opsi, alasan: await explainAction(pihak, opsi, s) };
}

export async function buildCaseRecommendation(input: CaseInput): Promise<CaseRecommendation> {
  const { narrative, terlaporDeskripsi, kejadianDeskripsi, signals } = input;
  const rec = computeActionSignals(signals);

  const [tataTertib, korban, pelaku] = await Promise.all([
    recommendArticles(narrative),
    buildSide("korban", rec.korban, signals),
    buildSide("pelaku", rec.pelaku, signals),
  ]);

  const out: CaseRecommendation = {
    narasiTindakan: buildNarasiTindakan(terlaporDeskripsi, kejadianDeskripsi, signals.violenceType),
    tataTertib,
    cukupData: rec.cukupData,
  };
  if (korban) out.korban = korban;
  if (pelaku) out.pelaku = pelaku;
  // Section UU: HANYA di-set kalau flag on → kalau off, key absen dari response.
  if (UU_RETRIEVAL_ENABLED) out.undangUndang = await recommendLaws(narrative);
  return out;
}
