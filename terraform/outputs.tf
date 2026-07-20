output "public_ip" {
  value = aws_eip.app.public_ip
}

output "instance_id" {
  description = "Untuk shell (aws ssm start-session --target <id>) & GitHub secret EC2_INSTANCE_ID"
  value       = aws_instance.app.id
}

output "deploy_role_arn" {
  description = "Isi ke GitHub secret AWS_DEPLOY_ROLE_ARN"
  value       = aws_iam_role.deploy.arn
}
