# Prompt — Fitur Follow-Up Proaktif (personalisasi skill + loop)

> Stack: `lindra-design`, `lindra-review` (loop, screenshot OFF), `ui-ux-pro-max` (UI kecil + a11y), `ponytail`. Melengkapi prompt §6 dokumen "Panduan Fitur Follow-Up Proaktif". Jalankan setelah fitur inti selesai. Server dev http://localhost:3000.
>
> **Rekonsiliasi state (WAJIB dibaca agent):**
> - Model `Followup` yang ADA sekarang: `id, reportId, scheduledAt, slaStatus ("pending|on-track|breached|done"), completedAt, createdAt`. TAMBAHKAN 4 kolom opt-in ke model ini — JANGAN asumsikan `sentAt/studentReplied/slaDeadline/escalated` sudah ada. Pemetaan: "SLA lewat" = `slaStatus === "breached"`; "sudah pernah dibuka" = ada `AuditLog action:"opened"` untuk report itu; tambahkan `escalated Boolean @default(false)` juga bila logika auto-escalate butuh penanda sekali-jalan.
> - Field narasi bernama `Report.narrative` (bukan `narrativeText`/`narrativeSummary`).
> - Belum ada infra cron/email — bangun. Enkripsi: reuse `lib/identity-crypto.ts`.

---

## PROMPT 1 — Backend & Frontend (Revano)

```
Aktif: lindra-design, lindra-review, ui-ux-pro-max, ponytail. Baca dokumen
"Panduan Fitur Follow-Up Proaktif" Bagian 2–5, CLAUDE.md, prisma/schema.prisma
(model Followup + Report), lib/identity-crypto.ts, lib/audit/log-action.ts,
app/(student)/draft/page.tsx (layar konfirmasi).

Bangun fitur follow-up proaktif. PONYTAIL: reuse maksimal (enkripsi identityData,
pola audit, ChatBubble); pakai Resend/SendGrid (jangan SMTP mentah); jangan tambah
tabel baru — cukup kolom.

1. MIGRASI: tambah ke model Followup yang ADA: contactEmail (String?, simpan
   TERENKRIPSI via identity-crypto — String menampung ciphertext base64),
   proactiveEnabled (Boolean @default(false)), noProgressCount (Int @default(0)),
   lastCheckinAt (DateTime?), dan escalated (Boolean @default(false)) untuk penanda
   auto-escalate sekali-jalan. Jalankan migrasi.

2. TOGGLE + CONSENT di layar konfirmasi (draft/page.tsx, Fase 8): toggle "Mau
   Lindra tanya kabar kamu nanti?", DEFAULT OFF. Saat dinyalakan, tampilkan teks
   consent PERSIS (Bagian 4.3 dokumen) SEBELUM form email muncul — bukan placeholder:
   "Follow-up ini akan dikirim ke email yang kamu masukkan. Pastikan ini email yang
   CUMA kamu yang bisa buka — bukan email keluarga, email sekolah, atau email yang
   passwordnya diketahui orang lain. Isi emailnya akan netral (tidak menyebut kata
   'kekerasan' atau 'laporan'), tapi tetap pastikan aman ya."
   Simpan email terenkripsi ke contactEmail. Gaya UI dari token Lindra; ini halaman
   siswa → QuickExit tetap ada.

3. EMAIL (Resend/SendGrid): template netral. WAJIB — body & subject TIDAK boleh
   memuat kode referensi, link auto-login, token URL, atau kata "kekerasan"/"laporan".
   Hanya ajakan membuka Lindra dan memasukkan kode secara MANUAL. From = domain netral.

4. CRON app/api/cron/followup-email/route.ts (jadwal FOLLOWUP_CRON_SCHEDULE):
   untuk tiap Followup lewat scheduledAt & proactiveEnabled — ikuti percabangan
   Diagram A:
   • Report BELUM pernah dibuka (tak ada AuditLog 'opened') & SLA breached →
     AUTO-ESCALATE SEKALI ke jalur SAPA 129 (set escalated=true), BUKAN via email.
   • Report sudah pernah dibuka (proses jalan, belum selesai) → kirim email follow-up
     netral (poin 3).

5. HALAMAN INPUT KODE MANUAL: halaman terpisah, satu form kode + tombol lanjut.
   TANPA token/kode di URL, tanpa auto-login. Verifikasi kode → mulai sesi follow-up.

6. noProgressCount: tiap sesi follow-up selesai tanpa konfirmasi progres → increment
   (+ update lastCheckinAt). Saat mencapai 3 → tampilkan OPSI kontak SAPA 129 ke siswa
   (tombol yang siswa pilih sendiri) — JANGAN kirim apa pun ke SAPA 129 otomatis.

7. Flag dashboard BK: saat noProgressCount bertambah, beri sinyal di detail laporan
   ("siswa mulai resah, belum ada progres ×N") — informatif, tanpa Lindra mengambil
   alih peran BK.

=== LOOP (lindra-review, screenshot MATI) === maks 5 iterasi. Cek KEAMANAN dulu:
- Toggle DEFAULT OFF (opt-in) — verifikasi state awal tidak aktif.
- Consent: teks lengkap tampil SEBELUM form email (bukan placeholder). Verifikasi
  string consent ada verbatim.
- EMAIL TANPA KODE/LINK (paling kritis): scan template/pengirim — tidak ada kode
  referensi, link auto-login, token URL, atau kata "kekerasan"/"laporan". WAJIB lolos.
- contactEmail tersimpan sebagai ciphertext di DB (bukan plaintext email terbaca).
- Cron branching benar (seed: 1 report belum dibuka+breached → escalate sekali, no
  email; 1 report sudah dibuka → email terkirim, tanpa kode/link).
- Halaman kode manual: tak ada token/kode di URL, tak ada auto-login.
- noProgressCount ke-3 → opsi SAPA 129 muncul ke siswa; TIDAK ada pengiriman otomatis.
- UI: token Lindra, kontras ≥4.5:1, target ≥44px, QuickExit di layar siswa, a11y.
Berhenti saat semua lolos atau 5 iterasi. Perbarui DESIGN.md §8 (follow-up: terbangun).
```

---

## PROMPT 2 — Context Injection sesi follow-up (Nabil)

```
Tambahkan context injection sesi follow-up TANPA membuat komponen/model AI baru —
penyesuaian kecil di endpoint chat yang ada (app/api/chat + lib/ai).

1. Deteksi jenis sesi: follow-up (siswa masuk lewat kode referensi existing) vs
   pelaporan baru.
2. Kalau follow-up: ambil Report.narrative (field bernama `narrative`, bukan
   narrativeText) + RoutingLog terkait, suntikkan ke system prompt SEBELUM sesi —
   jangan biarkan model menemukan konteks dari nol.
3. Instruksi tambahan: "Ini sesi lanjutan. Ringkasan laporan sebelumnya:
   [narrative]. Sapa dengan pertanyaan terbuka soal kabar; jangan membeberkan detail
   laporan kecuali siswa yang mengangkatnya." (non-leading, sama seperti sesi awal).
4. Tier 1 (deteksi krisis) WAJIB tetap aktif penuh di sesi ini, tanpa pengecualian.
5. Klasifikasi ringan di akhir sesi: siswa konfirmasi ada progres atau belum
   (ya/tidak sederhana) → menentukan apakah noProgressCount bertambah.

Keluarkan: lib/ai/prompts/followup-context-injection.ts + penyesuaian kecil deteksi
jenis sesi di client AI yang ada.
```

---

## Catatan
- Fitur ini menambah permukaan risiko (email tersimpan, kanal baru) — karena itu
  cek keamanan diletakkan PALING depan di loop, bukan setelah estetika.
- Tidak ada "kirim ulang kode" (trade-off disengaja, Bagian 4.4) — jangan bangun.
- Env: RESEND_API_KEY/SENDGRID_API_KEY, FOLLOWUP_EMAIL_FROM (domain netral),
  FOLLOWUP_CRON_SCHEDULE, key enkripsi bisa reuse identityData.
```