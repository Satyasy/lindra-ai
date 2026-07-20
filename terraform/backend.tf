# State di S3 + native lockfile (Terraform >=1.10, tanpa DynamoDB).
# Bootstrap chicken-and-egg: bucket harus ada SEBELUM baris ini aktif.
#   1. Buat bucket sekali:
#  aws s3api create-bucket --bucket lindra-tfstate --region ap-southeast-3 \
#    --create-bucket-configuration LocationConstraint=ap-southeast-3
#  aws s3api put-bucket-versioning --bucket lindra-tfstate \
#    --versioning-configuration Status=Enabled
#   2. Baru `terraform init` → jawab "yes" migrasi state lokal ke S3.
terraform {
  backend "s3" {
    bucket       = "lindra-tfstate"
    key          = "lindra/terraform.tfstate"
    region       = "ap-southeast-3"
    encrypt      = true
    use_lockfile = true
  }
}
