import Link from "next/link";
import {
  ChevronDown,
  DoorOpen,
  EyeOff,
  FileText,
  Lock,
  MessageCircle,
  Phone,
  Route,
  Send,
  ShieldCheck,
  Users,
} from "lucide-react";
import { PublicNavbar } from "@/components/nav/PublicNavbar";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { RevealOnScroll } from "@/components/RevealOnScroll";

// Landing publik (sekolah/orang tua/juri). DESIGN.md §5.1 + §1.9:
// TIDAK ada tautan/handler ke /chat di konten mana pun — satu-satunya pintasan
// chat ada di PublicNavbar dan hanya saat NEXT_PUBLIC_DEMO_MODE==='true'.

const FLOW = [
  {
    icon: MessageCircle,
    title: "Ceritakan sekali",
    desc: "Dengan caramu sendiri, sebanyak atau sesedikit yang kamu mau. Tidak ada formulir kaku, tidak ada pertanyaan menyalahkan.",
  },
  {
    icon: FileText,
    title: "Lindra bantu susun",
    desc: "Ceritamu dirapikan jadi laporan yang jelas. Kamu bisa membacanya ulang sebelum apa pun terjadi.",
  },
  {
    icon: Send,
    title: "Kamu putuskan kirim",
    desc: "Anonim atau dengan nama — kamu yang pilih. Tidak ada yang dikirim sebelum kamu setuju.",
  },
  {
    icon: Route,
    title: "Dirutekan ke bantuan yang tepat",
    desc: "Aturan yang bisa diaudit menentukan tujuannya — bukan keputusan AI. Bila pelakunya pihak sekolah, laporan langsung ke jalur luar sekolah.",
  },
];

const RULES = [
  {
    icon: Lock,
    title: "Terenkripsi",
    desc: "Identitas dan isi cerita disimpan terenkripsi, dengan jejak audit yang tidak bisa diubah diam-diam.",
  },
  {
    icon: ShieldCheck,
    title: "Kamu pegang kendali",
    desc: "Bisa berhenti kapan saja. Kamu yang memutuskan dikirim anonim, dengan nama, atau tidak dikirim sama sekali.",
  },
  {
    icon: EyeOff,
    title: "Tidak disebar ke sekolah tanpa alasan",
    desc: "Laporan hanya sampai ke pihak yang memang berwenang menanganinya — bukan disebar begitu saja.",
  },
  {
    icon: DoorOpen,
    title: "Jalur keluar tak sepenuhnya bergantung sekolah",
    desc: "Kalau pihak sekolah yang terlibat, ceritamu tetap punya jalan keluar lewat Satgas dan SAPA 129.",
  },
];

const ROLES = [
  {
    icon: Users,
    title: "TPPK sekolah",
    desc: "Tim Pencegahan dan Penanganan Kekerasan di sekolah — penanganan kasus yang tidak melibatkan pihak sekolah.",
  },
  {
    icon: ShieldCheck,
    title: "Satgas daerah",
    desc: "Jalur luar sekolah untuk kasus yang melibatkan guru, staf, atau relasi kuasa di dalam sekolah.",
  },
  {
    icon: Phone,
    title: "SAPA 129",
    desc: "Hotline nasional perlindungan perempuan dan anak — jaring pengaman saat keadaan mendesak.",
  },
];

const FAQ = [
  {
    q: "Apakah cerita saya benar-benar rahasia?",
    a: "Ya. Isi cerita dan identitasmu disimpan terenkripsi. Kamu bisa mengirim tanpa nama, dan tidak ada yang bisa membacanya kecuali pihak yang berwenang menangani laporanmu.",
  },
  {
    q: "Apakah sekolah otomatis tahu kalau saya bercerita?",
    a: "Tidak. Tidak ada yang dikirim sebelum kamu menyetujuinya. Dan bila yang terlibat adalah pihak sekolah, laporanmu justru dirutekan ke jalur luar sekolah, bukan ke sekolahmu.",
  },
  {
    q: "Haruskah saya memakai nama asli?",
    a: "Tidak harus. Kamu bisa mengirim laporan sepenuhnya anonim. Nama dan kontak hanya diisi kalau kamu sendiri yang memilih untuk mengisinya.",
  },
  {
    q: "Siapa yang menentukan laporan saya dibawa ke mana?",
    a: "Bukan AI. Rute ditentukan aturan tetap yang bisa diaudit berdasarkan isi laporan. AI hanya membantu menyusun cerita — ia tidak pernah menyimpulkan siapa yang salah.",
  },
  {
    q: "Apakah ini menggantikan layanan darurat?",
    a: "Bukan. Kalau kamu dalam bahaya sekarang, hubungi Polisi 110, SAPA 129, atau Ambulans 119. Layanan ini membantumu bercerita dan sampai ke pendampingan, bukan merespons keadaan darurat seketika.",
  },
];

export default function LandingPage() {
  return (
    <>
      <PublicNavbar />
      <RevealOnScroll />

      <main id="top">
        {/* 1 — HERO */}
        <section className="mx-auto grid max-w-6xl items-center gap-12 px-6 pt-28 pb-16 sm:pt-32 min-[900px]:grid-cols-[1.05fr_0.95fr] min-[900px]:pb-24">
          <div className="reveal">
            <p className="mb-4 text-sm font-semibold tracking-wide text-primary-ink">
              Kamu tidak sendirian
            </p>
            <h1
              className="mb-6 max-w-[16ch] text-ink"
              style={{ fontSize: "var(--t-hero)" }}
            >
              Ada cerita yang tidak tahu harus dibawa ke mana.
            </h1>
            <p className="mb-8 max-w-[46ch] text-lg leading-relaxed text-text-soft">
              Lindra membantu siswa menceritakan apa yang terjadi, menyusunnya jadi laporan yang
              jelas, lalu merutekannya ke bantuan formal yang tepat — dengan kamu yang pegang
              kendali di setiap langkah.
            </p>
            <div className="flex flex-wrap gap-3">
              <a
                href="#cara-kerja"
                className="flex min-h-12 items-center rounded-full bg-primary px-6 font-semibold text-ink transition-colors hover:bg-primary-deep"
              >
                Pelajari cara kerja
              </a>
              <a
                href="#untuk-sekolah"
                className="flex min-h-12 items-center rounded-full border-2 border-border px-6 font-semibold text-ink transition-colors hover:bg-surface-alt"
              >
                Untuk sekolah
              </a>
            </div>
          </div>

          {/* Ilustrasi hangat + kartu preview mengambang */}
          <div className="reveal relative mx-auto w-full max-w-[460px]" style={{ transitionDelay: "80ms" }}>
            <svg viewBox="0 0 460 420" className="w-full" role="img" aria-label="Ilustrasi ruang aman untuk bercerita dan didengar">
              <ellipse cx="240" cy="212" rx="190" ry="178" fill="var(--primary-soft)" />
              <ellipse cx="338" cy="118" rx="86" ry="86" fill="var(--warm-soft)" opacity="0.7" />
              <rect x="86" y="150" width="230" height="176" rx="28" fill="var(--surface)" stroke="var(--border)" strokeWidth="2" />
              <g>
                <rect x="118" y="182" width="156" height="74" rx="22" fill="var(--primary)" />
                <path d="M150 256 v28 l28 -28 z" fill="var(--primary)" />
                <line x1="140" y1="208" x2="252" y2="208" stroke="var(--ink)" strokeWidth="6" strokeLinecap="round" opacity="0.55" />
                <line x1="140" y1="230" x2="224" y2="230" stroke="var(--ink)" strokeWidth="6" strokeLinecap="round" opacity="0.38" />
              </g>
              <g transform="translate(306 238)">
                <path d="M0 -36 L32 -23 L32 6 C32 28 17 43 0 51 C-17 43 -32 28 -32 6 L-32 -23 Z" fill="var(--primary-deep)" />
                <path d="M-14 5 l10 11 l19 -24" fill="none" stroke="var(--surface)" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
              </g>
              <circle cx="108" cy="112" r="8" fill="var(--warm)" />
              <circle cx="384" cy="306" r="10" fill="var(--primary-deep)" />
            </svg>

            <div className="float-card absolute -bottom-2 -left-2 max-w-[248px] rounded-[var(--radius-lg)] border border-border bg-surface p-4 shadow-[var(--shadow-lift)] sm:-left-4">
              <div className="mb-2 flex items-center gap-2">
                <span className="grid size-8 place-items-center rounded-full bg-primary-soft">
                  <ShieldCheck className="size-4 text-primary-ink" strokeWidth={2} aria-hidden />
                </span>
                <span className="text-sm font-semibold text-ink">Catatan Harian</span>
              </div>
              <p className="rounded-[var(--radius-md)] rounded-bl-[var(--radius-sm)] bg-primary px-4 py-2 text-sm leading-relaxed text-ink">
                Kamu yang pegang kendali — bisa berhenti kapan saja.
              </p>
            </div>
          </div>
        </section>

        {/* 2 — BAND emosional full-bleed */}
        <section className="bg-primary-bright px-6 py-16 sm:py-20">
          <p className="reveal mx-auto max-w-[24ch] text-center font-bold leading-tight tracking-[-0.02em] text-ink text-[clamp(1.7rem,4vw,2.5rem)]">
            Ini bukan salahmu. Setiap cerita berhak{" "}
            <em className="font-bold text-ink underline decoration-[var(--ink)]/40 decoration-2 underline-offset-4">
              didengar
            </em>{" "}
            dan dirutekan ke bantuan yang tepat.
          </p>
        </section>

        {/* 3 — CARA KERJA (editorial sticky-head + ledger) */}
        <section id="cara-kerja" className="mx-auto max-w-6xl scroll-mt-24 px-6 py-20 sm:py-24">
          <div className="grid gap-10 min-[900px]:grid-cols-[320px_1fr]">
            <div className="reveal h-max min-[900px]:sticky min-[900px]:top-28">
              <p className="mb-3 text-sm font-semibold tracking-wide text-primary-ink">Cara kerja</p>
              <h2 className="max-w-[14ch] text-ink" style={{ fontSize: "var(--t-h1)" }}>
                Empat langkah, kamu yang pegang kendali.
              </h2>
              <p className="mt-4 max-w-[38ch] leading-relaxed text-text-soft">
                Tidak ada yang bergerak tanpa persetujuanmu. Kamu bisa berhenti, membaca ulang, atau
                melanjutkan kapan saja.
              </p>
            </div>

            <ol className="flex flex-col">
              {FLOW.map(({ icon: Icon, title, desc }, i) => (
                <li
                  key={title}
                  className="reveal flex gap-5 border-l-2 border-border pb-10 pl-6 last:pb-0"
                  style={{ transitionDelay: `${i * 80}ms` }}
                >
                  <span className="grid size-11 shrink-0 place-items-center rounded-full bg-primary-soft">
                    <Icon className="size-5 text-primary-ink" strokeWidth={2} aria-hidden />
                  </span>
                  <div>
                    <div className="mb-1 flex items-baseline gap-3">
                      <span className="text-sm font-semibold text-text-muted tabular-nums">
                        {String(i + 1).padStart(2, "0")}
                      </span>
                      <h3 className="text-ink" style={{ fontSize: "var(--t-h2)" }}>
                        {title}
                      </h3>
                    </div>
                    <p className="max-w-[52ch] leading-relaxed text-text-soft">{desc}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* 4 — KERAHASIAAN (rule-list 2 kolom) */}
        <section id="kerahasiaan" className="scroll-mt-24 bg-surface-alt px-6 py-20 sm:py-24">
          <div className="mx-auto max-w-6xl">
            <div className="reveal mb-12 max-w-[40ch]">
              <p className="mb-3 text-sm font-semibold tracking-wide text-primary-ink">Kerahasiaan</p>
              <h2 className="text-ink" style={{ fontSize: "var(--t-h1)" }}>
                Dibangun supaya kamu bisa mempercayainya.
              </h2>
            </div>
            <div className="grid gap-x-10 gap-y-8 min-[640px]:grid-cols-2">
              {RULES.map(({ icon: Icon, title, desc }, i) => (
                <div
                  key={title}
                  className="reveal flex gap-4"
                  style={{ transitionDelay: `${i * 80}ms` }}
                >
                  <span className="grid size-11 shrink-0 place-items-center rounded-[var(--radius-md)] bg-surface">
                    <Icon className="size-5 text-primary-ink" strokeWidth={2} aria-hidden />
                  </span>
                  <div>
                    <h3 className="mb-1 text-ink" style={{ fontSize: "var(--t-h2)" }}>
                      {title}
                    </h3>
                    <p className="max-w-[46ch] leading-relaxed text-text-soft">{desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* 5 — UNTUK SEKOLAH & ORANG TUA */}
        <section id="untuk-sekolah" className="mx-auto max-w-6xl scroll-mt-24 px-6 py-20 sm:py-24">
          <div className="reveal mb-12 max-w-[46ch]">
            <p className="mb-3 text-sm font-semibold tracking-wide text-primary-ink">
              Untuk sekolah &amp; orang tua
            </p>
            <h2 className="text-ink" style={{ fontSize: "var(--t-h1)" }}>
              Satu pintu masuk, dirutekan ke penanganan yang tepat.
            </h2>
            <p className="mt-4 leading-relaxed text-text-soft">
              Lindra tidak menggantikan penanganan resmi — ia menghubungkan cerita siswa ke jalur
              yang sudah ada, dengan aturan rute yang bisa diaudit.
            </p>
          </div>

          <div className="mb-10 grid gap-5 min-[640px]:grid-cols-3">
            {ROLES.map(({ icon: Icon, title, desc }, i) => (
              <div
                key={title}
                className="reveal rounded-[var(--radius-lg)] border border-border bg-surface p-6 shadow-[var(--shadow-soft)]"
                style={{ transitionDelay: `${i * 80}ms` }}
              >
                <span className="mb-4 grid size-11 place-items-center rounded-[var(--radius-md)] bg-primary-soft">
                  <Icon className="size-5 text-primary-ink" strokeWidth={2} aria-hidden />
                </span>
                <h3 className="mb-2 text-ink" style={{ fontSize: "var(--t-h2)" }}>
                  {title}
                </h3>
                <p className="leading-relaxed text-text-soft">{desc}</p>
              </div>
            ))}
          </div>

          <div className="reveal">
            <Link
              href="/bk/login"
              className="inline-flex min-h-12 items-center rounded-full border-2 border-border px-6 font-semibold text-ink transition-colors hover:bg-surface-alt"
            >
              Masuk BK/Satgas
            </Link>
          </div>
        </section>

        {/* 6 — FAQ (accordion native <details>, chevron rotate) */}
        <section id="faq" className="scroll-mt-24 bg-surface-alt px-6 py-20 sm:py-24">
          <div className="mx-auto max-w-3xl">
            <div className="reveal mb-10">
              <p className="mb-3 text-sm font-semibold tracking-wide text-primary-ink">FAQ</p>
              <h2 className="text-ink" style={{ fontSize: "var(--t-h1)" }}>
                Pertanyaan yang sering muncul.
              </h2>
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
                    <ChevronDown
                      className="faq-chevron size-5 shrink-0 text-primary-ink"
                      strokeWidth={2}
                      aria-hidden
                    />
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
