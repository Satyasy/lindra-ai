// Rate limiter in-memory — anti brute-force entry kode follow-up (tebak referral code).
// ponytail: counter per-instance (di Vercel = per-lambda, jadi cap efektif = max × jumlah
// instance). Cukup untuk skala sekolah; pindah ke store bersama (Upstash/Redis) HANYA bila
// brute-force lintas-instance jadi ancaman nyata. Map tumbuh sebesar jumlah IP unik per
// window — dibersihkan lazily saat key kadaluarsa, tak perlu sweeper terpisah.

type Bucket = { count: number; resetAt: number };
const buckets = new Map<string, Bucket>();

// true = boleh lanjut, false = kena limit.
export function rateLimit(key: string, max: number, windowMs = 60_000): boolean {
  const now = Date.now();
  const b = buckets.get(key);
  if (!b || now >= b.resetAt) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }
  if (b.count >= max) return false;
  b.count++;
  return true;
}

// IP klien dari header proxy. Ambil elemen TERAKHIR: nginx kita menaruh IP asli di
// paling belakang ($proxy_add_x_forwarded_for meng-append). Klien bisa memalsukan
// elemen-elemen di DEPAN, jadi ambil [0] = bypass rate-limit (kirim XFF acak tiap
// request → bucket baru terus). "unknown" → satu bucket bersama (fail-closed).
export function clientIp(req: Request): string {
  const fwd = req.headers.get("x-forwarded-for");
  if (!fwd) return "unknown";
  const parts = fwd.split(",").map((s) => s.trim()).filter(Boolean);
  return parts.length ? parts[parts.length - 1]! : "unknown";
}
