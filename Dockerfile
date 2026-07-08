# Single-stage (disengaja): prisma CLI tetap tersedia untuk `migrate deploy` + `db seed`
# saat container start. Multi-stage standalone dihindari karena mempersulit dua langkah
# runtime itu. ponytail: pindah ke standalone hanya kalau image size benar-benar jadi masalah.
FROM node:24-alpine
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1

# Deps dulu untuk layer cache. prisma/ disalin SEBELUM install agar postinstall
# @prisma/client menemukan schema.prisma dan meng-generate client untuk build.
COPY package.json package-lock.json ./
COPY prisma ./prisma
# ponytail: `npm install`, bukan `npm ci`. sharp (dep opsional Next) menaruh binari
# per-platform di lock, dan lock yang di-generate di Windows tak memuat varian Linux
# (@img/sharp-linux-* + @emnapi@1.11.2) → `npm ci` gagal di container. `npm install`
# tetap pakai lock untuk deps yang cocok, hanya resolve binari platform yang kurang.
# Upgrade path: generate lock di Linux/CI lalu balik ke `npm ci`.
RUN npm install --no-audit --no-fund

# Sumber + build (context sudah dipangkas .dockerignore: tanpa test, docs, .claude, dsb.)
COPY . .
RUN npm run build

EXPOSE 3000
# migrate deploy (bukan dev) → seed idempotent → start
CMD ["sh", "-c", "npx prisma migrate deploy && npx prisma db seed && npm start"]
