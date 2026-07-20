import type { NextConfig } from "next";

// cacheComponents sengaja tidak diaktifkan: semua permukaan dinamis
// (cookie sesi chat, dashboard ber-auth) kecuali landing yang sudah statis default.
const nextConfig: NextConfig = {
  // Self-hosted tanpa sharp: next/image hanya dipakai untuk 2 aset logo statis,
  // optimasi runtime tidak sepadan dengan dependency native di ARM.
  images: { unoptimized: true },
};

export default nextConfig;
