import Link from "next/link";
import Image from "next/image";

// Footer editorial (à la complicated.life, tema Lindra). Latar --ink, teks terang
// via token --on-ink / --on-ink-strong (DESIGN.md §2 + aturan keras: warna dari token).
// DILARANG link /chat di sini, kondisi apa pun (§1.9). "Kanal bantuan" = teks
// informatif, bukan tautan chat.
const CARA_KERJA = [
  { label: "Cara kerja", href: "/#cara-kerja" },
  { label: "Kerahasiaan", href: "/#kerahasiaan" },
  { label: "FAQ", href: "/#faq" },
];

export function SiteFooter() {
  return (
    <footer className="bg-ink text-on-ink">
      <div className="mx-auto max-w-6xl px-6 py-16 sm:py-20">
        {/* Baris editorial atas — lapang, banyak whitespace */}
        <div className="flex flex-col gap-4 border-b border-[color-mix(in_srgb,var(--on-ink)_16%,transparent)] pb-12">
          <p className="text-[clamp(2rem,4vw,3rem)] font-extrabold leading-none tracking-[-0.02em] text-on-ink-strong">
            Lindra
          </p>
          <p className="max-w-[42ch] leading-relaxed text-on-ink">
            Satu pintu masuk untuk cerita yang tidak tahu harus dibawa ke mana — supaya sampai ke
            bantuan yang tepat, dengan caramu.
          </p>

          {/* Logo mitra/pendukung — 1 & 2 sejajar (tinggi seragam), 3 di tengah di bawahnya.
              object-contain + max-w-full → tak melebihi lebar kolom footer, rapi di mobile. */}
          <div className="mt-6">
            <div className="flex flex-wrap items-center gap-8">
              <Image
                src="/logo-footer1.png"
                alt="Logo mitra Lindra"
                width={2242}
                height={809}
                className="h-11 w-auto max-w-full object-contain sm:h-14"
              />
              <Image
                src="/logo-footer2.png"
                alt="Logo mitra Lindra"
                width={1600}
                height={1877}
                className="h-11 w-auto max-w-full object-contain sm:h-14"
              />
            </div>
            <Image
              src="/logo-footer3.png"
              alt="Logo pendukung Lindra"
              width={488}
              height={144}
              className="mx-auto mt-6 h-9 w-auto max-w-full object-contain sm:h-10"
            />
          </div>
        </div>

        {/* Grid 4 kolom → 2 → 1 di layar sempit */}
        <div className="grid grid-cols-1 gap-10 py-12 min-[520px]:grid-cols-2 min-[760px]:grid-cols-4">
          <div>
            <h3 className="mb-3 text-sm font-semibold text-on-ink-strong">Lindra</h3>
            <p className="text-sm leading-relaxed text-on-ink">
              Pelaporan kekerasan sekolah yang trauma-informed — sebuah layanan independen.
            </p>
          </div>

          <div>
            <h3 className="mb-3 text-sm font-semibold text-on-ink-strong">Cara kerja</h3>
            <ul className="flex flex-col gap-2 text-sm">
              {CARA_KERJA.map((n) => (
                <li key={n.href}>
                  <Link href={n.href} className="text-on-ink transition-colors hover:text-on-ink-strong">
                    {n.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="mb-3 text-sm font-semibold text-on-ink-strong">Kanal bantuan</h3>
            {/* Teks informatif, BUKAN link chat */}
            <ul className="flex flex-col gap-2 text-sm text-on-ink">
              <li>SAPA 129 (hotline nasional)</li>
              <li>TPPK sekolah</li>
              <li>Satgas daerah</li>
            </ul>
          </div>

          <div>
            <h3 className="mb-3 text-sm font-semibold text-on-ink-strong">Untuk petugas</h3>
            <ul className="flex flex-col gap-2 text-sm">
              <li>
                <Link href="/bk/login" className="text-on-ink transition-colors hover:text-on-ink-strong">
                  Masuk BK/Satgas
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Baris bawah */}
        <div className="border-t border-[color-mix(in_srgb,var(--on-ink)_16%,transparent)] pt-6 text-sm text-on-ink">
          © Lindra — layanan independen. Bukan pengganti layanan darurat.
        </div>
      </div>
    </footer>
  );
}
