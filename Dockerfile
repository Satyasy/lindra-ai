# ponytail: satu stage sederhana (bukan multi-stage standalone) — image lebih besar,
# tapi prisma CLI tersedia untuk migrate+seed saat start. Optimalkan kalau image size jadi masalah.
FROM node:24-alpine
WORKDIR /app

COPY package.json package-lock.json ./
COPY prisma ./prisma
RUN npm ci

COPY . .
RUN npm run build

EXPOSE 3000
CMD ["sh", "-c", "npx prisma migrate deploy && npx prisma db seed && npm start"]
