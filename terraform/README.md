# terraform

Infra Lindra: 1× EC2 t4g.medium Ubuntu 26.04 (ARM) di ap-southeast-3 (Jakarta), monolith (Next.js + Postgres/pgvector via docker compose) di belakang nginx, CI/CD GitHub Actions → SSM. Total ± $30/bln (EC2 ~$27 + EBS gp3 30GB ~$2.9) — **melanggar budget awal < $15**; turunkan `instance_type` ke t4g.small (~$13.4) kalau budget kembali mengikat. Tanpa RDS/ALB/NAT.

## CI/CD

Push ke `main` (selain `terraform/`, `.github/`, `*.md`) → `.github/workflows/deploy.yml` assume role OIDC → `aws ssm send-command` ke instance → `git pull && docker compose up -d --build app`. Tanpa SSH, tanpa key statis. Setelah `terraform apply`, isi GitHub secrets dari output: `AWS_DEPLOY_ROLE_ARN` = `deploy_role_arn`, `EC2_INSTANCE_ID` = `instance_id`.

## Pakai

```sh
cp terraform.tfvars.example terraform.tfvars   # isi secret
terraform init && terraform apply
```

Boot pertama ±10–15 menit (build Next.js di instance, dibantu swap 2GB). Cek progres:

```sh
aws ssm start-session --target <instance_id>   # tanpa SSH/key pair — port 22 tertutup
sudo tail -f /var/log/cloud-init-output.log
```

## Yang di-provision

- **EC2** AL2023 arm64 + EIP, SG hanya 80/443. Shell via SSM Session Manager.
- **IAM instance role**: baca SSM `/lindra/*` + `bedrock:InvokeModel` (disiapkan untuk migrasi LLM ke Bedrock — saat itu terjadi, tak perlu key statis di instance).
- **SSM Parameter Store** (`/lindra/<KEY>`, SecureString, gratis): semua secret vendor (Groq/OpenAI/Resend) & auth. user_data menariknya jadi `.env` saat boot.
- **user_data**: swap 2GB → docker + compose → clone repo app → `.env` dari SSM → `docker compose up --build` (override prod: `NEXT_PUBLIC_DEMO_MODE=false`, port loopback-only) → nginx (`proxy_buffering off` untuk SSE, `client_max_body_size 30m` untuk STT) → systemd timer 01:00 UTC pengganti cron Vercel (`/api/cron/followup-email` + Bearer `CRON_SECRET`).

## HTTPS (setelah DNS mengarah ke EIP)

```sh
sudo dnf install -y certbot python3-certbot-nginx
sudo certbot --nginx -d <domain>
```

## Update aplikasi

```sh
cd /opt/lindra/app && sudo git pull && \
  sudo docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build app
```
