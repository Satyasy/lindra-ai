# Single-stage (disengaja): prisma CLI tetap tersedia untuk `migrate deploy` + `db seed`
# saat container start. Multi-stage standalone dihindari karena mempersulit dua langkah
# runtime itu. ponytail: pindah ke standalone hanya kalau image size benar-benar jadi masalah.
FROM node:24-alpine
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1

COPY package.json package-lock.json ./
COPY prisma ./prisma
RUN npm install --no-audit --no-fund --fetch-retries=5 --fetch-retry-maxtimeout=120000

# NEXT_PUBLIC_* di-INLINE saat `next build` → HARUS ada sebelum build. .env
# di-.dockerignore (& git-ignore), jadi flag demo dilewatkan sebagai build ARG
# (di-set oleh docker-compose). Tanpa ini, entri /chat & /masuk (§1.9) hilang di image.
ARG NEXT_PUBLIC_DEMO_MODE
ENV NEXT_PUBLIC_DEMO_MODE=$NEXT_PUBLIC_DEMO_MODE

COPY . .
RUN npm run build

EXPOSE 3000
CMD ["sh", "-c", "npx prisma migrate deploy && npx prisma db seed && npm start"]
