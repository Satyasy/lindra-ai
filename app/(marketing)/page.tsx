import { HeartHandshake, Lock, MessageCircle, Route } from "lucide-react";

// Landing statis untuk sekolah/orang tua/juri.
// SENGAJA tanpa link ke /chat — mencegah jejak riwayat browser membahayakan siswa.
const STEPS = [
  {
    icon: MessageCircle,
    title: "Siswa bercerita",
    desc: "Lewat percakapan yang hangat dan tidak menghakimi — bukan formulir kaku.",
  },
  {
    icon: HeartHandshake,
    title: "AI mendengarkan",
    desc: "Membantu menyusun cerita jadi laporan terstruktur, tanpa memaksa detail.",
  },
  {
    icon: Route,
    title: "Dirutekan dengan aturan transparan",
    desc: "Rute ditentukan business logic yang bisa diaudit — bukan keputusan AI. Bila pelakunya pihak sekolah, laporan langsung ke jalur luar sekolah.",
  },
  {
    icon: Lock,
    title: "Aman & anonim secara default",
    desc: "Identitas hanya terkirim bila siswa memilihnya, tersimpan terenkripsi, dengan jejak audit yang tidak bisa diubah.",
  },
];

export default function LandingPage() {
  return (
    <div className="min-h-dvh bg-background">
      <main className="mx-auto max-w-3xl px-6 py-20">
        <p className="mb-3 text-sm font-medium tracking-wide text-primary">LINDRA</p>
        <h1 className="mb-4 text-3xl font-semibold leading-tight text-foreground sm:text-4xl">
          Satu pintu aman untuk siswa bercerita dan sampai ke bantuan yang tepat.
        </h1>
        <p className="mb-14 max-w-xl text-base leading-relaxed text-muted-foreground">
          Chatbot pelaporan kekerasan sekolah yang trauma-informed untuk siswa SMP/SMA — menilai
          urgensi cerita dan merutekannya ke jalur bantuan formal yang benar, tanpa siswa harus
          paham perbedaan kanal-kanalnya.
        </p>

        <div className="grid gap-6 sm:grid-cols-2">
          {STEPS.map(({ icon: Icon, title, desc }) => (
            <div key={title} className="rounded-2xl border bg-card p-6">
              <Icon className="mb-3 size-6 text-primary" aria-hidden />
              <h2 className="mb-1 font-semibold">{title}</h2>
              <p className="text-sm leading-relaxed text-muted-foreground">{desc}</p>
            </div>
          ))}
        </div>

        <p className="mt-14 text-sm leading-relaxed text-muted-foreground">
          Akses aplikasi siswa dibagikan langsung oleh pihak yang mendampingi — halaman ini sengaja
          tidak menautkannya demi keamanan riwayat penjelajahan siswa. Kanal darurat nasional:{" "}
          <span className="font-medium text-foreground">SAPA 129</span> (telepon 129 / WhatsApp
          08111-129-129).
        </p>

        <footer className="mt-10 border-t pt-6 text-sm">
          <a href="/bk/login" className="font-medium text-primary-ink underline underline-offset-4">
            Untuk BK/Satgas sekolah
          </a>
        </footer>
      </main>
    </div>
  );
}
