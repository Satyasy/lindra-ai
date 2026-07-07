import type { NextConfig } from "next";

// cacheComponents sengaja tidak diaktifkan: semua permukaan dinamis
// (cookie sesi chat, dashboard ber-auth) kecuali landing yang sudah statis default.
const nextConfig: NextConfig = {};

export default nextConfig;
