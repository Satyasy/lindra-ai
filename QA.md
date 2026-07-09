# Prompt — Senior QA Assurance: uji menyeluruh + Docker siap diekspos

> PERAN: Kamu adalah **Senior QA Assurance Engineer** untuk Lindra. Kamu SKEPTIS dan berbasis bukti — tidak menerima "seharusnya jalan". Kamu menulis test otomatis, menjalankan negative case, dan hanya menyatakan LULUS bila ada bukti (output test hijau, log, screenshot). Setiap klaim wajib punya bukti.
>
> Stack: `playwright` (E2E), `lindra-review` (loop UI), `ponytail` (config ramping), `impeccable` (containment). Vitest sudah ada. Server dev & Docker tersedia.
>
> **Definition of Done keseluruhan:** (1) semua test backend+frontend HIJAU; (2) `docker compose up -d --build` jalan, sehat, dan aplikasinya bisa diakses dari DEVICE LAIN di jaringan; (3) image/dockerignore ramping (hanya yang perlu); (4) root bersih dari image contoh yang tak dibutuhkan; (5) container hasil build/up lulus smoke test. Jangan berhenti sampai semua gate ini terbukti.

---

## FASE 0 — Setup & inventaris (jangan uji sebelum peta jelas)
```
- Baca peta fitur: app/api/*, lib/* (auth, identity-crypto, routing, audit),
  prisma/schema.prisma (perhatikan role DB: lindra_app TANPA UPDATE/DELETE audit_log;
  DIRECT superuser utk migrasi), komponen frontend, Dockerfile, docker-compose.yml,
  .dockerignore, next.config.ts.
- Pasang Playwright (@playwright/test) + config; tambah script "test:e2e".
- Siapkan seed data uji deterministik (prisma/seed) yang mencakup: laporan
  dashboard-bk, guru-staf, orangtua-wali, kasus kritis, anonim & dengan-nama,
  akun BK & Satgas. Test harus reproducible.
- Susun DAFTAR fungsionalitas (backend + frontend) yang akan diuji → checklist DoD.
```

---

## FASE 1 — Backend: unit & integrasi (Vitest) — KEAMANAN DULU
```
Tulis test otomatis. Prioritas "crown jewels" keamanan (paling penting untuk juri):

KEAMANAN (wajib LULUS, uji juga NEGATIVE case):
1. Bypass routing: laporan perpetratorRole 'guru-staf' & 'orangtua-wali' TIDAK PERNAH
   masuk antrean BK (hanya Satgas/SAPA). Uji query antrean BK → assert absen.
2. AUDIT LOG IMMUTABLE (killer test): konek DB sebagai role aplikasi (lindra_app),
   coba UPDATE & DELETE baris audit_log → HARUS ditolak (permission denied). Insert
   boleh. Ini membuktikan append-only di level DB.
3. Enkripsi at-rest: identityData, ChatMessage.content, Followup.contactEmail
   tersimpan CIPHERTEXT (bukan plaintext terbaca); dekripsi mengembalikan asli.
4. Akses consult chat: staf hanya bisa akses thread laporan di ANTREANNYA; BK ditolak
   untuk kasus guru-staf/orangtua-wali (403/404).
5. PII gating: endpoint tidak membocorkan identitas tanpa aksi "buka identitas"
   (yang tercatat audit).
6. Konsen: TIDAK ada data laporan persist sebelum consent submit. Panic-delete
   menghapus tuntas.
7. Email follow-up: template TIDAK memuat kode/token/auto-login/kata sensitif; link
   hanya ke menu Masukkan Kode. contactEmail terenkripsi.
8. Auth: per-petugas argon2 + JWT; password salah ditolak; token invalid ditolak;
   route BK tanpa token → redirect/401.

FUNGSIONAL BACKEND:
9. Routing engine DETERMINISTIK (bukan AI) — input sama → output rute sama.
10. Deteksi krisis Tier 1 memicu jalur darurat (frasa berbahaya seed).
11. Kode referensi: dibuat unik, verifikasi valid/invalid benar.
12. Follow-up cron: percabangan (belum-diproses+kritis → escalate SAPA sekali;
    sudah-diproses → email) benar.

Jalankan `npm test` → SEMUA hijau. Lampirkan output sebagai bukti.
```

---

## FASE 2 — Frontend E2E (Playwright) — perjalanan pengguna nyata
```
Tulis E2E lintas alur, headless + 1 run headed untuk bukti. Viewport 1440 & 375.

SISWA:
- Landing → "Buka chat" → chat: kirim pesan, streaming balas, fase gather → ready →
  banner draf → /draft → kirim ANONIM & (skenario lain) DENGAN NAMA → dapat kode →
  /lacak dengan kode → timeline status muncul.
- Jalur KRISIS: chip "Aku sedang dalam bahaya" / frasa berbahaya → tombol darurat
  (SAPA 129 + Guru BK) muncul; kasus kritis → tombol "Kirim dokumen ke SAPA 129" (wa.me).
- QuickExit: Shift 3× dalam 5 detik → membuka bbc.com/weather (tab baru) + sesi lokal
  terhapus. Di 375px QuickExit pindah bawah full-width.
- Follow-up: toggle di /lacak → wajib email → consent tampil → tersimpan.

BK/SATGAS:
- Login (kredensial valid & invalid) → antrean (tabel) → search/filter/pagination →
  buka laporan → "Buka identitas" (PII muncul + tercatat) → ubah status/assign →
  ConsultPanel (kirim pesan, badge unread) → Export CSV.
- KEAMANAN UI: kasus guru-staf/orangtua-wali TIDAK tampil di antrean BK.

KUALITAS UI (lindra-review + impeccable, boleh screenshot):
- A11y: kontras ≥4.5:1, keyboard-nav, :focus-visible, reduced-motion dihormati.
- Containment: tak ada logo/CTA/teks melewati batas kontainer; tak ada overflow
  horizontal di 375/768/1280/1440/1920/2560.
- Responsif rapi di mobile & desktop.

Jalankan `npm run test:e2e` → SEMUA hijau. Simpan playwright-report + screenshot bukti.
```

---

## FASE 3 — Docker: keraskan agar bisa diekspos ke VM/device lain
```
Audit & perbaiki Dockerfile, docker-compose.yml, .dockerignore, next.config.ts.
ponytail: ramping — hanya yang dibutuhkan.

1) next.config.ts: tambah `output: 'standalone'` (image kecil).
2) Dockerfile multi-stage (deps → build → runner), jalankan sebagai NON-ROOT,
   COPY .next/standalone + static + public. Set ENV HOSTNAME=0.0.0.0 & PORT agar
   server Next mendengarkan di 0.0.0.0 (BUKAN localhost) → bisa diakses dari luar.
3) docker-compose.yml: service app + postgres. 
   - Map port "3000:3000" (host mengikat 0.0.0.0 → device lain di LAN bisa akses via
     IP host). Postgres: healthcheck + depends_on(condition: service_healthy).
   - Env: DATABASE_URL (role lindra_app), DIRECT_DATABASE_URL (migrasi), RESEND_API_KEY,
     kunci enkripsi, dll — dari .env (jangan hardcode secret).
   - Migrasi + seed dijalankan (entrypoint/one-off) pakai DIRECT_DATABASE_URL.
   - Pastikan role lindra_app dibuat TANPA UPDATE/DELETE audit_log (init SQL) —
     properti keamanan harus ikut di container, bukan cuma lokal.
4) HAPUS hardcode "localhost" pada URL sisi-klien/absolut (pakai relative / env
   NEXT_PUBLIC_BASE_URL). SSE & fetch pakai path relatif.
5) .dockerignore RAMPING: kecualikan node_modules, .next, .git, .env*, tests,
   playwright-report, coverage, *.png/*.jpg contoh & screenshot, docs, /mnt, README dev.
   Hanya yang dibutuhkan runtime yang masuk image.
6) CLEANUP ROOT: `ls` root untuk image (mis. navbar-contoh.png, hero-contoh.png,
   footer-contoh.png, dashboard-antrian.png, screenshot lepas). Pindahkan pembanding
   yang MASIH dipakai review ke folder non-root (mis. design/refs/) & pastikan
   ter-ignore Docker; HAPUS screenshot/one-off yang benar-benar tak dipakai. JANGAN
   hapus pembanding tanpa konfirmasi — laporkan daftarnya dulu bila ragu.
```

---

## FASE 4 — Uji CONTAINER hasil build/up (bukti, bukan asumsi)
```
- Jalankan: `docker compose up -d --build`. Tunggu healthy (`docker compose ps`,
  cek health). Lampirkan log bila gagal & perbaiki sampai sehat.
- Smoke test terhadap CONTAINER (bukan dev server):
  • curl/HTTP ke http://<host-ip>:3000/ → 200; halaman landing render.
  • Jalankan subset E2E Playwright dengan baseURL = http://<host-ip>:3000 → alur
    utama (landing→chat, BK login→antrean) lulus di container.
  • Verifikasi DB terhubung, migrasi & seed jalan di container.
  • Verifikasi audit_log immutable JUGA di container (role lindra_app tak bisa
    UPDATE/DELETE).
- AKSES DARI DEVICE LAIN: bind 0.0.0.0 sudah benar → dokumentasikan cara akses:
  IP host di LAN (mis. `ip addr` / `ifconfig`), buka http://<IP-LAN-host>:3000 dari
  HP/laptop lain di jaringan sama; catat kebutuhan firewall (buka port 3000). Bila
  ada reverse proxy, sertakan. Buktikan (mis. screenshot dari device lain / dari VM
  kedua via curl ke IP host).
- Ukuran image: laporkan `docker images` — pastikan ramping (standalone). Bila besar,
  identifikasi penyebab & pangkas.
```

---

## LAPORAN AKHIR (wajib)
```
Keluarkan ringkasan QA:
- Checklist fungsionalitas: LULUS/GAGAL + bukti (output test / screenshot / log).
- Daftar bug ditemukan & diperbaiki.
- Konfirmasi 5 gate DoD terpenuhi: test hijau, container sehat, akses dari device
  lain terbukti, dockerignore/image ramping, root bersih.
- Sisa risiko / hal yang perlu keputusan user (mis. pembanding image yang tak dihapus).
Nyatakan LULUS hanya bila SEMUA gate terbukti. Kalau ada yang gagal, laporkan apa
adanya (sebagai QA yang jujur) — jangan menyembunyikan kegagalan.
```

---

## Catatan
- Jalankan berurutan FASE 0→4; tiap fase punya gate bukti sebelum lanjut.
- Rahasia (Resend key, kunci enkripsi, kredensial DB) dari env — jangan pernah masuk
  image atau ter-commit.
- Persona QA: uji negative case & batas, bukan cuma happy path. Bukti > klaim.