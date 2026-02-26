terraform {
  required_version = ">= 1.5.0"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region = var.aws_region
}

module "api" {
  source = "./modules/api"

  app_name            = var.app_name
  lambda_package_path = var.lambda_package_path
  s3_bucket_arn       = module.storage.bucket_arn
  lambda_role_arn     = module.bedrock_roles.lambda_role_arn
}

module "storage" {
  source = "./modules/storage"

  bucket_name = var.s3_bucket_name
}

module "bedrock_roles" {
  source = "./modules/iam"

  lambda_role_name = var.lambda_role_name
}


