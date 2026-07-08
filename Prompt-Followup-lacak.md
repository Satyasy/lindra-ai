# Prompt — Follow-Up Proaktif di /lacak (penyempurnaan)

> Stack: `lindra-design`, `lindra-review` (loop), `ui-ux-pro-max`, `ponytail`.
> **Perluasan** dari `prompt-followup-proaktif.md` — jangan ulang yang sudah ada
> (migrasi kolom Followup, cron, template email, halaman kode manual, context
> injection). Prompt ini menambah PENEMPATAN & FLOW spesifik. Target:
> `app/(student)/lacak/page.tsx`, layanan email, sesi follow-up. Server dev http://localhost:3000.

---

## PROMPT — Toggle follow-up di /lacak + email sapaan + re-entry

```
Baca prompt-followup-proaktif.md (fitur dasar sudah dibangun/ direncanakan),
app/(student)/lacak/page.tsx, prisma/schema.prisma (Followup, ReferralCode, Report),
lib/identity-crypto, dan lib email (Resend/SendGrid). Tambahkan penempatan & flow:

1) TOGGLE DI /lacak (setelah cek status)
- Setelah "Cek status" mengembalikan laporan VALID (timeline tampil), tampilkan di
  bawahnya panel opsi: toggle "Mau ditanyain kabarnya nanti?" — DEFAULT OFF.
- Toggle terikat ke Followup laporan yang barusan dicek (bukan global).
- Saat DINYALAKAN → WAJIB isi "email rahasia": tampilkan teks peringatan PERSIS
  (Bagian 4.3 dokumen follow-up) sebelum form — email yang HANYA korban bisa buka,
  bukan email keluarga/sekolah. Simpan TERENKRIPSI (identity-crypto) ke
  Followup.contactEmail; set proactiveEnabled=true. Mati lagi → proactiveEnabled=false.
- UI dari token Lindra; ini halaman siswa → QuickExit tetap. Gunakan komponen
  toggle aksesibel (role switch, keyboard).

2) PEMICU EMAIL (dokumen tak segera diproses BK/Satgas)
- Reuse cron follow-up yang ada. Kondisi kirim email = laporan proactiveEnabled &
  lewat scheduledAt & BELUM diproses/diterima (tak ada AuditLog action:"opened"
  untuk laporan di antrean BK/Satgas → "belum diterima"). 
- SAFETY NET (pertahankan dari dokumen): jika kasus KRITIS dan sama sekali diabaikan
  (belum dibuka + SLA breached), auto-escalate SEKALI ke jalur SAPA 129 (escalated=true)
  DI SAMPING email — email saja tak cukup untuk anak dalam bahaya yang diabaikan.

3) ISI EMAIL (netral — aturan keras)
- Template sapaan netral, mis: "Halo, apa kabar? Bagaimana kondisimu sekarang?
  Yuk cerita lagi." + LINK ke halaman "Masukkan Kode" Lindra.
- LINK HANYA ke menu input kode (mis. /lacak atau /masuk-kode) — TANPA kode
  referensi, TANPA token, TANPA auto-login di URL. Korban mengetik kodenya sendiri.
- Subject & body TIDAK memuat kata "kekerasan"/"laporan"/nama sekolah. From = domain netral.

4) RE-ENTRY → SESI FOLLOW-UP (bawa konteks dokumen yang belum dibalas)
- Dari link → menu Masukkan Kode → verifikasi ReferralCode (server-side).
- Valid → masuk /chat. Rekonsiliasi dengan flow "Masukkan Kode" (PART 2 prompt
  antrean): tetap muat riwayat + tombol sidebar, TAPI sesi di-PRIME sebagai
  follow-up: suntik Report.narrative (field `narrative`) sebagai konteks (context
  injection Nabil), buka dengan pertanyaan kabar terbuka & non-leading, JANGAN
  membeberkan detail kecuali siswa mengangkatnya. "Belum pernah dibalas" = laporan
  tanpa progres/AuditLog 'opened'.
- Tier 1 (deteksi krisis) WAJIB aktif penuh di sesi ini.
- Chrome tetap "Catatan Harian"; tanpa token/kode di URL.

PONYTAIL: reuse Followup/cron/email/identity-crypto/context-injection yang ada;
jangan bikin model/route baru bila cukup yang ada. /ponytail-review pada diff —
jangan buang: enkripsi email, aturan email-tanpa-kode, safety-net escalation, Tier 1.

=== LOOP (lindra-review, screenshot OFF; 1 screenshot akhir) === maks 4 iterasi.
- Toggle di /lacak muncul HANYA setelah cek status valid; DEFAULT OFF; terikat
  laporan itu.
- ON → email wajib + teks peringatan tampil verbatim; contactEmail tersimpan
  CIPHERTEXT (bukan plaintext).
- EMAIL: scan template → TIDAK ada kode/token/auto-login/kata sensitif; link hanya
  ke menu input kode. (Cek paling kritis.)
- Cron: seed laporan belum-diproses+proactiveEnabled → email terkirim; kasus
  kritis-diabaikan → escalate SAPA sekali (tanpa email berisi kode).
- Re-entry: kode valid → /chat ter-prime follow-up dengan konteks narrative,
  non-leading; Tier 1 aktif; tak ada token/kode di URL; QuickExit ada.
- Kontras ≥4.5:1, target ≥44px, toggle keyboard-operable, fokus terlihat, token only.
- Screenshot /lacak (state setelah toggle ON) untuk aku nilai.
Berhenti saat cek terukur lolos.
```

---

## Ringkas
1. Toggle "Mau ditanyain kabarnya nanti?" di /lacak (setelah cek status, default OFF).
2. ON → email rahasia wajib, tersimpan terenkripsi.
3. Email sapaan netral + link ke menu Masukkan Kode (tanpa kode/token/auto-login).
4. Re-entry → sesi follow-up baru yang membawa konteks dokumen (belum dibalas), Tier 1 aktif.
5. Safety-net: kasus kritis yang diabaikan tetap eskalasi SAPA 129 sekali, bukan email saja.