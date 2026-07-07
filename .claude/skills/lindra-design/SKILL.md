---
name: lindra-design
description: "Design system Lindra — token warna, tipografi, komponen, dan spesifikasi halaman untuk UI platform pelaporan kekerasan sekolah SMP/SMA (Next.js + shadcn/ui + Tailwind). WAJIB dipakai setiap kali membuat, mengedit, atau men-style komponen/halaman UI Lindra; membuat globals.css/tokens; membangun QuickExit/EmergencyBar/ChatBubble atau komponen siswa/Portal BK lain; menarik block dari shadcn MCP yang perlu di-restyle ke tone Lindra; atau memverifikasi kontras/aksesibilitas. Trigger untuk semua pekerjaan frontend di repo Lindra."
---

# Lindra Design System

Skill ini adalah sumber kebenaran visual untuk UI Lindra. **Spesifikasi lengkap ada di `design.md`** di folder skill ini — baca file itu untuk detail token, komponen, rute, dan spesifikasi per-halaman.

## Cara pakai skill ini

1. **Selalu buka `design.md` (di folder skill ini) sebelum menulis kode UI.** Jangan menebak nilai warna/ukuran dari ingatan — semuanya ada di sana dan bersifat final.
2. Ikuti urutan build di `design.md` §10: tokens (`globals.css` + font self-host) → komponen global → halaman siswa → Portal BK → landing → validasi aksesibilitas.
3. Untuk komponen global custom (QuickExit, EmergencyBar, ChatBubble, kartu antrean, timeline), pakai spesifikasi persis di `design.md` §3 & §5–6 — **jangan** ambil dari registry publik.
4. Kalau menarik block/template dari shadcn MCP, pakai hanya sebagai kerangka struktur lalu restyle penuh ke token Lindra (§2). Ambil layout, buang warna default.

## Ringkasan aturan keras (detail penuh di design.md)

**Warna:**
- Semua warna lewat token CSS var — dilarang hardcode hex atau warna default shadcn/Tailwind.
- Teks di atas `--primary` (`#6DCDB3`) wajib `--ink` (`#1F3A34`), jangan putih.
- Link/teks merek di latar terang pakai `--primary-ink` (`#276B57`).
- `--danger` (`#C25B4E`) hanya untuk sinyal krisis, bukan UI biasa.
- Anchor gelap wajib `--ink` (hijau tua); bayangan ber-tint hijau tua, bukan hitam.
- Latar `#FAFAFA`; kartu dibedakan lewat border + shadow, bukan warna.

**Tipografi:** satu keluarga General Sans (self-host woff2, `next/font/local`), hierarki lewat berat + tracking. Body 17px / line-height 1.65. Skala tipe `--t-*` di §2.2.

**Trauma-informed (wajib):**
- QuickExit di setiap halaman siswa (Shift 3× / 5 detik, buka bbc.com/weather + hapus session). Portal BK tidak pakai QuickExit/EmergencyBar.
- Judul aplikasi siswa netral ("Catatan Harian"), bukan "Lindra".
- Landing `/` tanpa link ke `/chat`.
- Animasi minim, tanpa pop-up mendadak, hormati `prefers-reduced-motion`, tanpa emoji-ikon.

**Aksesibilitas (verifikasi tiap komponen):** kontras ≥ 4.5:1, target sentuh ≥ 44px (utama 48px), `:focus-visible` terlihat, keyboard-nav, uji 375px.

## Arsitektur (ringkas — detail di design.md §4)

Tiga permukaan: Situs Informasi (`/`, publik), Aplikasi Siswa (`/chat` `/draft` `/lacak`, mobile-first, QuickExit), Portal BK (`/bk/*`, desktop-first, role BK & Satgas). Struktur folder mengikuti `app/(student)/`, `app/(marketing)/`, `app/bk/`.

## Mapping shadcn/ui

Lihat `design.md` §7 untuk pemetaan pola Lindra → komponen shadcn dan daftar komponen custom yang tidak dipetakan. Ikon: lucide-react (stroke 2), jangan emoji.
