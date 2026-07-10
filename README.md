# Lindra

Lindra adalah platform pelaporan kekerasan sekolah berbasis percakapan untuk siswa SMP dan SMA di Indonesia. Alih-alih formulir yang kaku dan menakutkan, siswa cukup bercerita lewat obrolan kepada asisten yang dirancang secara trauma-informed. Sistem lalu menyusun cerita itu menjadi laporan yang terstruktur dan meneruskannya ke pihak yang paling tepat menangani — guru BK di sekolah, Satgas pendidikan daerah, atau layanan perlindungan anak nasional SAPA 129.

Dokumen ini menjelaskan cara menjalankan proyek, baik dengan Docker maupun untuk pengembangan, beserta prinsip-prinsip yang menjadi dasar rancangannya.

## Mengapa Lindra dibuat seperti ini

Anak yang mengalami kekerasan sering kali tidak melapor karena takut, malu, atau tidak tahu harus ke mana. Karena itu setiap keputusan desain di sini berpihak pada keselamatan pelapor, bukan pada kenyamanan sistem.

Beberapa prinsip yang perlu dipahami sebelum menilai proyek ini:

- Kecerdasan buatan tidak pernah memutuskan ke mana laporan dikirim dan tidak pernah menyimpulkan siapa yang bersalah. Perutean laporan ditentukan oleh mesin aturan (if-else) yang sederhana dan dapat diaudit. AI hanya membantu siswa bercerita dan menyusun narasi.
- Catatan audit (audit_log) bersifat append-only dan ditegakkan di level basis data, bukan sekadar di kode aplikasi. Aplikasi berjalan sebagai peran database khusus yang tidak punya hak mengubah atau menghapus baris audit. Ini menjaga rantai bukti tetap utuh.
- Identitas siswa (bila memilih melapor dengan nama) dan alamat email untuk tindak lanjut disimpan dalam bentuk terenkripsi (AES-256-GCM), bukan teks biasa.
- Antarmuka siswa menghormati kondisi perangkat bersama yang mungkin diawasi pelaku: judul tab dibuat netral, tersedia tombol keluar cepat, dan sesi dapat dihapus sepenuhnya.
- Petugas BK tidak pernah menerima aksi otomatis dari skor urgensi AI. Penugasan dan status penanganan selalu ditentukan manual, dan ringkasan laporan sengaja dipotong agar petugas tetap membuka dan membaca narasi lengkap sebelum bertindak.

## Alur singkat

Sisi siswa: siswa memulai percakapan, menceritakan kejadian, meninjau draf laporan, lalu mengirim secara anonim atau dengan nama. Setelah terkirim siswa menerima sebuah kode referensi yang bisa dipakai memantau status penanganan tanpa harus membuka identitas.

Sisi petugas (Portal BK dan Satgas): laporan yang masuk tampil sebagai antrean dalam bentuk tabel. Petugas dapat mencari, memfilter, membuka detail laporan, membuka identitas pelapor (tercatat di audit), mengubah status penanganan, dan berbalas pesan pendampingan dengan pelapor.

Mesin perutean memastikan laporan yang menyebut pelaku guru atau staf sekolah diteruskan ke Satgas eksternal, laporan yang menyebut pelaku orang tua atau wali diteruskan ke SAPA 129, dan kasus kritis masuk jalur eskalasi darurat. Laporan seperti ini tidak pernah muncul di antrean BK sekolah.

## Teknologi

Proyek ini dibangun dengan Next.js 16 (App Router) dan TypeScript, dengan antarmuka memakai Tailwind CSS. Data disimpan di PostgreSQL dengan ekstensi pgvector, diakses melalui Prisma. Otentikasi petugas memakai NextAuth dengan sesi JWT. Percakapan dan transkripsi suara ditenagai model bahasa melalui Groq, sedangkan email tindak lanjut dikirim melalui Resend.

## Menjalankan dengan Docker Compose

Cara ini paling cepat karena Docker akan menyiapkan basis data, menjalankan migrasi, mengisi data contoh, dan menyalakan aplikasi sekaligus.

Prasyarat: Docker Desktop yang sudah berjalan.

1. Salin berkas contoh konfigurasi menjadi `.env`:

   ```
   cp .env.example .env
   ```

   Isi minimal ketiga kunci `GROQ_API_KEY_*` agar fitur percakapan berfungsi, dan isi `GROQ_API_KEY_STT` agar tombol suara (voice-to-text) aktif — boleh diisi nilai yang sama dengan kunci lain. Kunci selebihnya boleh dibiarkan kosong untuk demo (email akan dilewati bila `RESEND_API_KEY` kosong).

2. Bangun dan jalankan seluruh layanan:

   ```
   docker compose up -d --build
   ```

3. Buka http://localhost:3000

Aplikasi berjalan di port 3000, PostgreSQL di port 5432, dan Adminer (peninjau basis data) di http://localhost:8080. Untuk menghentikan semua layanan gunakan `docker compose down`.

## Menjalankan untuk pengembangan

Cara ini menjalankan hanya basis data di dalam Docker, sementara server Next.js berjalan langsung di mesin Anda sehingga pemuatan ulang saat mengedit kode lebih cepat.

Prasyarat: Node.js versi 22 atau lebih baru, serta Docker (untuk PostgreSQL).

1. Pasang dependensi:

   ```
   npm install
   ```

2. Salin `.env.example` menjadi `.env`, lalu isi nilainya. Dua rahasia bisa Anda bangkitkan sendiri:

   ```
   openssl rand -base64 32    # untuk NEXTAUTH_SECRET
   openssl rand -hex 32       # untuk IDENTITY_ENCRYPTION_KEY
   ```

3. Nyalakan basis data:

   ```
   docker compose up -d db
   ```

4. Terapkan skema. Langkah ini membuat seluruh tabel, membuat peran aplikasi `lindra_app`, dan menegakkan aturan append-only pada audit_log:

   ```
   npx prisma migrate deploy
   ```

5. Isi data contoh (akun petugas dan sejumlah laporan):

   ```
   npm run db:seed
   ```

6. Jalankan server pengembangan:

   ```
   npm run dev
   ```

   Aplikasi tersedia di http://localhost:3000

## Akun demo

Untuk masuk ke Portal BK (halaman `/bk`), gunakan salah satu akun berikut. Kata sandinya sama: `lindra-demo`.

- `bk@sekolah.sch.id` — petugas BK sekolah
- `satgas@disdik.go.id` — petugas Satgas

## Variabel lingkungan

| Nama | Wajib | Keterangan |
| --- | --- | --- |
| `DATABASE_URL` | ya | Koneksi sebagai peran aplikasi `lindra_app` (tanpa hak ubah/hapus audit_log). |
| `DIRECT_DATABASE_URL` | ya | Koneksi superuser, hanya dipakai saat migrasi. |
| `GROQ_API_KEY_STUDENT` | ya | Percakapan utama siswa. |
| `GROQ_API_KEY_BK` | ya | Klasifikasi lanjutan dan rekomendasi kasus. |
| `GROQ_API_KEY_BACKUP` | ya | Cadangan otomatis saat kena batas laju. |
| `GROQ_API_KEY_STT` | untuk suara | Transkripsi suara ke teks (voice-to-text). Wajib diisi agar tombol mic berfungsi; boleh sama nilainya dengan kunci lain. Kosongkan hanya bila fitur suara tidak dipakai. |
| `NEXTAUTH_SECRET` | ya | Kunci penandatangan sesi. |
| `NEXTAUTH_URL` | ya | URL dasar aplikasi (mis. http://localhost:3000). |
| `IDENTITY_ENCRYPTION_KEY` | ya | Kunci AES-256-GCM (32 byte hex) untuk enkripsi identitas dan email. |
| `RESEND_API_KEY` | tidak | Pengiriman email tindak lanjut; bila kosong email dilewati. |
| `FOLLOWUP_EMAIL_FROM` | tidak | Alamat pengirim email tindak lanjut. |
| `CRON_SECRET` | tidak | Melindungi endpoint cron tindak lanjut. |
| `SLA_THRESHOLD_HOURS` | tidak | Ambang waktu tindak lanjut, default 48. |
| `NEXT_PUBLIC_DEMO_MODE` | tidak | Bila `true`, pintasan ke halaman chat ditampilkan di landing untuk keperluan demo. |

Berkas `.env` berisi rahasia dan tidak pernah ikut ke dalam image Docker maupun ke penyedia hosting. Pada penerapan di cloud, isi variabel-variabel ini melalui pengaturan environment penyedia, bukan dengan mengunggah `.env`.

## Pengujian

```
npm test
```

Perintah ini menjalankan pengujian unit dan integrasi. Sebagian pengujian, khususnya yang membuktikan audit_log tidak dapat diubah dan bahwa laporan pelaku guru atau orang tua tidak masuk antrean BK, memerlukan basis data yang sedang berjalan (`docker compose up -d db`).

## Struktur ringkas

- `app/` — halaman dan endpoint (App Router). Sisi siswa di `app/(student)`, Portal BK di `app/bk`, endpoint di `app/api`.
- `lib/` — logika inti: mesin perutean, enkripsi identitas, otentikasi, pencatatan audit, integrasi AI.
- `prisma/` — skema basis data, migrasi, dan skrip pengisian data contoh.
- `components/` — komponen antarmuka.

## Lisensi

Dilisensikan di bawah [Apache License 2.0](LICENSE).

---

Tim Repesta — SMK Telkom Sidoarjo
