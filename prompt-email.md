# Prompt — Revisi Chat Siswa, Tombol Krisis, Logo Footer, Email SMTP Follow-Up

> Stack: `lindra-design` (otoritas), `lindra-review` (loop, screenshot OFF), `ui-ux-pro-max`, `ponytail`. (impeccable dipakai di prompt audit terpisah.) Server dev http://localhost:3000.
>
> **Prasyarat aset:** file logo harus ADA di `public/`: `lindra-logo.png`, `logo-footer1.png`, `logo-footer2.png`, `logo-footer3.png`. Verifikasi dulu; kalau belum ada, hentikan dan beri tahu (jangan pakai placeholder).

---

## PART A — Nav & darurat chat siswa (StudentNav + ChatScreen)

```
Baca components/nav/StudentNav.tsx, components/chat/ChatScreen.tsx, CLAUDE.md,
lindra-design. Terapkan:

1) DARURAT (sidebar) = HANYA 2: "Guru BK" (nomor dummy, tel:) + "SAPA 129" (tel:129).
   HAPUS Polisi 110 & Ambulans 119 di semua tempat darurat sisi siswa.
2) LOGOUT: pertahankan "Kembali ke beranda" DAN tambahkan item "Keluar" (di bawah
   nav / area terpisah). "Keluar" = hapus sesi lokal siswa (sessionId cookie + state)
   lalu arahkan ke "/". Ini fitur privasi untuk perangkat bersama, bukan akun.
3) LOGO: ganti mark inline SVG "Lindra" dengan <Image src="/lindra-logo.png"> (ukuran
   proporsional, alt="Lindra"), BISA DIKLIK → mengarah ke "/". Pastikan logo TIDAK
   melebihi lebar kontainer sidebar (object-contain, max-w penuh).

CATATAN ATURAN: menampilkan logo/nama "Lindra" di chrome siswa membalik §1.4
(dulu netral "Catatan Harian"). Ini keputusan pemilik produk — PERBARUI §1.4 di
CLAUDE.md & design.md agar logo Lindra di sisi siswa = diizinkan (jangan biarkan
loop menggagalkannya). Judul tab boleh tetap netral bila kamu mau.

LOOP (lindra-review): darurat hanya Guru BK + SAPA 129 (Polisi/Ambulans absen);
"Kembali ke beranda" + "Keluar" keduanya ada; "Keluar" menghapus sesi → "/"; logo
render dari /lindra-logo.png, klik → "/", tidak melebar lewat sidebar; kontras/target
≥44px; QuickExit tetap.
```

---

## PART B — Tombol krisis di chat (Nabil)

```
Baca app/api/chat/route.ts (deteksi krisis/Tier 1) + ChatScreen.tsx. Dua pemicu,
DUA set tombol berbeda. Ambulans & Polisi DIHILANGKAN dari semua.

PEMICU 1 — Dokumen teridentifikasi KRITIS/DARURAT (setelah laporan disubmit & masuk
BK): di sisi korban, DI ATAS kolom chat, tampilkan tombol "Kirim dokumen ke SAPA 129".
- Tombol → link WhatsApp wa.me ke nomor SAPA 129 (atau dummy) dengan teks
  ter-prefill = RINGKASAN kejadian dari dokumen (Report.narrative diringkas).
  Format: https://wa.me/<nomor>?text=<encodeURIComponent(ringkasan)>.
- Muncul HANYA untuk kasus kritis. Korban yang menekan (student agency).

PEMICU 2 — Terdeteksi KATA BERBAHAYA (Tier 1 crisis dalam percakapan): tampilkan 2
tombol: "Telpon SAPA 129" (tel:129) + "Telpon Guru BK" (tel:<dummy>). TANPA Ambulans/
Polisi. Ini menggantikan isi EmergencyBar lama pada fase danger.

Warna merah (--danger) untuk konteks krisis ini (sesuai aturan: merah = krisis).
ponytail: reuse EmergencyBar/logic yang ada; jangan bikin komponen berlebih.

LOOP (lindra-review): 
- Kasus kritis (seed) → tombol "Kirim dokumen ke SAPA 129" muncul di atas chat korban;
  href wa.me benar + teks ringkasan ter-encode; TIDAK muncul untuk kasus non-kritis.
- Deteksi kata berbahaya (seed frasa) → muncul "Telpon SAPA 129" + "Telpon Guru BK"
  (tel: benar), TANPA Ambulans/Polisi.
- Kontras teks di atas --danger ≥4.5:1, target ≥44px.
```

---

## PART C — Logo di footer (SiteFooter)

```
Baca components/layout/SiteFooter.tsx. Di bawah wordmark "Lindra" + kalimat identitas:
- Tampilkan logo-footer1.png & logo-footer2.png BERDAMPINGAN (sejajar horizontal,
  gap konsisten, tinggi seragam, object-contain).
- Di BAWAH kedua logo itu: logo-footer3.png, DI TENGAH (mx-auto / center).
- Semua <Image> dengan alt bermakna, ukuran wajar, TIDAK melebihi lebar kolom footer.
Responsif: di mobile tetap rapi (boleh tetap berdampingan bila muat, atau wrap center).

LOOP (lindra-review): ketiga logo render dari /logo-footer{1,2,3}.png; 1&2 sejajar,
3 di tengah di bawahnya; tak ada yang melebar keluar footer (x+width ≤ lebar footer);
kontras logo di atas --ink cukup terlihat.
```

---

## PART D — Email follow-up via SMTP (revisi timing & auto-on)

```
Baca components/followup/FollowupToggle.tsx, app/api/followup/enable/route.ts,
app/api/cron/followup-email/route.ts, lib/identity-crypto. Revisi:

1) SMTP: ganti pengirim ke nodemailer + SMTP (env: SMTP_HOST, SMTP_PORT, SMTP_USER,
   SMTP_PASS, FOLLOWUP_EMAIL_FROM). Email check-in dikirim KE gmail yang diisi user.
2) AUTO-ON: begitu user menyimpan email (setelah teks consent/peringatan email-rahasia
   ditampilkan & disetujui — JANGAN skip consent), proactiveEnabled langsung true.
3) TIMING DEMO: kirim email pertama ~1 menit setelah disimpan (bukan menunggu SLA
   berhari-hari). Implementasi: set scheduledAt = now + 60 detik + cron/worker yang
   jalan tiap menit; atau trigger terjadwal. (ponytail: seramping mungkin, jangan
   library scheduler berat.)

TETAP PATUHI aturan keselamatan email (dari fitur follow-up):
- Body & subject NETRAL — tanpa kata "kekerasan"/"laporan"/nama sekolah. Sapaan mis:
  "Halo, apa kabar? Bagaimana kondisimu sekarang? Yuk cerita lagi."
- Link HANYA ke menu Masukkan Kode — TANPA kode/token/auto-login di URL.
- contactEmail tersimpan TERENKRIPSI (identity-crypto).

LOOP (lindra-review): simpan email → consent tampil dulu; proactiveEnabled jadi true;
scheduledAt ≈ now+60s; email terkirim via SMTP ke alamat itu (verifikasi log/transport
di dev, mis. mailtrap/console transport); template TANPA kode/token/kata sensitif;
contactEmail ciphertext di DB.
```

---

## Catatan
- Kerjakan A → B → C → D. B menyentuh api/chat (koordinasi dgn Nabil).
- Perbarui §1.4 (logo siswa) saat PART A. Perbarui DESIGN.md §8 bila relevan.
- Env SMTP jangan di-hardcode; taruh di .env.