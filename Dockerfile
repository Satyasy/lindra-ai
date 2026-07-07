# Single-stage (disengaja): prisma CLI tetap tersedia untuk `migrate deploy` + `db seed`
# saat container start. Multi-stage standalone dihindari karena mempersulit dua langkah
# runtime itu. ponytail: pindah ke standalone hanya kalau image size benar-benar jadi masalah.
FROM node:24-alpine
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1

# Deps dulu untuk layer cache. prisma/ disalin SEBELUM `npm ci` agar postinstall
# @prisma/client menemukan schema.prisma dan meng-generate client untuk build.
COPY package.json package-lock.json ./
COPY prisma ./prisma
RUN npm ci --no-audit --no-fund

# Sumber + build (context sudah dipangkas .dockerignore: tanpa test, docs, .claude, dsb.)
COPY . .
RUN npm run build

EXPOSE 3000
# migrate deploy (bukan dev) → seed idempotent → start
CMD ["sh", "-c", "npx prisma migrate deploy && npx prisma db seed && npm start"]
