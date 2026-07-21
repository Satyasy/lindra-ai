// ============================================================
// Few-shot Tier 2: transkrip singkat -> JSON ReportDraft.
// Disisipkan ke messages composeReport() sebelum transkrip asli.
// Wajib memuat: >=1 kasus "perundungan" (berulang + relasi kuasa timpang)
// dan >=1 kasus violenceType: [] (obrolan bukan kekerasan).
// ============================================================

import type { ChatMessage } from "../groq-client";
import type { ReportDraft } from "../classify-narrative";

// Tiap contoh: transkrip (user) -> output JSON persis skema (assistant).
const EXAMPLES: { transcript: string; output: ReportDraft }[] = [
  // Contoh 1 — PERUNDUNGAN: berulang ("tiap hari", "udah dari awal semester")
  // + ada relasi kuasa timpang (kakak kelas terhadap adik kelas).
  {
    transcript:
      "user: kakak kelas tuh tiap hari malak uang jajanku, udah dari awal semester\nuser: kalo nggak ngasih aku didorong-dorong sama diketawain rame-rame\nuser: aku kelas 7, mereka kelas 9",
    output: {
      pelapor: { relasiDenganKorban: "korban sendiri" },
      korban: { kelas: "7", jenisKelamin: null },
      terlapor: { perpetratorRole: "siswa", deskripsi: "beberapa kakak kelas 9" },
      kejadian: {
        locationCategory: "dalam-sekolah",
        waktu: "sejak awal semester, berlangsung tiap hari",
        deskripsi: "pemalakan uang jajan disertai dorongan fisik dan diejek beramai-ramai",
      },
      klasifikasi: { violenceType: ["perundungan", "kekerasan-fisik", "kekerasan-psikis"] },
      bukti: { adaBukti: null, deskripsi: null },
      dampak: { deskripsi: null },
      keamanan: { adaBahayaLangsung: null, deskripsi: null },
      cederaFisik: null,
      sudahBerulang: true,
      relasiKuasaTimpang: true,
      urgencyLevel: "tinggi",
      perpetratorRole: "siswa",
      locationCategory: "dalam-sekolah",
      violenceType: ["perundungan", "kekerasan-fisik", "kekerasan-psikis"],
      narrativeSummary:
        "Siswa menyatakan bahwa sejak awal semester ia berulang kali dimintai paksa uang jajannya oleh beberapa kakak kelas, dan ketika menolak ia didorong serta ditertawakan beramai-ramai. Siswa menyatakan dirinya kelas 7 sementara para kakak kelas yang disebut berada di kelas 9.",
    },
  },

  // Contoh 2 — violenceType: [] (bukan soal kekerasan, murni curhat akademik).
  {
    transcript:
      "user: aku stress banget nilai ulanganku jelek terus\nuser: takut dimarahin ortu pas terima rapor nanti",
    output: {
      pelapor: null,
      korban: null,
      terlapor: { perpetratorRole: null, deskripsi: null },
      kejadian: { locationCategory: null, waktu: null, deskripsi: null },
      klasifikasi: { violenceType: [] },
      bukti: { adaBukti: null, deskripsi: null },
      dampak: { deskripsi: "merasa stres dan cemas soal nilai" },
      keamanan: { adaBahayaLangsung: false, deskripsi: null },
      cederaFisik: null,
      sudahBerulang: null,
      relasiKuasaTimpang: null,
      urgencyLevel: "rendah",
      perpetratorRole: null,
      locationCategory: null,
      violenceType: [],
      narrativeSummary:
        "Siswa menyatakan bahwa ia merasa sangat stres karena nilai ulangannya jelek dan khawatir dimarahi orang tuanya saat pembagian rapor.",
    },
  },

  // Contoh 3 — kekerasan-fisik SATU KALI (bukan perundungan: tidak berulang,
  // tanpa relasi kuasa timpang) untuk menunjukkan kontras dengan Contoh 1.
  {
    transcript:
      "user: tadi pas jam kosong aku ditampar temen sekelas gara-gara ribut soal contekan\nuser: baru sekali sih ini, biasanya kita biasa aja",
    output: {
      pelapor: { relasiDenganKorban: "korban sendiri" },
      korban: { kelas: null, jenisKelamin: null },
      terlapor: { perpetratorRole: "siswa", deskripsi: "teman sekelas" },
      kejadian: {
        locationCategory: "dalam-sekolah",
        waktu: "tadi saat jam kosong",
        deskripsi: "ditampar oleh teman sekelas setelah cekcok soal contekan",
      },
      klasifikasi: { violenceType: ["kekerasan-fisik"] },
      bukti: { adaBukti: null, deskripsi: null },
      dampak: { deskripsi: null },
      keamanan: { adaBahayaLangsung: false, deskripsi: null },
      cederaFisik: null,
      sudahBerulang: false,
      relasiKuasaTimpang: false,
      urgencyLevel: "sedang",
      perpetratorRole: "siswa",
      locationCategory: "dalam-sekolah",
      violenceType: ["kekerasan-fisik"],
      narrativeSummary:
        "Siswa menyatakan bahwa saat jam kosong ia ditampar oleh seorang teman sekelas setelah terjadi cekcok mengenai contekan. Siswa menyatakan kejadian ini baru terjadi sekali dan biasanya hubungan mereka baik-baik saja.",
    },
  },

  // Contoh 4 — KESETIAAN pada kata siswa. "nyerobot antri" tetap "menyerobot antrian"
  // (BUKAN "mencuri"/"pemalsuan"/"dibully"); frekuensi TAK disebut → sudahBerulang null
  // & narasi TANPA kata "sekali"/"berulang"; "negur" tetap "menegur" (bukan "membela diri").
  {
    transcript:
      "user: kemarin pas istirahat di kelas, temen sekelasku nyerobot antrian pas mau jajan, aku negur, eh dia malah marah balik terus mukul aku\nuser: sekarang aman sih tapi masih kesel sama takut, aku sendiri yang ngalamin, kelas 8",
    output: {
      pelapor: { relasiDenganKorban: "korban sendiri" },
      korban: { kelas: "8", jenisKelamin: null },
      terlapor: { perpetratorRole: "siswa", deskripsi: "teman sekelas yang menyerobot antrian" },
      kejadian: {
        locationCategory: "dalam-sekolah",
        waktu: "kemarin saat jam istirahat",
        deskripsi: "dipukul oleh teman sekelas setelah menegur temannya yang menyerobot antrian saat hendak jajan",
      },
      klasifikasi: { violenceType: ["kekerasan-fisik"] },
      bukti: { adaBukti: null, deskripsi: null },
      dampak: { deskripsi: "masih merasa kesal dan takut" },
      keamanan: { adaBahayaLangsung: false, deskripsi: "sekarang merasa aman" },
      cederaFisik: null,
      sudahBerulang: null,
      relasiKuasaTimpang: null,
      urgencyLevel: "sedang",
      perpetratorRole: "siswa",
      locationCategory: "dalam-sekolah",
      violenceType: ["kekerasan-fisik"],
      narrativeSummary:
        "Siswa menyatakan bahwa kemarin saat jam istirahat di kelas, seorang teman sekelasnya menyerobot antrian ketika hendak jajan. Siswa menegur temannya, tetapi temannya justru marah dan memukulnya. Siswa menyatakan sekarang merasa aman namun masih kesal dan takut, dan bahwa ia sendiri yang mengalaminya.",
    },
  },

  // Contoh 5 — KOREKSI/RALAT: mula-mula "dipukul" lalu diralat "hampir dipukul, dicegah".
  // Pakai versi TERAKHIR: cederaFisik=false, narasi "hampir ... tetapi dicegah" (BUKAN
  // "dipukul"), dan jenis geser ke kekerasan-psikis (ancaman/intimidasi, tanpa kontak fisik).
  {
    transcript:
      "user: kemarin aku dipukul\nuser: kan aku lagi antri jajan di kantin, temenku nyerobot, aku tegur, dia malah marah mau mukul aku\nuser: iya hampir dipukul, tapi keburu dicegah temennya jadi nggak sampai kena\nuser: sekarang aman sih, tapi aku takut ketemu dia lagi, aku sendiri yang ngalamin",
    output: {
      pelapor: { relasiDenganKorban: "korban sendiri" },
      korban: { kelas: null, jenisKelamin: null },
      terlapor: { perpetratorRole: "siswa", deskripsi: "teman yang menyerobot antrian" },
      kejadian: {
        locationCategory: "dalam-sekolah",
        waktu: "kemarin saat antri jajan di kantin",
        deskripsi: "hampir dipukul oleh temannya setelah menegur temannya yang menyerobot antrian, tetapi keburu dicegah temannya sehingga tidak sampai terkena",
      },
      klasifikasi: { violenceType: ["kekerasan-psikis"] },
      bukti: { adaBukti: null, deskripsi: null },
      dampak: { deskripsi: "takut bertemu temannya lagi" },
      keamanan: { adaBahayaLangsung: false, deskripsi: "sekarang merasa aman" },
      cederaFisik: false,
      sudahBerulang: null,
      relasiKuasaTimpang: null,
      urgencyLevel: "sedang",
      perpetratorRole: "siswa",
      locationCategory: "dalam-sekolah",
      violenceType: ["kekerasan-psikis"],
      narrativeSummary:
        "Siswa menyatakan bahwa kemarin saat antri jajan di kantin, seorang temannya menyerobot antrian. Siswa menegur temannya, tetapi temannya marah dan nyaris memukulnya; menurut siswa pukulan itu keburu dicegah oleh teman yang lain sehingga tidak sampai terkena. Siswa menyatakan sekarang merasa aman namun takut bertemu temannya lagi, dan bahwa ia sendiri yang mengalaminya.",
    },
  },
];

export const TIER2_FEWSHOT: ChatMessage[] = EXAMPLES.flatMap(({ transcript, output }) => [
  { role: "user" as const, content: transcript },
  { role: "assistant" as const, content: JSON.stringify(output) },
]);
