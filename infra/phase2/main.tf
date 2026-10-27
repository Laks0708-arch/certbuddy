# Phase 2a: the back end that saves learners' progress.
# DynamoDB stores one item per learner; Lambda reads and writes it;
# an IAM role gives Lambda only GetItem/PutItem on this one table.

terraform {
  required_version = ">= 1.6"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 6.0"
    }
    archive = {
      source  = "hashicorp/archive"
      version = "~> 2.4"
    }
  }
}

provider "aws" {
  region = "us-east-1"
  default_tags {
    tags = {
      project    = "certbuddy"
      phase      = "2"
      managed_by = "terraform"
    }
  }
}

# ---------- The "filing cabinet": DynamoDB ----------

resource "aws_dynamodb_table" "progress" {
  name           = "certbuddy-progress"
  billing_mode   = "PROVISIONED" # always-free tier covers 25 read + 25 write capacity units
  read_capacity  = 5
  write_capacity = 5
  hash_key       = "learnerId" # the partition key: one folder per learner

  attribute {
    name = "learnerId"
    type = "S"
  }

  # Delete a learner's data automatically a year after their last save (privacy + cost).
  ttl {
    attribute_name = "expiresAt"
    enabled        = true
  }
}

# ---------- The "chef's key": an IAM role with least privilege ----------

data "aws_iam_policy_document" "assume_lambda" {
  statement {
    actions = ["sts:AssumeRole"]
    principals {
      type        = "Service"
      identifiers = ["lambda.amazonaws.com"]
    }
  }
}

resource "aws_iam_role" "progress" {
  name               = "certbuddy-progress-lambda"
  assume_role_policy = data.aws_iam_policy_document.assume_lambda.json
}

resource "aws_cloudwatch_log_group" "progress" {
  name              = "/aws/lambda/certbuddy-progress"
  retention_in_days = 14 # keep logs two weeks, then delete (cost control)
}

data "aws_iam_policy_document" "progress" {
  statement {
    sid       = "ReadWriteOnlyThisTable"
    actions   = ["dynamodb:GetItem", "dynamodb:PutItem", "dynamodb:DeleteItem"]
    resources = [aws_dynamodb_table.progress.arn]
  }
  statement {
    sid       = "WriteOwnLogs"
    actions   = ["logs:CreateLogStream", "logs:PutLogEvents"]
    resources = ["${aws_cloudwatch_log_group.progress.arn}:*"]
  }
}

resource "aws_iam_role_policy" "progress" {
  name   = "least-privilege"
  role   = aws_iam_role.progress.id
  policy = data.aws_iam_policy_document.progress.json
}

# ---------- The "chef": Lambda ----------

data "archive_file" "progress" {
  type        = "zip"
  source_file = "${path.module}/lambda/progress.py"
  output_path = "${path.module}/build/progress.zip"
}

resource "aws_lambda_function" "progress" {
  function_name    = "certbuddy-progress"
  role             = aws_iam_role.progress.arn
  runtime          = "python3.13"
  architectures    = ["arm64"] # Graviton: cheaper per millisecond
  handler          = "progress.handler"
  filename         = data.archive_file.progress.output_path
  source_code_hash = data.archive_file.progress.output_base64sha256
  memory_size      = 128
  timeout          = 5

  environment {
    variables = {
      TABLE_NAME = aws_dynamodb_table.progress.name
    }
  }

  depends_on = [aws_cloudwatch_log_group.progress, aws_iam_role_policy.progress]
}

# The function's own web address. AWS_IAM means only signed requests are accepted:
# in practice, only our CloudFront distribution (via OAC) can call it.
resource "aws_lambda_function_url" "progress" {
  function_name      = aws_lambda_function.progress.function_name
  authorization_type = "AWS_IAM"
}

output "function_url_domain" {
  value = trimsuffix(trimprefix(aws_lambda_function_url.progress.function_url, "https://"), "/")
}

output "function_name" {
  value = aws_lambda_function.progress.function_name
}

output "table_name" {
  value = aws_dynamodb_table.progress.name
}
