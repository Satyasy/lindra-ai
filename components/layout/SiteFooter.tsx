import Link from "next/link";
import Image from "next/image";
import { Logo } from "@/components/Logo";

// Footer landing — LATAR TERANG supaya logo mitra (berwarna) terlihat jelas.
// Teks --ink/--text-soft, garis pemisah --border (DESIGN.md §2, warna dari token).
// §1.9: link /chat HANYA saat demo (di-gate NEXT_PUBLIC_DEMO_MODE) — di produksi
// item "Buka chat" tidak ada di DOM. Item lain non-chat.
const demo = process.env.NEXT_PUBLIC_DEMO_MODE === "true";

const LAYANAN = [
  { label: "Cara kerja", href: "/#cara-kerja" },
  { label: "Kerahasiaan", href: "/#kerahasiaan" },
  ...(demo ? [{ label: "Buka chat", href: "/chat" }] : []),
  { label: "Lacak laporanmu", href: "/lacak" },
];

const SUMBER_DAYA = [
  { label: "FAQ", href: "/#faq" },
  { label: "Hak pelapor", href: "#" },
  { label: "Kebijakan privasi", href: "#" },
  { label: "Kontak SAPA 129", href: "tel:129" },
];

const UNTUK_PETUGAS = [
  { label: "Masuk petugas", href: "/bk/login" },
  { label: "Panduan psikolog", href: "#" },
  { label: "Panduan legal", href: "#" },
];

// Link internal → next/link (client nav); tel:/# → <a> biasa. min-h-11 = target ≥44px.
function FooterLink({ href, label }: { href: string; label: string }) {
  const cls =
    "inline-flex min-h-11 items-center text-sm text-text-soft transition-colors hover:text-ink";
  return href.startsWith("/") ? (
    <Link href={href} className={cls}>
      {label}
    </Link>
  ) : (
    <a href={href} className={cls}>
      {label}
    </a>
  );
}

function FooterColumn({
  title,
  links,
}: {
  title: string;
  links: { label: string; href: string }[];
}) {
  return (
    <div>
      <h3 className="mb-1 text-sm font-semibold text-ink">{title}</h3>
      <ul className="flex flex-col">
        {links.map((l) => (
          <li key={l.label + l.href}>
            <FooterLink href={l.href} label={l.label} />
          </li>
        ))}
      </ul>
    </div>
  );
}

export function SiteFooter() {
  return (
    <footer className="border-t border-border">
      <div className="mx-auto max-w-6xl px-6 py-16 sm:py-20">
        {/* Baris utama: brand + 3 kolom nav berdampingan (stack di layar sempit) */}
        <div className="grid grid-cols-1 gap-x-10 gap-y-12 sm:grid-cols-2 md:grid-cols-[1.5fr_1fr_1fr_1fr]">
          {/* Brand */}
          <div>
            <Logo />
            <p className="mt-4 max-w-[30ch] leading-relaxed text-text-soft">
              Menemani penyintas kekerasan pelan-pelan, sesuai tempomu.
            </p>

            {/* Logo mitra — 1 & 2 sejajar (tinggi seragam), 3 di bawahnya (kiri).
                Latar terang → logo apa adanya. object-contain + max-w → ⊆ kolom. */}
            <div className="mt-8">
              <div className="flex flex-wrap items-center gap-6">
                <Image
                  src="/logo-footer1.png"
                  alt="Merkle Innovation"
                  width={2242}
                  height={809}
                  className="h-10 w-auto max-w-full object-contain"
                />
                <Image
                  src="/logo-footer2.png"
                  alt="LKS SMK"
                  width={1600}
                  height={1877}
                  className="h-16 w-auto max-w-full object-contain"
                />
              </div>
              <Image
                src="/logo-footer3.png"
                alt="SMK Telkom Sidoarjo"
                width={488}
                height={144}
                className="mt-6 h-10 w-auto max-w-full object-contain"
              />
            </div>
          </div>

          <FooterColumn title="Layanan" links={LAYANAN} />
          <FooterColumn title="Sumber daya" links={SUMBER_DAYA} />
          <FooterColumn title="Untuk petugas" links={UNTUK_PETUGAS} />
        </div>

        {/* Baris bawah: kredit kiri + tim kanan */}
        <div className="mt-14 flex flex-col gap-2 border-t border-border pt-6 text-sm text-text-soft sm:flex-row sm:items-center sm:justify-between">
          <p>© 2026 Lindra — layanan independen, bukan pengganti bantuan profesional.</p>
          <p>Dibuat dengan hati oleh Tim Jawa Timur · LKS AI Nasional 2026</p>
        </div>
      </div>
    </footer>
  );
}
