terraform {
  required_version = ">= 1.5"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region = var.region
}

# ── Jaringan: default VPC + subnet publik. Tanpa NAT, tanpa ALB (budget <$15). ──
data "aws_vpc" "default" {
  default = true
}

data "aws_subnets" "default" {
  filter {
    name   = "vpc-id"
    values = [data.aws_vpc.default.id]
  }
}

resource "aws_security_group" "web" {
  name_prefix = "lindra-web-"
  vpc_id      = data.aws_vpc.default.id

  # Tanpa port 22 — akses shell via SSM Session Manager (gratis, tanpa key pair)
  ingress {
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }
  ingress {
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }
  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}

# ── IAM instance role: SSM (session + baca secret) + Bedrock (kelak, tanpa key statis) ──
resource "aws_iam_role" "instance" {
  name_prefix = "lindra-ec2-"
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Principal = { Service = "ec2.amazonaws.com" }
      Action    = "sts:AssumeRole"
    }]
  })
}

resource "aws_iam_role_policy_attachment" "ssm_core" {
  role       = aws_iam_role.instance.name
  policy_arn = "arn:aws:iam::aws:policy/AmazonSSMManagedInstanceCore"
}

resource "aws_iam_role_policy" "app" {
  name = "lindra-app"
  role = aws_iam_role.instance.id
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = ["ssm:GetParameter", "ssm:GetParametersByPath"]
        # GetParametersByPath butuh izin pada NODE path (parameter/lindra), bukan cuma
        # anak-anaknya (parameter/lindra/*). Dua-duanya wajib.
        Resource = [
          "arn:aws:ssm:${var.region}:*:parameter/lindra",
          "arn:aws:ssm:${var.region}:*:parameter/lindra/*",
        ]
      },
      {
        # Belum dipakai kode (masih Groq/OpenAI) — disiapkan untuk migrasi LLM ke Bedrock
        Effect   = "Allow"
        Action   = ["bedrock:InvokeModel", "bedrock:InvokeModelWithResponseStream"]
        Resource = "*"
      }
    ]
  })
}

resource "aws_iam_instance_profile" "instance" {
  name_prefix = "lindra-ec2-"
  role        = aws_iam_role.instance.name
}

# ── Secrets → SSM Parameter Store (standard tier = gratis) ──
resource "aws_ssm_parameter" "secret" {
  # keys tidak rahasia (cuma nama var) — nilainya tetap sensitive
  for_each = toset(nonsensitive(keys(var.app_secrets)))
  name     = "/lindra/${each.key}"
  type     = "SecureString"
  value    = var.app_secrets[each.key]
}

# ── EC2 ──
# Ubuntu 26.04 LTS arm64 (parameter publik Canonical, selalu AMI terbaru)
data "aws_ssm_parameter" "ubuntu_arm64" {
  name = "/aws/service/canonical/ubuntu/server/26.04/stable/current/arm64/hvm/ebs-gp3/ami-id"
}

resource "aws_instance" "app" {
  ami                    = data.aws_ssm_parameter.ubuntu_arm64.value
  instance_type          = var.instance_type
  subnet_id              = data.aws_subnets.default.ids[0]
  vpc_security_group_ids = [aws_security_group.web.id]
  iam_instance_profile   = aws_iam_instance_profile.instance.name

  root_block_device {
    volume_type = "gp3"
    volume_size = 30
  }

  user_data = templatefile("${path.module}/user_data.sh", {
    region       = var.region
    app_repo_url = var.app_repo_url
    # EIP dialokasikan lebih dulu supaya origin final sudah diketahui saat boot
    # (IP metadata saat user_data jalan masih IP ephemeral, bukan EIP)
    app_origin = var.app_domain != "" ? "https://${var.app_domain}" : "http://${aws_eip.app.public_ip}"
    app_domain = var.app_domain
    demo_mode  = var.demo_mode
  })

  tags = { Name = "lindra-app" }
}

# EIP terpasang ke instance running = gratis; IP stabil untuk DNS.
# Dialokasikan tanpa instance agar IP-nya bisa masuk user_data (lihat di atas).
resource "aws_eip" "app" {
  domain = "vpc"
}

resource "aws_eip_association" "app" {
  instance_id   = aws_instance.app.id
  allocation_id = aws_eip.app.id
}

# ── CI/CD: GitHub Actions → SSM SendCommand (tanpa SSH, tanpa key statis) ──
resource "aws_iam_openid_connect_provider" "github" {
  url             = "https://token.actions.githubusercontent.com"
  client_id_list  = ["sts.amazonaws.com"]
  thumbprint_list = ["6938fd4d98bab03faadb97b34396831e3780aea1"]
}

resource "aws_iam_role" "deploy" {
  name_prefix = "lindra-deploy-"
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Principal = { Federated = aws_iam_openid_connect_provider.github.arn }
      Action    = "sts:AssumeRoleWithWebIdentity"
      Condition = {
        StringEquals = { "token.actions.githubusercontent.com:aud" = "sts.amazonaws.com" }
        StringLike   = { "token.actions.githubusercontent.com:sub" = "repo:${var.github_repo}:ref:refs/heads/main" }
      }
    }]
  })
}

resource "aws_iam_role_policy" "deploy" {
  name = "lindra-deploy"
  role = aws_iam_role.deploy.id
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = "ssm:SendCommand"
        Resource = [
          "arn:aws:ssm:${var.region}::document/AWS-RunShellScript",
          aws_instance.app.arn,
        ]
      },
      {
        Effect   = "Allow"
        Action   = "ssm:GetCommandInvocation"
        Resource = "*"
      }
    ]
  })
}
