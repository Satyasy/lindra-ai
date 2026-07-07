# Lindra — Instruksi Proyek untuk Claude Code

Lindra adalah platform pelaporan kekerasan sekolah berbasis chat AI trauma-informed untuk siswa SMP/SMA (Indonesia). Stack: **Next.js 14 App Router + TypeScript + Tailwind + shadcn/ui**. Rujuk `Lindra_Panduan_Lengkap.docx` untuk konteks produk, alur, dan skema data.

---

## Design system — WAJIB baca sebelum menyentuh UI

Spesifikasi desain lengkap ada di **`.claude/skills/lindra-design/design.md`**. Baca file itu sebelum membuat komponen, halaman, atau style apa pun. Jangan menebak warna/ukuran dari ingatan.

## Aturan keras UI (paling sering dilanggar model — patuhi ketat)

1. **Warna HANYA dari token CSS var** — `--primary` `#6DCDB3`, `--ink` `#1F3A34`, `--surface` `#FAFAFA`, `--danger` `#C25B4E`, dst. **DILARANG** hardcode hex di komponen atau memakai warna default shadcn/Tailwind (`blue-500`, `slate-*`, `bg-primary` bawaan, dsb). Semua lewat token di `globals.css`.
2. **Teks di atas `--primary` WAJIB `--ink`** (hijau tua), **JANGAN putih** — putih gagal kontras 4.5:1.
3. **Teks/link merek di latar terang** pakai `--primary-ink` `#276B57`, bukan `--primary`.
4. **Merah (`--danger`) HANYA untuk sinyal krisis sungguhan** (EmergencyBar, QuickExit, urgensi kritis/tinggi, aksi hapus). JANGAN untuk elemen UI biasa — supaya warna itu tetap punya makna kuat.
5. **Anchor gelap wajib hijau tua `--ink`**, bukan hitam/kopi/beige. Bayangan ber-tint hijau tua, bukan hitam.
6. **Font self-host** General Sans via `next/font/local` dari `/public/fonts`. **JANGAN** panggil Google Fonts / Fontshare / CDN font apa pun — membocorkan kunjungan siswa.

## Aturan trauma-informed (bukan sekadar gaya — ini keselamatan)

7. **QuickExit di SETIAP halaman siswa** — fixed, buka `https://www.bbc.com/weather` + hapus session. Shortcut Shift 3× dalam 5 detik (BUKAN Escape). Portal BK (`/bk/*`) TIDAK pakai QuickExit/EmergencyBar (bukan halaman siswa).
8. **Judul aplikasi siswa netral** — chrome/tab title aplikasi siswa pakai "Catatan Harian", BUKAN "Lindra" (perangkat siswa bisa diawasi pelaku). Branding "Lindra" hanya di landing publik & Portal BK.
9. **Landing (`/`) tidak nge-link ke `/chat` DI PRODUKSI** — di nav, footer, CTA, mana pun. Pengecualian tunggal: pintasan "Buka chat" di navbar publik yang di-gate `NEXT_PUBLIC_DEMO_MODE==='true'` (untuk demo juri). Saat flag false/unset, link itu tidak boleh ada di DOM. Footer tetap tanpa link chat di kondisi apa pun. Jangan tambah jalur `/chat` publik lain.
10. **Animasi minim, tanpa pop-up mendadak** — dapat diprediksi, tidak mengagetkan. Banner ajakan muncul inline di titik jeda, bukan modal. Hormati `prefers-reduced-motion`.
11. **Tanpa** emoji sebagai ikon (pakai lucide-react), tanpa foto korban, tanpa statistik palsu, tanpa countdown menekan.

## Komponen yang JANGAN diambil dari registry mana pun

Bangun **manual** sesuai `design.md` §3 — jangan tarik dari shadcn MCP / registry publik karena butuh perilaku spesifik trauma-informed: **QuickExit, EmergencyBar, ChatBubble**, kartu antrean BK, timeline Lacak, kartu transparansi rute, brand stack, typing indicator.

Boleh pakai template/block dari shadcn MCP HANYA sebagai **kerangka struktur** (mis. `dashboard-01` untuk Portal BK, `login-01`) — lalu **restyle penuh** ke token Lindra. Ambil struktur, buang warnanya.

## Verifikasi setelah membuat komponen

- Kontras teks ≥ 4.5:1 (khususnya cek teks di atas `--primary`).
- Target sentuh ≥ 44px (tombol utama 48px).
- `:focus-visible` terlihat, keyboard-navigable, HTML semantik.
- Uji di lebar 375px. QuickExit pindah ke bawah full-width di ≤640px.

## Batasan produk (dari panduan — jangan bangun di luar ini)

- StaffAccount cuma 2 role: **BK** & **Satgas**. Bukan RBAC 5-role (tidak ada psikolog/legal/admin/superadmin).
- AI tidak pernah memutuskan rute atau menyimpulkan kesalahan — routing engine adalah if-else murni yang bisa diaudit.
- Fitur ditunda (di luar scope saat ini, lihat `design.md` §8): chat asinkron pendampingan BK, follow-up/SLA scheduler, RAG vector penuh. Jangan bangun kecuali diminta eksplisit.
