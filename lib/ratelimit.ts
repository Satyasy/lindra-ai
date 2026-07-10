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

// IP klien dari header proxy (Vercel set x-forwarded-for). "unknown" → satu bucket bersama
// (fail-closed ke arah lebih ketat, bukan bypass).
export function clientIp(req: Request): string {
  const fwd = req.headers.get("x-forwarded-for");
  return fwd ? (fwd.split(",")[0]?.trim() || "unknown") : "unknown";
}
