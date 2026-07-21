#!/usr/bin/env bash
# Regenerasi /opt/lindra/app/.env dari SSM /lindra/* SETIAP deploy — supaya rotasi
# atau RENAME key (mis. konsolidasi 3 key jadi satu GROQ_API_KEY) otomatis terpakai
# tanpa surgery manual di instance. Dipanggil deploy.yml sesudah `git pull`.
#
# APP_ORIGIN dihitung Terraform saat boot (bukan di SSM) → dipertahankan.
# Guard: tulis ke temp & pastikan ada GROQ_API_KEY sebelum menimpa .env, supaya fetch
# SSM yang kosong/gagal tak meng-clobber .env jadi kosong.
set -euo pipefail
cd /opt/lindra/app

REGION="${AWS_REGION:-ap-southeast-3}"
TMP="$(mktemp)"
trap 'rm -f "$TMP"' EXIT

aws ssm get-parameters-by-path --path /lindra --with-decryption --region "$REGION" \
  --query "Parameters[].[Name,Value]" --output text |
  while IFS=$'\t' read -r name value; do echo "${name##*/}=${value}"; done > "$TMP"

grep -q '^GROQ_API_KEY=' "$TMP" || { echo "refresh-env: GROQ_API_KEY absen dari SSM — batal (tidak menimpa .env)"; exit 1; }

# Pertahankan APP_ORIGIN (dari boot, bukan SSM).
ORIGIN="$(grep '^APP_ORIGIN=' .env 2>/dev/null || true)"
[ -n "$ORIGIN" ] && echo "$ORIGIN" >> "$TMP"

chmod 600 "$TMP"
mv "$TMP" .env
trap - EXIT
echo "refresh-env: .env disinkronkan dari SSM ($(grep -c '=' .env) baris)"
