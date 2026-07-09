import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

// Resolusi alias "@/..." (dari tsconfig paths) untuk Vitest — Next.js resolve ini
// otomatis, Vitest tidak. Tanpa ini, test yang mengimpor modul ber-"@/lib/*" gagal.
export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL(".", import.meta.url)),
    },
  },
});
