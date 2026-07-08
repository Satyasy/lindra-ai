# design.md — Lindra Design System (Pelaporan Kekerasan Sekolah SMP/SMA)

> **Untuk Claude Code:** Dokumen ini adalah revisi dari `design.md` "Skomda Care" versi sebelumnya, dipetakan ulang ke sistem **Lindra** yang sedang dibangun sekarang — rujuk `Lindra_Panduan_Lengkap.docx` (Bagian I–VIII) sebagai sumber kebenaran untuk alur, skema data, dan batasan produk. Tujuan dokumen ini: **jangan bangun UI dari nol** — token warna, tipografi, komponen global (QuickExit, EmergencyBar, ChatBubble, Badge, dsb.) dari proyek lama sudah teruji trauma-informed dan tetap dipakai. Yang berubah adalah **peta situs, peran staf, kosakata status, dan copy** — disesuaikan dengan konteks siswa SMP/SMA + TPPK/Satgas/SAPA 129, bukan lagi konteks umum "kekerasan perempuan dan anak" dengan 5 role (admin/psikolog/legal/satgas/superadmin).
>
> Baca seluruh dokumen, lalu implementasikan mulai dari §2 (tokens, hampir tidak berubah) → §3 (komponen global) → §4 (rute) → §5 (halaman siswa) → §6 (Portal BK). Semua nilai warna/ukuran adalah nilai final — jangan diganti default shadcn.

---

## 1. Identitas Produk & Prinsip Desain

**Lindra** adalah satu pintu masuk pelaporan kekerasan sekolah berbasis chat AI trauma-informed, untuk **siswa SMP/SMA** (bukan SD, bukan populasi umum). Lindra menilai urgensi cerita siswa lalu merutekan ke jalur bantuan formal yang tepat (BK sekolah, Satgas eksternal, atau SAPA 129) — tanpa siswa perlu tahu beda kanal-kanal itu. AI **tidak pernah** memutuskan rute atau menyimpulkan kesalahan siapa pun; itu business logic eksplisit yang bisa diaudit.

**Arah visual:** tetap tenang & menyembuhkan — *aman, lembut, jelas*, krem lembut + mint + anchor hijau tua. Bukan estetika kafe/butik/spa. Tidak berubah dari versi sebelumnya karena palet ini cocok untuk siapa pun dalam kondisi rentan, bukan spesifik satu demografi.

### Tiga permukaan terpisah (Bagian III.3.3 panduan)

| Permukaan | Audiens | Boleh ada link ke chat siswa? |
|---|---|---|
| **Situs Informasi** (`/`) | Sekolah, orang tua, juri — publik | **TIDAK.** Ini aturan keras: mencegah jejak riwayat browser yang membahayakan siswa. Entry ke `/chat` didapat siswa lewat sosialisasi BK/Satgas, bukan navigasi dari landing. |
| **Aplikasi Siswa** (`/chat`, `/draft`, `/lacak`) | Siswa SMP/SMA, mobile-first | — |
| **Portal BK** (`/bk/*`) | StaffAccount (peran **BK** & **Satgas**), desktop-first | — |

### Aturan yang TIDAK BOLEH dilanggar (trauma-informed)

1. **QuickExit di setiap halaman siswa** — tombol "Keluar cepat" fixed, buka `https://www.bbc.com/weather` di tab baru + hapus session. Shortcut: **Shift 3× dalam 5 detik** (BUKAN Escape).
2. **Jalur darurat selalu terjangkau** — Polisi 110 · SAPA 129 · Ambulans 119 (link `tel:`). SAPA 129 juga jadi jaring pengaman kedua otomatis saat krisis terdeteksi.
3. **Transparansi AI** — pesan pertama chat memperkenalkan Lindra sebagai AI, bukan manusia, bukan layanan darurat, dan menegaskan siswa pegang kendali.
4. **BARU — Judul aplikasi netral, bukan "Lindra."** Karena guru adalah kategori pelaku terbanyak (data JPPI 43,9%) dan perangkat siswa bisa diawasi pelaku, browser tab title & header UI aplikasi siswa memakai nama netral seperti **"Catatan Harian"** — bukan logo/nama "Lindra" yang mencolok. Branding "Lindra" tetap terbuka di Situs Informasi publik dan Portal BK (bukan risiko keamanan di situ). Di dalam isi percakapan, AI tetap boleh memperkenalkan diri sebagai "Lindra" (itu soal transparansi AI, bukan soal chrome UI).
5. **Font SELF-HOST** — General Sans dari `/public/fonts` via `next/font/local`. **JANGAN** panggil CDN font pihak ketiga — bocor kunjungan siswa ke luar.
6. **WCAG 2.2 AA** — kontras ≥ 4.5:1, target sentuh ≥ 44px (utama 48px), `:focus-visible` selalu terlihat, `prefers-reduced-motion` dihormati, HTML semantik.
7. **Portal BK TIDAK pakai QuickExit/EmergencyBar** (bukan halaman siswa) — disengaja.
8. **Warna alarm/merah HANYA untuk sinyal krisis sungguhan** — tidak untuk elemen UI biasa, supaya tetap punya makna kuat saat benar-benar dibutuhkan.
9. **Animasi minim, tidak ada pop-up mendadak** — dapat diprediksi, tidak mengagetkan. Banner ajakan (mis. ke draf) muncul di titik jeda alami, bukan modal.
10. **Tidak ada:** glass/blur berlebihan, animasi mengejutkan, countdown yang menekan, progress bar menonjol, foto korban, statistik palsu, emoji sebagai ikon.
11. **BARU — Transparansi rute, bukan cuma transparansi AI.** Di layar konfirmasi setelah kirim, tunjukkan alasan singkat kenapa laporan diteruskan ke tujuan tertentu (mis. "Karena melibatkan staf sekolah, laporanmu diteruskan ke Satgas eksternal, bukan BK sekolahmu"). Ini bukti hidup dari klaim "AI tidak memutuskan rute" — jangan disembunyikan sebagai detail teknis.

### Aturan warna inti (tidak berubah)

- `--primary` (mint) **hanya untuk bidang/isian**; teks di atasnya **selalu** `--ink` (hijau tua), **jangan putih**.
- Teks/link berwarna merek di latar terang pakai `--primary-ink` (teal gelap, lulus 4.5:1).
- Anchor gelap **wajib hijau tua** (`--ink`) — hadir di tiap halaman.
- `--surface-peach` dan `--warm-butter` **dekoratif saja**, bukan untuk teks/aksi.
- Latar `#FAFAFA` (near-white); kartu dibedakan lewat border + shadow, bukan warna.

---

## 2. Design Tokens

Token warna, tipografi, radius, spasi, dan motion **hampir tidak berubah** dari versi sebelumnya — sistem ini domain-agnostik dan sudah teruji. Perubahan hanya di tabel aksen role (lebih sedikit role sekarang).

### 2.1 Palet warna

| Token | Hex | Pemakaian |
|---|---|---|
| `--bg` / `--surface` | `#FAFAFA` | Latar & kartu |
| `--surface-alt` | `#EEF3EC` | Kartu tint mint (chip kode referensi, baris antrean) |
| `--surface-warm` | `#F3EDD7` | Momen hangat (kartu jadwal follow-up, kronologi kejadian) |
| `--surface-peach` | `#FFC4AF` | Dekoratif saja |
| `--ink` | `#1F3A34` | Anchor hijau tua: heading, sidebar Portal BK, teks di atas mint |
| `--ink-2` | `#2C4A43` | Variasi anchor |
| `--primary` | `#6DCDB3` | Mint — bidang/isian (tombol primer, bubble siswa) |
| `--primary-deep` | `#3FA88B` | Hover primer, focus ring |
| `--primary-soft` | `#DDF4EF` | Latar lembut (badge urgensi rendah, ring timeline lacak) |
| `--primary-ink` | `#276B57` | Teks/link merek di latar terang (4.5:1 ✓) |
| `--warm` | `#D9773D` | Aksen kehati-hatian / urgensi "sedang" |
| `--warm-deep` | `#B85C2A` | Ikon warm |
| `--warm-soft` | `#FBE3D2` | Latar badge warm |
| `--warm-butter` | `#FFED78` | Dekoratif saja |
| `--text` | `#1F3A34` | Teks utama |
| `--text-soft` | `#4B665F` | Teks sekunder |
| `--text-muted` | `#7A9089` | Teks redup |
| `--danger` | `#C25B4E` | Bahaya (lembut, bukan merah neon) — urgensi kritis/tinggi, EmergencyBar |
| `--danger-soft` | `#F3DAD4` | Latar badge danger, chip "Aku sedang dalam bahaya" |
| `--success` | `#3FA88B` | Sukses / status "selesai" / online |
| `--online` / `--offline` | `#3FA88B` / `#B0BEB9` | Presence StaffAccount (jika ditampilkan) |
| `--border` | `#D9E7DE` | Garis hijau-lembut |
| Aksen role Portal BK | **BK** `#8FD3C9` (teal) · **Satgas** `#F0B892` (warm) | Label peran di brand stack sidebar — hanya 2 role sekarang, bukan 5 |

**Bayangan** (selalu ber-tint hijau tua, bukan hitam): `--shadow-soft: 0 4px 20px rgba(31,58,52,0.08)` · `--shadow-lift: 0 14px 40px rgba(31,58,52,0.16)`.

**Radius:** sm `12px` · md `18px` · lg `24px` · full `999px`. **Spasi (ritme 8px):** xs `4` · sm `8` · md `16` · lg `24` · xl `40` · 2xl `80`.

> Catatan: tabel aksen role versi lama (psikolog/legal/admin/superadmin) **dihapus** dari scope saat ini karena StaffAccount di sistem Lindra sengaja cuma 2 kategori (BK, Satgas) — bukan RBAC 5-role dari rancangan awal proyek. Kalau produk berkembang lagi ke arah itu, warna lama masih ada di riwayat proyek sebagai referensi.

### 2.2 Tipografi — tidak berubah

Satu keluarga sistem-wide: **General Sans** (self-host, woff2, weight 400/500/600/700). Hierarki lewat berat + tracking, bukan font berbeda. Body sengaja **17px** — kenyamanan saat cemas.

```ts
// app/fonts.ts — next/font/local, file di /public/fonts (copy dari proyek lama)
import localFont from 'next/font/local'
export const generalSans = localFont({
  src: [
    { path: '../public/fonts/GeneralSans-Regular.woff2', weight: '400' },
    { path: '../public/fonts/GeneralSans-Medium.woff2', weight: '500' },
    { path: '../public/fonts/GeneralSans-Semibold.woff2', weight: '600' },
    { path: '../public/fonts/GeneralSans-Bold.woff2', weight: '700' },
  ],
  display: 'swap',
  variable: '--font-sans',
})
```

| Token | Nilai | Pemakaian |
|---|---|---|
| `--t-hero` | `clamp(2.5rem, 5.5vw, 3.8rem)` | H1 landing |
| `--t-h1` | `clamp(1.75rem, 3vw, 2.3rem)` | Judul halaman |
| `--t-h2` | `1.3rem` | Sub-judul |
| `--t-body` | `1.0625rem` (17px) | Body, line-height 1.65 |
| `--t-sm` | `0.9375rem` (15px) | Label, hint |
| `--t-xs` | `0.8125rem` (13px) | Meta, label role |

Heading: `h1` weight 700 `-0.03em` / 1.06 · `h2` 700 `-0.02em` · `h3` 600 `-0.01em`. Link: `--primary-ink`. `em`: bukan italic — `--primary-ink` + weight 500.

### 2.3 globals.css — tidak berubah dari versi lama (lihat proyek lama untuk isi lengkap variabel shadcn); base `body { font-size: 1.0625rem; line-height: 1.65 }`, focus `:focus-visible { outline: 2.5px solid #3FA88B; outline-offset: 3px }`. Tidak ada dark mode.

### 2.4 Motion — tidak berubah

Micro-interaction 150–200ms; reveal 500ms, easing `cubic-bezier(.2,.7,.3,1)`. Bubble chat masuk: fade + translateY 6px, 200ms. Typing indicator: 3 titik bounce, **fallback teks** "Lindra sedang menulis…" saat reduced-motion. `prefers-reduced-motion: reduce` → matikan semua animasi, ganti dots dengan teks. Tidak memantul, tanpa parallax.

---

## 3. Komponen Global (bangun dulu)

Basis: shadcn/ui (`button`, `input`, `label`, `textarea`, `select`, `dialog`, `dropdown-menu`, `tabs`, `table`, `badge`, `accordion`, `sonner`). Ikon: **lucide-react** (stroke 2). Set yang relevan sekarang: lock, heart, eye-off, shield, message-circle, send, alert-triangle, user, phone, clipboard, paperclip, calendar, unlock, download, copy, chevron-down, check, x, file-text, refresh-cw, log-out, bell, book-open, scale, users. **Jangan emoji.**

### 3.1 Button — tidak berubah

Pill (`rounded-full`), weight 600, min-height 50px, padding-x 24px. Varian `primary` (bg mint, teks ink), `secondary` (border 2px), `ghost`, `dark` (di atas `--ink`), `danger` (untuk aksi krisis/hapus). Ukuran `sm`: min-height 44px. **Satu primary pekat per zona layar.**

### 3.2 QuickExit — tidak berubah, hanya dipakai di permukaan siswa

Fixed `top-4 right-4`, z-970, pill, bg `--danger`, teks putih 600, min-height 48px, ikon X, shadow-lift, label **"Keluar cepat"**. Klik → buka `bbc.com/weather` + hapus session. Keyboard: Shift 3× / 5 detik. Mobile ≤640px → pindah ke bawah full-width.

### 3.3 EmergencyBar — tidak berubah

Kartu bg `--danger`, radius lg, padding 22–24px. Judul kiri 700 (default **"Sedang dalam bahaya sekarang?"**). Kanan: 3 chip `tel:` — **Polisi 110 · SAPA 129 · Ambulans 119**.

### 3.4 ChatBubble — tidak berubah

Max-width 80%, padding 16×24px, font 17px. **Lindra (kiri):** bg `--surface`, border `--border`, sudut kiri-bawah radius-sm. **Siswa (kanan):** bg `--primary`, teks `--ink`, sudut kanan-bawah radius-sm.

### 3.5 Logo & Brand — disesuaikan

`Logo`: link ke `/` (Situs Informasi), mark `/lindra-logo.png` + wordmark "Lindra" — dipakai di landing dan Portal BK saja (**bukan** di chrome aplikasi siswa, lihat aturan §1.4). Sidebar Portal BK pakai brand stack: "Lindra" (1.7rem, 800) di atas label peran (uppercase `--t-xs`, warna aksen **BK** teal atau **Satgas** warm — hanya 2 varian, bukan 5).

### 3.6 Badge & indikator status — kosakata diperbarui ke skema Lindra

- **Badge urgensi** (field `urgencyLevel` di Report): Kritis/Tinggi = `--danger`+`--danger-soft`, Sedang = `--warm`+`--warm-soft`, Rendah = `--primary-ink`+`--primary-soft`.
- **Badge tujuan rute** (dari RoutingLog, ditampilkan di kartu antrean BK & detail): "Dashboard BK" (`--primary-soft`), "Satgas Eksternal" (`--warm-soft`), "SAPA 129" / "Eskalasi Darurat" (`--danger-soft`). Dashboard BK **hanya pernah menampilkan** kasus bertujuan "Dashboard BK" — kasus guru-staf/orangtua-wali tidak pernah muncul di sini (bypass by design).
- **Badge peran StaffAccount**: BK (teal) / Satgas (warm) — bukan lagi psikolog/legal/admin.
- **Chip flag** `urgentVisum` (kategori kekerasan seksual) — badge kecil `--danger` terpisah dari badge urgensi umum, supaya BK langsung tahu kebutuhan visum mendesak tanpa membaca ulang narasi.
- Toast: sonner, bottom-center, `aria-live="polite"`.

### 3.7 Kartu & section editorial — tidak berubah

Kartu standar: bg `--surface`, border 1px, radius lg, shadow-soft; hover: `translateY(-4px)` + shadow-lift. Section editorial `.sec`: grid `320px/1fr`, kolom kiri sticky heading; collapse 1 kolom <900px.

---

## 4. Arsitektur Route (Next.js App Router)

Mengikuti struktur folder di Bagian VII.7.2 Prompt 1 panduan persis, supaya konsisten dengan backend yang dibangun Revan:

| Route (URL) | Folder | Halaman | Akses | Shell |
|---|---|---|---|---|
| `/` | `app/(marketing)/page.tsx` | Landing minimal | Publik | Standalone, **tanpa** QuickExit (bukan halaman siswa) |
| `/chat` | `app/(student)/chat/page.tsx` | Chat siswa | Publik, tanpa akun | App-shell siswa (QuickExit + judul netral "Catatan Harian") |
| `/draft` | `app/(student)/draft/page.tsx` | Tinjau Draf | Publik (butuh sessionId cookie) | Layout siswa |
| `/lacak` | — | Cek status via kode referensi | Publik | Layout siswa |
| `/bk/login` | `app/bk/login/page.tsx` | Login staf | Publik | Kartu tengah, tanpa QuickExit |
| `/bk` | `app/bk/(dashboard)/page.tsx` | Antrean laporan | role `bk` \| `satgas` | Shell Portal BK |
| `/bk/[reportId]` | `app/bk/(dashboard)/[reportId]/page.tsx` | Detail laporan | role `bk` \| `satgas` | Shell Portal BK |
| `*` | — | redirect `/` | — | — |

**Endpoint terkait** (untuk konteks Claude Code, bukan spesifikasi UI): `POST /api/chat` (SSE), `GET /api/draft/[sessionId]`, `POST /api/draft/[sessionId]/send`, `GET /api/audit/[reportId]`.

**Dihapus dari peta situs versi lama** karena di luar scope sistem saat ini: `/akun`, `/pendampingan`, `/psikolog`, `/legal`, `/satgas` (dashboard terpisah), `/admin`, 403 Forbidden khusus multi-role. Lihat §8 untuk yang statusnya "ditunda", bukan dibuang.

**Guard role:** authed BK/Satgas → render `/bk/*`; tidak authed → `/bk/login`. Siswa tidak pernah punya akun/token — identitas mereka opsional per-laporan (`identityData` terenkripsi), bukan sesi login. Session siswa: **UUID di cookie httpOnly + `SameSite=Strict`, JANGAN localStorage**, `Cache-Control: no-store` — draf tetap ada kalau browser ditutup lalu dibuka lagi dengan cookie yang sama.

**Catatan penting §1 poin 1**: Situs Informasi (`/`) secara sengaja **tidak** ditautkan ke `/chat` di mana pun (nav, footer, CTA). Siswa sampai ke `/chat` lewat sosialisasi BK/Satgas sekolah (poster, tautan langsung), bukan lewat penjelajahan situs publik.

---

## 5. Spesifikasi Halaman — Aplikasi Siswa

Semua copy Bahasa Indonesia, hangat, kalimat pendek, tanpa jargon birokrasi/hukum.

### 5.1 Landing `/` — versi minimal (bukan situs marketing penuh, Prompt 7 panduan)

Satu halaman statis: nama produk **"Lindra"** + tagline singkat (mis. "Satu pintu masuk untuk cerita yang tidak tahu harus dibawa ke mana."), **3–4 poin cara kerja** (Ceritakan sekali → Lindra bantu susun jadi laporan → kamu putuskan kirim anonim/dengan nama → diteruskan ke bantuan yang tepat), poin kepercayaan/privasi singkat (terenkripsi, kamu pegang kendali, bukan disebar ke sekolah tanpa alasan). Footer: link **"Untuk BK/Satgas sekolah"** → `/bk/login`. **Tidak ada** CTA atau tombol apa pun menuju `/chat` — ini item wajib di checklist QA final.

Komponen visual boleh dipakai dari sistem lama (ilustrasi hangat, kartu, `.reveal` fade-up) untuk memperkaya tampilan, selama tidak menambah link ke `/chat`.

### 5.2 Chat `/chat`

App-shell `flex h-dvh`, mobile-first:

- **Header:** ikon buku/diary + judul netral **"Catatan Harian"** (bukan "Lindra" — lihat §1.4) + hamburger mobile. QuickExit tetap fixed di atas semua konten.
- **Tanpa gerbang pemilihan mode** — siswa langsung diajak cerita begitu masuk. Pesan pertama (wajib, dari Nabil's system prompt): AI memperkenalkan diri sebagai **Lindra**, sebagai AI (bukan manusia/layanan darurat), dan menegaskan siswa pegang kendali.
- **Indikator progres lembut (opsional, kecil, bisa disembunyikan)** — bukan checklist form, cuma penanda samar bahwa cerita "tersimpan": Apa yang terjadi / Siapa pelakunya / Kapan & di mana / Dampak buat kamu / Keamananmu sekarang. Jangan tampil sebagai daftar pertanyaan yang harus dijawab — AI menggali semua ini natural dalam alur, tidak wajib lengkap sebelum lanjut.
- **Stream pesan** max-width 680px terpusat, ChatBubble §3.4, typing indicator.
- **Quick-reply chips** di pembuka: "Aku ingin membuat laporan" / "Aku butuh informasi dulu" / "Aku cuma ingin didengar" / **"Aku sedang dalam bahaya"** (styled `--danger-soft` — klik ini memicu jalur krisis yang sama seperti deteksi otomatis Tier 1).
- **Langkah bukti** (opsional, tidak wajib per regulasi): "Lampirkan bukti" (ikon paperclip) / "Tidak ada bukti". Tombol agency selalu ada: "Lewati pertanyaan ini", "Berhenti sebentar dulu" (link underline kecil, bukan tombol mencolok).
- **Input:** pill radius-full, placeholder **"Tulis dengan caramu sendiri…"**, tombol kirim bulat 48×48 bg `--primary` ikon ↑ warna `--ink`.
- **Fase:** `opening / gathering / ready / danger`.
  - `ready` (titik jeda alami setelah beberapa giliran) → **banner ajakan halus** muncul inline di antara bubble (bukan modal): "Kayaknya ceritamu udah cukup buat disusun jadi draf. Mau lihat?" + tombol "Lihat draf" — siswa boleh tetap lanjut cerita kapan saja, banner tidak memaksa.
  - `danger` (Tier 1 krisis terdeteksi, atau chip "Aku sedang dalam bahaya" diklik) → **skip semua tahap normal**, suntik panel EmergencyBar penuh inline, hentikan penggalian lebih lanjut, arahkan ke eskalasi darurat + notifikasi paralel SAPA 129. Tidak ada jeda/loading state di titik ini.

### 5.3 Tinjau Draf `/draft`

Titik di mana siswa punya **kendali penuh**. Kolom terpusat max 680px: heading netral, narasi lengkap hasil narrative composer ditampilkan utuh dan bisa dibaca ulang (font body 17px, line-height 1.65) → tiga tombol bahasa lembut:

1. **"Aku masih mau cerita dulu"** → kembali ke `/chat` (draf tersimpan, bukan hilang).
2. **"Kirim tanpa nama"** → mode anonim, `identityData` tidak diisi.
3. **"Kirim dengan nama"** → buka form ringan (nama, kontak opsional) sebelum kirim.

Saat kirim: hitung `contentHash` (SHA-256), ubah status ke `terkirim`, panggil routing engine, buat `ReferralCode` → redirect ke layar konfirmasi (bagian dari halaman yang sama atau transisi halus, bukan reload penuh).

### 5.4 Konfirmasi (setelah kirim, bagian dari `/draft`)

Kolom terpusat max 600px: SVG ceklis dalam lingkaran mint → H1 **"Laporanmu sudah dikirim dengan aman."** → lead **"Kamu sudah melangkah, dan itu berani."** → **kartu kode referensi**: label "Simpan kode ini untuk memantau status…", kode besar (`clamp(1.8rem–2.6rem)`, tracking .08em, warna `--primary-ink`, chip bg `--surface-alt`), tombol **"Salin kode"** → "Kode tersalin ✓" → **BARU — kartu transparansi rute**: "Kenapa laporanmu ke sini?" + 1 kalimat alasan singkat sesuai hasil routing engine (mis. "Karena melibatkan staf sekolah, laporanmu diteruskan ke Satgas eksternal, bukan BK sekolahmu" / "Laporanmu diteruskan ke BK sekolahmu untuk ditindaklanjuti") → tautan "Cek status laporan" (→ `/lacak`) / "Kembali ke beranda" → EmergencyBar ("Kalau keadaan mendesak…").

### 5.5 Lacak `/lacak`

Kolom max 620px: H1 **"Lihat perkembangan laporanmu"** → form pill input (placeholder "Mis. LIN-AB23-4C") + primary **"Cek status"** ("Mengecek…" saat loading; error: "Kode itu tidak kami temukan…") → **timeline vertikal** status: **"Diterima / Sedang ditinjau / Sedang ditindaklanjuti / Selesai"** — marker lingkaran 28px, selesai=`--success`+✓, sekarang=`--primary`+ring 4px, berikutnya=muted → catatan penutup + EmergencyBar. *(Catatan: label status ini asumsi kerja berdasarkan tujuan `ReferralCode` di skema — konfirmasikan ke tim penamaan status Report yang persis dipakai di Prisma schema sebelum implementasi final.)*

---

## 6. Portal BK — Shell Staf (desktop-first)

Satu shell dipakai untuk kedua role StaffAccount (**BK** & **Satgas**) — dibedakan lewat aksen `.brand-role` dan kasus mana yang mereka lihat di antrean, bukan re-theme penuh.

- **Sidebar fixed gelap** bg `--ink`, lebar 240px: brand stack (§3.5, aksen teal="BK" / warm="Satgas") → blok profil (nama) → nav sederhana ("Antrean Laporan" — cuma satu view utama untuk sekarang, bukan multi-nav 4-dashboard seperti versi lama) → tombol "Keluar" (log-out, hapus token → `/bk/login`).
- **Konten scroll** dengan sticky header (judul + aksi kanan, mis. tombol Refresh).
- **Mobile:** hamburger + sidebar slide-in, meski Portal BK desktop-first dan jarang diakses mobile.

> **Asumsi ditandai:** panduan Bagian III.3.3 hanya menyebut "Portal BK" sebagai satu permukaan (tidak ada dashboard Satgas terpisah yang dirinci). Desain ini mengasumsikan BK dan Satgas berbagi satu tampilan antrean, dibedakan lewat kasus mana yang tampil ke masing-masing (BK lihat tujuan `dashboard-bk`, Satgas lihat tujuan `satgas-eksternal`). Konfirmasikan ke tim sebelum implementasi kalau ternyata perlu dipisah.

### 6.1 `/bk` — Antrean Laporan

Header "Antrean Laporan" + tombol Refresh (ikon spin) + **Export** (CSV antrean terfilter). Tabs **"Kasus Aktif (n)" / "Riwayat Selesai (n)"** (badge count, aktif = border-bottom `--primary-ink`). Toolbar: search "Cari ID pelapor atau kata kunci…" + filter **Semua Risiko / Semua Penanganan / Semua Petugas** (Lindra TIDAK punya role psikolog — jangan pakai "Psikolog"). **Antrean berbentuk TABEL** (`<table>` semantik, `<th scope="col">`) — keputusan produk yang **menggantikan** aturan kartu lama. Mitigasi automation-bias tetap dijaga DI DALAM tabel: kolom **Ringkasan Laporan DIPOTONG** (line-clamp 2–3 baris) sehingga petugas wajib membuka detail untuk membaca narasi penuh, dan **tak ada aksi otomatis** atas skor urgensi AI (assign & status penanganan selalu manual). Kolom: `[checkbox]` · **ID Pelapor** (kode DUMMY-xx / referensi — BUKAN nama; PII tetap gated) · **Risiko** (badge titik + label `urgencyLevel`: Kritis=danger, Tinggi=warm, Sedang=warm-soft/kuning, Rendah=primary-ink) · **Tingkat Kekhawatiran** (METER bar horizontal + label, display-only, dipetakan dari `urgencyLevel`: kritis→"Sangat Khawatir" penuh danger, tinggi→"Khawatir" warm, sedang→"Cukup Khawatir" kuning, rendah→primary) · **Ringkasan Laporan** (line-clamp 2–3 baris) · **Tanggal** (WIB "7 Jul 2026 11.25") · **Penanganan** (dropdown assign petugas + pill `handlingStatus`; warna cerah HANYA di sini/risiko/kekhawatiran) · **Chat** (ikon + badge jumlah pesan belum dibaca dari `ChatThread`, 0 = tanpa badge → klik buka **ConsultPanel**). Baris klik → `/bk/[reportId]`. Urut urgensi tertinggi dulu; paginasi ("Menampilkan 1–5 dari N kasus"). Filter keamanan tetap: kasus `guru-staf`/`orangtua-wali` tak pernah muncul di antrean BK (bypass `destination`). Empty state: "Belum ada laporan pada tab ini."

### 6.2 `/bk/[reportId]` — Detail Laporan

Breadcrumb "Antrean › #id". Action bar sticky (Kembali / dropdown "Ubah Status"). Grid `320px/1fr`:

- **Rail sticky kiri:** hero (#id, tanggal, badge status) + kartu urgensi (badge Kritis/Tinggi/Sedang/Rendah + chip `urgentVisum` kalau ada).
- **Body kanan:**
  1. **Narasi lengkap** — hasil narrative composer, ditampilkan sebagai teks naratif ("siswa menyatakan bahwa…"), bukan tabel field mentah.
  2. **Identitas pelapor** (kalau mode "dengan nama") — di balik tombol **"Buka identitas"** dengan catatan "…tercatat di jejak audit" (chain of custody, Bagian III.3.2).
  3. **Rekomendasi rute** — hasil routing engine (business logic, bukan AI): tujuan + 1–2 kalimat alasan yang bisa diaudit. Ditampilkan sebagai fakta yang sudah terjadi (laporan bertujuan BK berarti sudah difilter dari kasus guru-staf/orangtua-wali), bukan rekomendasi yang perlu disetujui BK.
  4. **Rekomendasi pasal (RAG)** — ditampilkan sebagai **kutipan asli dari dokumen tata tertib + alasan kecocokan**, BUKAN angka/keputusan final — supaya BK tetap membaca konteks dan tidak auto-percaya (automation bias). Kalau tidak ada yang cocok: "Tidak ditemukan pasal yang relevan" — jangan biarkan UI menyembunyikan kekosongan ini.
  5. **Dropdown status** — mengubah status laporan, tercatat otomatis ke AuditLog.
- **Saat halaman pertama dibuka**, trigger otomatis `RoutingLog.openedAt` + `AuditLog action:'opened'` — tidak perlu aksi eksplisit dari BK, ini bagian dari chain of custody.

---

## 7. Mapping shadcn/ui — tidak berubah

| Pola Lindra | Komponen shadcn | Catatan |
|---|---|---|
| Button | `button` | Pill, teks ink di primary |
| Form login | `input`, `label` | Radius md, min-height 48px |
| Input chat/lacak | `input` custom | `rounded-full` |
| FAQ (landing) | `accordion` | Chevron rotate |
| Tabs antrean BK | `tabs` | Aktif = border-bottom `--primary-ink` |
| Modal detail (kalau dipakai sbg overlay) | `dialog` | max-w besar, header sticky |
| Dropdown ubah status | `dropdown-menu` | — |
| Badge urgensi/rute/peran | `badge` | Varian §3.6 |
| Toast | `sonner` | bottom-center, `aria-live="polite"` |
| Konfirmasi hapus/kirim | `alert-dialog` | Aksi destruktif terpisah |

**Custom (tidak dipetakan ke shadcn):** QuickExit, EmergencyBar, ChatBubble, tabel antrean BK, timeline Lacak, kartu transparansi rute, brand stack, typing indicator.

---

## 8. Fitur Lanjutan — Referensi Desain (belum dibangun, di luar scope saat ini)

Sesuai Bagian VI.3 panduan, fitur berikut sengaja **ditunda**, bukan dibuang — kalau nanti diimplementasi, pola desain dari sistem lama masih relevan dan bisa dipakai langsung tanpa dirancang ulang:

- **Chat asinkron BK (pendampingan non-formal)** — skema `ChatThread`/`ChatMessage` sudah ada. Pola desain lama untuk chat pendampingan (header inisial + presence "Online sekarang"/"Sedang offline", notice privasi "bukan layanan darurat", bubble sama seperti ChatBubble §3.4, textarea auto-grow) langsung reusable.
- **Follow-up proaktif — TERBANGUN.** Opt-in di layar konfirmasi (toggle DEFAULT OFF + consent verbatim §4.3), email terenkripsi di `Followup.contactEmail`. Cron `/api/cron/followup-email` (Diagram A): belum dibuka + SLA breach → auto-escalate SAPA 129 sekali, BUKAN email; sudah dibuka → email NETRAL via Resend (tanpa kode/link/token/kata "kekerasan"/"laporan"). Input kode MANUAL `/followup/masuk` (tanpa kode di URL) → sesi `/followup`; `noProgressCount` ke-3 → opsi SAPA 129 (siswa pilih sendiri) + sinyal di detail BK.
- **RAG penuh (vector similarity via pgvector)** — versi sprint saat ini boleh pakai keyword-matching sederhana dulu (`recommendArticlesSimple`); UI kartu kutipan+alasan di §6.2 poin 4 dirancang supaya tidak perlu berubah saat backend upgrade ke pgvector similarity search.

---

## 9. Microcopy — Do & Don't

**Do:** "Ini bukan salahmu." · "Kamu yang pegang kendali — bisa berhenti kapan saja." · "Tidak ada yang dikirim sebelum kamu setuju." · "Ceritakan sebanyak atau sesedikit yang kamu mau." · label tombol bahasa manusia ("Kirim laporan", bukan "Submit"). Nada AI adaptif: lebih hangat untuk kelas 7–9, lebih setara-dewasa untuk kelas 10–12 (ini domain prompt Nabil, tapi copy statis UI ikut prinsip yang sama).

**Don't:** jargon hukum/birokrasi di sisi siswa; pertanyaan menyalahkan ("kenapa kamu tidak…"); klaim keamanan absolut; nada terlalu ceria/emoji; superlatif berulang; pertanyaan bernuansa checklist/formulir kaku.

---

## 10. Checklist Implementasi (urutan build, selaras Bagian VI panduan)

1. `globals.css` tokens (§2.3) + `next/font/local` General Sans (§2.2) — copy woff2 dari proyek lama, juga `/lindra-logo.png`.
2. Komponen global: Button variants → QuickExit → EmergencyBar → ChatBubble → Badge (urgensi/rute/peran) → toast.
3. `/chat` — Tier 1 crisis hook (dari Nabil) + SSE + judul netral "Catatan Harian" + fase opening/gathering/ready/danger.
4. `/draft` — tinjau draf + 3 tombol kirim + kartu konfirmasi + transparansi rute.
5. `/lacak` — timeline status via kode referensi.
6. Shell Portal BK: `/bk/login` → `/bk` (antrean tabel) → `/bk/[reportId]` (detail + rekomendasi rute & pasal).
7. `/` — landing minimal, **verifikasi tidak ada link ke `/chat` di mana pun**.
8. Validasi akhir: kontras 4.5:1, target sentuh ≥44px, keyboard nav, reduced-motion, uji 375px + mobile QuickExit, uji draf tidak hilang saat browser ditutup-buka (cookie sama).
