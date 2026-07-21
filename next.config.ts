import type { NextConfig } from "next";

// cacheComponents sengaja tidak diaktifkan: semua permukaan dinamis
// (cookie sesi chat, dashboard ber-auth) kecuali landing yang sudah statis default.
const nextConfig: NextConfig = {
  // Self-hosted tanpa sharp: next/image hanya dipakai untuk 2 aset logo statis,
  // optimasi runtime tidak sepadan dengan dependency native di ARM.
  images: { unoptimized: true },
  // Klon body untuk proxy.ts dipotong Next di 10MB default → upload video 25MB
  // (/api/evidence) terpotong & formData() gagal. Samakan dengan nginx (26m).
  experimental: { proxyClientMaxBodySize: "26mb" },
};

export default nextConfig;
