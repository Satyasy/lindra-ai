# Prompt — Audit Desain Menyeluruh (impeccable + geometri): overflow & elemen keluar batas

> Tujuan: temukan & perbaiki setiap elemen yang MELEBAR MELEWATI BATAS kontainernya (logo, CTA, teks, gambar keluar dari card/section), plus masalah sejenis (misalignment, radius tak konsisten, overflow horizontal). Stack: `impeccable` (audit/detector — keahlian utamanya), `lindra-review` (loop geometri Playwright), `ponytail`. `lindra-design` = otoritas token.
>
> **Kunci impeccable ke mode audit.** impeccable cenderung menulis PRODUCT.md/DESIGN.md & menyarankan palet/font sendiri. JANGAN biarkan menimpa design system Lindra. Saat `/impeccable init`, arahkan konteksnya ke sistem Lindra yang ADA (General Sans, token di globals.css, trauma-informed, register = "product"), atau lewati init dan jalankan audit dengan design.md sebagai acuan. Perbaikan HANYA pakai token Lindra — dilarang ganti warna/font.

---

## SETUP (sekali)
```
npx impeccable install
# /impeccable init → pilih register "product"; set konteks desain = design system
# Lindra yang ada (jangan buat palet/font baru). Kalau ragu, skip init & audit langsung.
```

---

## PROMPT — Audit & perbaiki overflow/keluar-batas di semua halaman

```
Aktif: impeccable (audit), lindra-review, ponytail; lindra-design = otoritas token.
Jalankan audit desain MENYELURUH lalu perbaiki. Cakupan SEMUA permukaan:
- Landing "/", chat "/chat", draft "/draft", lacak "/lacak",
- Portal BK: "/bk" (antrean/tabel), "/bk/[reportId]" (detail), ConsultPanel,
- Komponen global: PublicNavbar, StudentNav, SiteFooter (logo footer!), EmergencyBar,
  bubble chat, badge, kartu.

TAHAP 1 — DETEKSI (jangan asal ubah dulu)
- Jalankan detektor impeccable: `npx impeccable detect src/` (atau `/impeccable audit
  <area>` per halaman). Kumpulkan temuan deterministik.
- Fokus kelas masalah "keluar batas" & sejenisnya:
  1. Elemen anak (logo, ikon, gambar, CTA/tombol, badge, teks) yang bounding box-nya
     MELEBIHI kontainer/card-nya (kanan/bawah/atas/kiri keluar).
  2. Logo/gambar tidak ter-contain (butuh object-contain/max-w-full) → melar/terpotong.
  3. CTA/tombol lebih lebar dari card induk, atau teks tombol tidak muat (truncate/
     overflow).
  4. Overflow horizontal halaman (document.scrollWidth > clientWidth) di 375/768/1280/
     1440/1920/2560.
  5. Teks panjang tanpa wrap/clamp menembus card; kode referensi/ID panjang meluber.
  6. Border-radius / padding / tinggi kartu TIDAK konsisten antar komponen sejenis.
  7. Alignment meleset (grid/kolom tak sejajar), gap tak konsisten.
- Susun DAFTAR temuan (file, elemen, jenis, viewport) sebelum memperbaiki.

TAHAP 2 — PERBAIKI (ponytail: minimal, pakai token Lindra)
- Perbaiki tiap temuan dengan cara paling ringan: contain gambar (object-contain,
  max-w-full, w-auto), batasi lebar CTA ke kartunya, min-w-0 pada flex child yang
  meluber, line-clamp/truncate untuk teks/ID panjang, samakan radius/padding/tinggi
  via token. JANGAN ganti palet/font/identitas desain.

TAHAP 3 — VERIFIKASI (lindra-review loop geometri, screenshot OFF) maks 6 iterasi
Untuk SETIAP halaman + komponen di atas, di viewport 375/768/1280/1440/1920/2560:
- TIDAK ada overflow horizontal (scrollWidth ≤ clientWidth).
- TIDAK ada elemen yang bounding box-nya melewati batas kontainer terdekatnya
  (untuk tiap logo/CTA/badge/gambar/teks: rect ⊆ rect card induk, dgn toleransi
  bleed yang DISENGAJA saja).
- Logo (lindra-logo, logo-footer1/2/3) ter-contain, tidak melar/terpotong; footer
  1&2 sejajar, 3 di tengah, semua dalam lebar footer.
- CTA tidak lebih lebar dari card-nya; teks tombol tidak terpotong.
- Radius/padding kartu sejenis konsisten (ukur).
- (Jalankan ulang `npx impeccable detect src/` → temuan overflow/aturan terkait = 0
  atau hanya yang sengaja di-ignore.)
- Kontras ≥4.5:1, target ≥44px, fokus (tetap dijaga, jangan regresi a11y).
WAJIB akhir (screenshot ON): tiap halaman utama di 375 + 1440 + 2560 agar aku
konfirmasi visual tidak ada yang keluar batas.

Keluarkan: (a) daftar temuan awal, (b) ringkasan perbaikan per file, (c) hasil
verifikasi akhir (semua lolos / sisa yang disengaja).
Berhenti saat detektor + geometri bersih & screenshot dibuat.
```

---

## Catatan
- Ini prompt "read-mostly + perbaikan bedah" — cocok dijalankan TERAKHIR, setelah
  fitur/revisi lain selesai, sebagai pass poles akhir sebelum demo.
- Jangan aktifkan frontend-design & uiuxpromax bersamaan dengan impeccable di sesi
  ini — biar tidak berebut konteks; audit ini cukup impeccable + geometri Playwright.
- Toleransi "bleed disengaja" (mis. ilustrasi pojok hero) harus ditandai eksplisit
  agar tidak dianggap bug — sisanya wajib di dalam batas.