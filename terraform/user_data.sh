#!/bin/bash
# tanpa -x: output cloud-init masuk log, jangan bocorkan secret SSM
set -euo pipefail

# ── Anti-freeze: swap + swappiness rendah. `next build` saat deploy CI/CD berjalan
# di VM yang sama dengan app+db; tanpa swap, lonjakan memori build men-trigger OOM
# killer / thrashing yang membekukan VM. Swap = ruang napas, swappiness=10 supaya
# app tetap di RAM dan swap cuma dipakai darurat.
fallocate -l 2G /swapfile && chmod 600 /swapfile && mkswap /swapfile && swapon /swapfile
echo '/swapfile none swap sw 0 0' >> /etc/fstab
echo 'vm.swappiness=10' > /etc/sysctl.d/99-lindra.conf
sysctl -p /etc/sysctl.d/99-lindra.conf

export DEBIAN_FRONTEND=noninteractive
apt-get update
apt-get install -y docker.io docker-compose-v2 nginx git unzip
systemctl enable --now docker nginx
# AWS CLI v2 arm64 (Ubuntu tidak membawanya; dibutuhkan untuk tarik secret SSM)
curl -fsSL "https://awscli.amazonaws.com/awscli-exe-linux-aarch64.zip" -o /tmp/awscli.zip
unzip -q /tmp/awscli.zip -d /tmp && /tmp/aws/install && rm -rf /tmp/aws /tmp/awscli.zip

# ── Secret dari SSM → .env (dibaca compose via interpolasi $${VAR}) ──
mkdir -p /opt/lindra && cd /opt/lindra
git clone "${app_repo_url}" app
cd app
aws ssm get-parameters-by-path --path /lindra --with-decryption --region "${region}" \
  --query "Parameters[].[Name,Value]" --output text |
  while IFS=$'\t' read -r name value; do
    echo "$${name##*/}=$${value}" >> .env
  done
chmod 600 .env

# Origin publik (dihitung Terraform dari domain/EIP) → .env, dipakai compose
echo "APP_ORIGIN=${app_origin}" >> .env

# Override produksi: matikan demo mode (aturan #9 — landing tak boleh link /chat),
# URL publik benar, teruskan var yang tak ada di compose dasar (EMBEDDING/CRON),
# port app hanya loopback (nginx yang expose), db tanpa port host.
cat > docker-compose.prod.yml <<'EOF'
services:
  app:
    build:
      args:
        NEXT_PUBLIC_DEMO_MODE: "false"
    ports: !override
      - "127.0.0.1:3000:3000"
    environment:
      NEXTAUTH_URL: $${APP_ORIGIN}
      APP_URL: $${APP_ORIGIN}
      EMBEDDING_API_KEY: $${EMBEDDING_API_KEY:-}
      EMBEDDING_BASE_URL: $${EMBEDDING_BASE_URL:-}
      EMBEDDING_MODEL: $${EMBEDDING_MODEL:-}
      CRON_SECRET: $${CRON_SECRET:-}
    restart: always
    # Anti-freeze: batasi memori container supaya beban tinggi mematikan/restart
    # SATU container (restart: always menghidupkan lagi), bukan membekukan VM.
    # t4g.medium 4GB: app 2G + db 1G + sisa untuk OS/nginx/build.
    mem_limit: 2g
  db:
    ports: !override []
    mem_limit: 1g
EOF
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build app db

# ── nginx reverse proxy: SSE tanpa buffering, upload STT 25MB, stream LLM panjang ──
# nginx.conf ditimpa: server default bawaan distro (default_server) mencaplok
# request ber-Host IP sehingga halaman welcome distro yang tampil, bukan app.
cat > /etc/nginx/nginx.conf <<'EOF'
user www-data;
worker_processes auto;
error_log /var/log/nginx/error.log notice;
pid /run/nginx.pid;
events { worker_connections 1024; }
http {
    include /etc/nginx/mime.types;
    default_type application/octet-stream;
    access_log /var/log/nginx/access.log;
    sendfile on;
    # Anti-slowloris (T4): koneksi lambat tak boleh menahan worker.
    client_header_timeout 10s;
    client_body_timeout 15s;
    # Rate/conn limit per-IP (K1/K3/T4). Zona dipakai di server block di bawah.
    limit_req_zone  $binary_remote_addr zone=api:10m rate=30r/m;
    limit_conn_zone $binary_remote_addr zone=conn:10m;
    limit_req_status 429;
    include /etc/nginx/conf.d/*.conf;
}
EOF
cat > /etc/nginx/conf.d/lindra.conf <<'EOF'
server {
    listen 80 default_server;
    server_name ${app_domain != "" ? app_domain : "_"};
    client_max_body_size 26m;
    # Maks 10 koneksi konkuren per IP (T4 slowloris/SSE menggantung).
    limit_conn conn 10;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-Proto $scheme;
        # TIMPA (bukan append) X-Forwarded-For dengan IP asli — cegah spoof yang
        # membypass rate-limit aplikasi (T2). Hanya nilai dari nginx yang dipercaya.
        proxy_set_header X-Forwarded-For $remote_addr;
        # Strip header cron Vercel — di EC2 klien bisa memalsukannya (K2, berlapis
        # dengan penghapusan cabangnya di route). App hanya terima Bearer CRON_SECRET.
        proxy_set_header x-vercel-cron "";
        proxy_buffering off;
        proxy_read_timeout 300s;
    }

    # Endpoint mahal (LLM/upload): rate limit per-IP (K1/K3). burst kecil untuk
    # ketikan cepat yang sah; nodelay agar tak menahan koneksi.
    location ~ ^/api/(chat|stt|evidence|followup/chat|session) {
        limit_req zone=api burst=10 nodelay;
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header X-Forwarded-For $remote_addr;
        proxy_set_header x-vercel-cron "";
        proxy_buffering off;
        proxy_read_timeout 300s;
    }
}
EOF
nginx -t && systemctl reload nginx

# ── Pengganti cron Vercel: systemd timer 01:00 UTC → /api/cron/followup-email ──
cat > /etc/systemd/system/lindra-followup.service <<'EOF'
[Unit]
Description=Lindra followup email cron
[Service]
Type=oneshot
EnvironmentFile=/opt/lindra/app/.env
ExecStart=/usr/bin/curl -fsS -H "Authorization: Bearer $${CRON_SECRET}" http://127.0.0.1:3000/api/cron/followup-email
EOF
cat > /etc/systemd/system/lindra-followup.timer <<'EOF'
[Unit]
Description=Daily Lindra followup email (01:00 UTC, sama dengan cron Vercel)
[Timer]
OnCalendar=*-*-* 01:00:00 UTC
Persistent=true
[Install]
WantedBy=timers.target
EOF
systemctl daemon-reload
systemctl enable --now lindra-followup.timer
