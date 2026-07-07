---
name: lindra-review
description: "Protokol loop review-perbaikan UI Lindra pakai Playwright MCP. WAJIB dipakai setiap kali diminta 'jalankan review loop', 'review halaman', atau setelah membangun/mengedit halaman Lindra dan perlu verifikasi visual + aksesibilitas + kepatuhan token sebelum dianggap selesai. Berisi mekanik loop generik (screenshot 2 viewport, cek kontras/target-sentuh/warna-default/reduced-motion, batas iterasi). Cek spesifik per-halaman disuplai oleh prompt pemanggil."
---

# Lindra — Protokol Review Loop

Loop review-perbaikan visual untuk halaman Lindra. Dipanggil setelah build/edit sebuah halaman. Butuh Playwright MCP terhubung dan server dev jalan (default `http://localhost:3000`).

## Aturan loop

- **Batas iterasi:** maksimal 4 (halaman siswa/landing) atau 5 (Portal BK). Berhenti saat SEMUA cek lolos ATAU batas tercapai — mana yang lebih dulu.
- **Berhenti = benar-benar berhenti.** Jangan lanjut ke halaman lain. Tulis ringkasan apa yang diperbaiki tiap iterasi.
- **Screenshot MATI secara default (hemat token).** Loop berjalan HANYA pada accessibility tree + computed style + `boundingBox()`. Ini biaya token terbesar — jangan ambil gambar selama iterasi. Bahkan cek layout (overlap, navbar menimpa konten, z-index) dilakukan lewat geometri boundingBox + posisi, bukan gambar.
- **Screenshot hanya SEKALI di akhir**, opsional, setelah semua cek lolos: satu desktop 1280px + satu mobile 375px, sebagai artefak untuk reviewer manusia menilai estetika. Bukan untuk penilaian AI. Lewati kalau reviewer tidak memintanya.

## Tiap iterasi

1. Buka route target. Baca accessibility tree + computed style + `boundingBox()` langsung — TANPA screenshot. Cek layout (overlap, posisi sticky, z-index, elemen keluar viewport) lewat geometri boundingBox, bukan gambar.
2. Verifikasi CEK UNIVERSAL (berlaku semua halaman) + CEK SPESIFIK yang disuplai prompt pemanggil.
3. Ada yang gagal → perbaiki kode → ulangi dari langkah 1. Semua lolos → berhenti + ringkas.

## Cek universal (selalu, jangan menebak — ukur)

- **Kontras** teks ≥ 4.5:1 (ukur rasio sebenarnya). Perhatian khusus: teks di atas `--primary` HARUS `--ink`, bukan putih.
- **Target sentuh** ≥ 44px (tombol utama 48px).
- **Warna:** tidak ada kelas/warna default shadcn atau Tailwind mentah (`blue-*`, `slate-*`, dll) di DOM — semua lewat token Lindra.
- **Fokus:** `:focus-visible` terlihat saat tab ke elemen interaktif; halaman keyboard-navigable.
- **Reduced-motion:** emulate `prefers-reduced-motion: reduce` → reload → semua animasi mati, konten tetap utuh & terbaca.
- **Halaman siswa** (`/chat` `/draft` `/lacak`): QuickExit ada, dan di 375px pindah ke bawah full-width. **Portal BK** (`/bk/*`): QuickExit & EmergencyBar HARUS absen.

## Format ringkasan akhir

Per iterasi: apa yang gagal → apa yang diperbaiki. Di akhir: konfirmasi semua cek (universal + spesifik) lolos, atau daftar yang masih gagal saat batas iterasi tercapai.
