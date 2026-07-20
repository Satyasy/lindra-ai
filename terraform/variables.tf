variable "region" {
  type    = string
  default = "ap-southeast-3"
}

variable "instance_type" {
  # PILIHAN PEMILIK: t4g.medium (~$27/bln di Jakarta) — MELANGGAR budget awal <$15.
  # Turunkan ke t4g.small (~$13.4) kalau budget kembali jadi batasan.
  type    = string
  default = "t4g.medium"
}

variable "github_repo" {
  description = "owner/repo GitHub yang boleh deploy via OIDC (mis. skomda/lindra-ai)"
  type        = string
}

variable "app_repo_url" {
  description = "URL git repo aplikasi lindra-ai (HTTPS, harus bisa di-clone dari EC2)"
  type        = string
}

variable "app_domain" {
  description = "Domain aplikasi (untuk nginx server_name & NEXTAUTH_URL). Kosong = pakai IP."
  type        = string
  default     = ""
}

variable "app_secrets" {
  description = "Secret aplikasi → SSM SecureString /lindra/<KEY>. Isi di terraform.tfvars (gitignored)."
  type        = map(string)
  sensitive   = true
  # Kunci yang diharapkan: NEXTAUTH_SECRET, IDENTITY_ENCRYPTION_KEY, CRON_SECRET,
  # GROQ_API_KEY_STUDENT, GROQ_API_KEY_BK, SAMBANOVA_API_KEY, GROQ_API_KEY_STT,
  # EMBEDDING_API_KEY, RESEND_API_KEY, FOLLOWUP_EMAIL_FROM
}
