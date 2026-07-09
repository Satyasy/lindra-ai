import Link from "next/link";
import { ArrowRight, ChevronDown, Lock } from "lucide-react";
import { PublicNavbar } from "@/components/nav/PublicNavbar";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { RevealOnScroll } from "@/components/RevealOnScroll";
import {
  HeroWindow,
  BirdsMotif,
  LeafSpray,
  TipDoodle,
  RoutingScene,
  SpotStory,
  SpotCompose,
  SpotConsent,
  SpotRoute,
  SpotLock,
  SpotControl,
  SpotProtected,
  SpotExit,
} from "@/components/illustrations";

// Landing publik (sekolah/orang tua/juri). DESIGN.md §5.1 + §1.9:
// "Gambar yang berbicara" — copy ringkas + ilustrasi kustom membawa makna.
// TIDAK ada tautan/handler ke /chat kecuali di HERO saat NEXT_PUBLIC_DEMO_MODE==='true'.
const demo = process.env.NEXT_PUBLIC_DEMO_MODE === "true";

const FLOW = [
  { spot: SpotStory, title: "Ceritakan sekali", line: "Dengan caramu — sebanyak atau sesedikit yang kamu mau." },
  { spot: SpotCompose, title: "Lindra bantu susun", line: "Ceritamu dirapikan jadi laporan yang jelas." },
  { spot: SpotConsent, title: "Kamu putuskan kirim", line: "Anonim atau dengan nama — kamu yang pilih." },
  { spot: SpotRoute, title: "Dirutekan dengan tepat", line: "Aturan yang bisa diaudit menentukannya, bukan AI." },
];

const RULES = [
  { spot: SpotLock, title: "Terenkripsi", line: "Identitas & isi cerita disimpan aman." },
  { spot: SpotControl, title: "Kamu pegang kendali", line: "Bisa berhenti kapan saja." },
  { spot: SpotProtected, title: "Tak disebar tanpa alasan", line: "Hanya sampai ke pihak yang berwenang." },
  { spot: SpotExit, title: "Selalu ada jalan keluar", line: "Lewat Satgas & SAPA 129 — tak cuma sekolah." },
];

const FAQ = [
  { q: "Apakah cerita saya rahasia?", a: "Ya — isi & identitasmu disimpan terenkripsi, dan kamu bisa mengirim tanpa nama." },
  { q: "Apakah sekolah otomatis tahu?", a: "Tidak. Tak ada yang dikirim sebelum kamu setuju; bila sekolah terlibat, laporanmu dirutekan ke jalur luar sekolah." },
  { q: "Haruskah pakai nama asli?", a: "Tidak — kamu bisa mengirim sepenuhnya anonim." },
  { q: "Siapa menentukan laporan dibawa ke mana?", a: "Bukan AI. Aturan tetap yang bisa diaudit menentukannya berdasarkan isi laporan." },
  { q: "Apakah ini pengganti layanan darurat?", a: "Bukan. Kalau kamu dalam bahaya sekarang, hubungi Polisi 110, SAPA 129, atau Ambulans 119." },
];

export default function LandingPage() {
  return (
    <>
      <PublicNavbar />
      {/* Landing publik = bukan halaman siswa → tanpa QuickExit (DESIGN.md §4). */}
      <RevealOnScroll />

      <main id="top">
        {/* 1 — HERO (satu "first view" penuh: min-h-svh, konten center vertikal) */}
        <section className="mx-auto grid min-h-svh max-w-6xl content-center items-center gap-12 px-6 pt-28 pb-16 sm:pt-32 min-[900px]:grid-cols-[1.05fr_0.95fr] min-[900px]:pb-24">
          <div className="reveal">
            <p className="mb-5 flex items-center gap-3 text-sm font-semibold uppercase tracking-[0.16em] text-primary-ink">
              <span aria-hidden className="h-0.5 w-8 rounded-full bg-warm-deep" />
              Kamu tidak sendirian
            </p>
            <h1 className="mb-6 max-w-[15ch] text-ink" style={{ fontSize: "var(--t-hero)" }}>
              Kamu tidak harus kuat dulu untuk{" "}
              <span className="text-primary-ink">mulai bicara.</span>
            </h1>
            <p className="mb-8 max-w-[42ch] text-lg leading-relaxed text-text-soft">
              Lindra menemanimu menyusun cerita jadi laporan yang bisa
              ditindaklanjuti — pelan-pelan, sesuai tempomu.
            </p>
            <div className="flex flex-wrap items-center gap-3">
              {/* CTA di-gate: entri /chat HANYA saat demo. Di produksi primary jadi
                  anchor non-chat (§1.9 — landing publik tak boleh nge-link ke /chat). */}
              {demo && (
                <Link
                  href="/chat"
                  className="inline-flex min-h-12 items-center gap-2 rounded-full bg-primary px-7 font-semibold text-ink transition-colors hover:bg-primary-deep"
                >
                  Buka chat
                  <ArrowRight className="size-4" strokeWidth={2.5} aria-hidden />
                </Link>
              )}
              <a
                href="#cara-kerja"
                className={
                  demo
                    ? "inline-flex min-h-12 items-center rounded-full border-2 border-border px-7 font-semibold text-primary-ink transition-colors hover:bg-surface-alt"
                    : "inline-flex min-h-12 items-center gap-2 rounded-full bg-primary px-7 font-semibold text-ink transition-colors hover:bg-primary-deep"
                }
              >
                Pelajari cara kerja
                {!demo && <ArrowRight className="size-4" strokeWidth={2.5} aria-hidden />}
              </a>
            </div>
            <p className="mt-6 flex items-center gap-2 text-sm text-text-soft">
              <Lock className="size-4 shrink-0 text-primary-ink" strokeWidth={2} aria-hidden />
              Percakapan ini dengan AI. Tidak ada yang dibagikan tanpa izinmu.
            </p>
          </div>

          {/* Hero visual — jendela terbuka menghadap harapan + kartu chat mengambang.
              Mobile: gambar di ATAS teks (order-first) & lebih kecil agar H1 tak terdorong
              ke bawah layar. Desktop (>=900px) kembali ke kolom kanan, ukuran penuh. */}
          <div className="reveal order-first min-[900px]:order-none" style={{ transitionDelay: "80ms" }}>
            <HeroWindow className="max-w-[15rem] min-[900px]:max-w-[440px]" />
          </div>
        </section>

        {/* 2 — BAND emosional (momen: tinggi lega, teks besar, aksen daun di sudut) */}
        <section className="relative overflow-hidden bg-primary-bright px-6 py-28 text-center sm:py-40">
          <BirdsMotif className="pointer-events-none absolute left-4 top-8 hidden w-36 opacity-70 sm:block" />
          <LeafSpray className="pointer-events-none absolute -bottom-6 right-4 hidden w-40 opacity-70 sm:block" />
          <LeafSpray className="pointer-events-none absolute -bottom-6 -left-8 hidden w-32 -scale-x-100 opacity-50 sm:block" />
          <p className="reveal relative mx-auto max-w-[22ch] font-bold leading-[1.08] tracking-[-0.02em] text-ink text-[clamp(2rem,5.2vw,3.4rem)]">
            Ini bukan salahmu. Setiap cerita berhak{" "}
            <em className="font-bold text-ink underline decoration-[var(--ink)]/40 decoration-2 underline-offset-[6px]">
              didengar
            </em>
            .
          </p>
        </section>

        {/* 3 — CARA KERJA (4 kartu ber-ilustrasi) */}
        <section id="cara-kerja" className="mx-auto max-w-6xl scroll-mt-24 px-6 py-20 sm:py-24">
          <div className="reveal mb-12 max-w-[34ch]">
            <p className="mb-3 text-sm font-semibold tracking-wide text-primary-ink">Cara kerja</p>
            <h2 className="text-ink" style={{ fontSize: "var(--t-h1)" }}>
              Empat langkah — kamu yang pegang kendali.
            </h2>
          </div>
          <ol className="grid gap-5 sm:grid-cols-2 min-[900px]:grid-cols-4">
            {FLOW.map(({ spot: Spot, title, line }, i) => (
              <li
                key={title}
                className="reveal flex h-full flex-col rounded-[var(--radius-lg)] border border-border bg-surface p-6 shadow-[var(--shadow-soft)]"
                style={{ transitionDelay: `${i * 70}ms` }}
              >
                <div className="flex items-start justify-between">
                  <Spot className="size-14" />
                  <span className="grid size-8 place-items-center rounded-full bg-warm-soft text-sm font-bold tabular-nums text-ink">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                </div>
                <h3 className="mt-4 text-ink" style={{ fontSize: "var(--t-h2)" }}>
                  {title}
                </h3>
                <p className="mt-1 leading-relaxed text-text-soft">{line}</p>
              </li>
            ))}
          </ol>
        </section>

        {/* 4 — KERAHASIAAN (4 poin) — latar hangat (cream) memecah monoton teal */}
        <section id="kerahasiaan" className="scroll-mt-24 bg-surface-warm px-6 py-20 sm:py-24">
          <div className="mx-auto max-w-6xl">
            <div className="reveal mb-12 max-w-[34ch]">
              <p className="mb-3 text-sm font-semibold tracking-wide text-primary-ink">Kerahasiaan</p>
              <h2 className="text-ink" style={{ fontSize: "var(--t-h1)" }}>
                Dibangun supaya kamu bisa mempercayainya.
              </h2>
            </div>
            <div className="grid gap-x-10 gap-y-10 min-[640px]:grid-cols-2">
              {RULES.map(({ spot: Spot, title, line }, i) => (
                <div key={title} className="reveal flex items-start gap-4" style={{ transitionDelay: `${i * 70}ms` }}>
                  <Spot className="size-14 shrink-0" />
                  <div>
                    <h3 className="text-ink" style={{ fontSize: "var(--t-h2)" }}>
                      {title}
                    </h3>
                    <p className="mt-1 leading-relaxed text-text-soft">{line}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* 5 — RUTE ("gambar yang berbicara": RoutingScene) */}
        <section id="untuk-sekolah" className="mx-auto max-w-6xl scroll-mt-24 px-6 py-20 sm:py-24">
          <div className="reveal mx-auto mb-10 max-w-[42ch] text-center">
            <p className="mb-3 text-sm font-semibold tracking-wide text-primary-ink">
              Satu pintu masuk
            </p>
            <h2 className="text-ink" style={{ fontSize: "var(--t-h1)" }}>
              Dirutekan ke penanganan yang tepat.
            </h2>
            <p className="mt-4 leading-relaxed text-text-soft">
              Cerita siswa dipilah aturan yang bisa diaudit, lalu diteruskan ke jalur yang sudah ada.
            </p>
          </div>
          <div className="reveal mx-auto max-w-[680px] rounded-[var(--radius-lg)] border border-border bg-surface p-6 shadow-[var(--shadow-soft)] sm:p-10">
            <RoutingScene />
          </div>
        </section>

        {/* 6 — FAQ */}
        <section id="faq" className="scroll-mt-24 bg-surface-alt px-6 py-20 sm:py-24">
          <div className="mx-auto max-w-3xl">
            <div className="reveal mb-10 flex items-start justify-between gap-4">
              <div>
                <p className="mb-3 text-sm font-semibold tracking-wide text-primary-ink">FAQ</p>
                <h2 className="text-ink" style={{ fontSize: "var(--t-h1)" }}>
                  Pertanyaan yang sering muncul.
                </h2>
              </div>
              <TipDoodle className="hidden w-16 shrink-0 sm:block" />
            </div>

            <div className="reveal flex flex-col gap-3">
              {FAQ.map(({ q, a }) => (
                <details
                  key={q}
                  name="faq"
                  className="group rounded-[var(--radius-md)] border border-border bg-surface"
                >
                  <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-4 px-5 py-4 font-semibold text-ink [&::-webkit-details-marker]:hidden">
                    {q}
                    <ChevronDown className="faq-chevron size-5 shrink-0 text-primary-ink" strokeWidth={2} aria-hidden />
                  </summary>
                  <p className="px-5 pb-5 leading-relaxed text-text-soft">{a}</p>
                </details>
              ))}
            </div>
          </div>
        </section>
      </main>

      <SiteFooter />
    </>
  );
}
