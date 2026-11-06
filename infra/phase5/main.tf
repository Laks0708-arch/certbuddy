# Phase 5: let GitHub Actions run the smoke tests on a schedule, with NO AWS keys stored in GitHub.
# GitHub proves who it is with a signed token (OIDC) → AWS swaps it for short-lived role credentials.

terraform {
  required_version = ">= 1.6"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 6.0"
    }
  }
}

provider "aws" {
  region = "us-east-1"
}

locals {
  account = "398370181625"
  # GitHub's "immutable subject": owner and repo names plus their ID numbers, so a
  # re-created repo with the same name can't use this role. Check with:
  #   gh api repos/Laks0708-arch/certbuddy/actions/oidc/customization/sub
  repo = "Laks0708-arch@333517398/certbuddy@1432197398"
}

# The "ID checker": tells AWS to trust tokens signed by GitHub Actions.
# Only one per account for this URL.
resource "aws_iam_openid_connect_provider" "github" {
  url            = "https://token.actions.githubusercontent.com"
  client_id_list = ["sts.amazonaws.com"]
}

# Who may use the role: ONLY workflows in my repo, ONLY on the main branch.
# Without the "sub" condition, any GitHub repo in the world could assume this role.
data "aws_iam_policy_document" "trust" {
  statement {
    actions = ["sts:AssumeRoleWithWebIdentity"]
    principals {
      type        = "Federated"
      identifiers = [aws_iam_openid_connect_provider.github.arn]
    }
    condition {
      test     = "StringEquals"
      variable = "token.actions.githubusercontent.com:aud"
      values   = ["sts.amazonaws.com"]
    }
    condition {
      test     = "StringEquals"
      variable = "token.actions.githubusercontent.com:sub"
      values   = ["repo:${local.repo}:ref:refs/heads/main"]
    }
  }
}

resource "aws_iam_role" "smoke" {
  name                 = "certbuddy-github-smoke-tests"
  description          = "GitHub Actions (main branch only) runs the read-only smoke tests"
  assume_role_policy   = data.aws_iam_policy_document.trust.json
  max_session_duration = 3600 # 1 hour, the minimum
}

# What the role may do: only the read calls tests/smoke.sh makes, each on one named resource.
data "aws_iam_policy_document" "smoke" {
  statement {
    sid       = "ReadLambdaUrl"
    actions   = ["lambda:GetFunctionUrlConfig"]
    resources = ["arn:aws:lambda:us-east-1:${local.account}:function:certbuddy-progress"]
  }
  statement {
    sid       = "ReadSignInSettings"
    actions   = ["cognito-idp:ListUserPoolClients", "cognito-idp:DescribeUserPoolClient"]
    resources = ["arn:aws:cognito-idp:us-east-1:${local.account}:userpool/us-east-1_QiAQ8Ip4L"]
  }
  statement {
    sid     = "ReadAlarms"
    actions = ["cloudwatch:DescribeAlarms"]
    resources = [
      "arn:aws:cloudwatch:us-east-1:${local.account}:alarm:certbuddy-progress-lambda-errors",
      "arn:aws:cloudwatch:us-east-1:${local.account}:alarm:certbuddy-site-5xx-errors",
    ]
  }
  statement {
    sid       = "ReadAlertSubscriptions"
    actions   = ["sns:ListSubscriptionsByTopic"]
    resources = ["arn:aws:sns:us-east-1:${local.account}:certbuddy-alerts"]
  }
}

resource "aws_iam_role_policy" "smoke" {
  name   = "read-only-smoke-checks"
  role   = aws_iam_role.smoke.id
  policy = data.aws_iam_policy_document.smoke.json
}

output "smoke_role_arn" {
  value = aws_iam_role.smoke.arn
}
