# Phase 1: CertBuddy's first public page.
# A private S3 bucket holds the files; CloudFront serves them worldwide over HTTPS;
# origin access control (OAC) means only this CloudFront distribution can read the bucket.

terraform {
  required_version = ">= 1.6"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 6.0"
    }
    random = {
      source  = "hashicorp/random"
      version = "~> 3.6"
    }
  }
}

# Every resource gets these tags automatically, so the project's cost is easy to track.
provider "aws" {
  region = "us-east-1"
  default_tags {
    tags = {
      project    = "certbuddy"
      phase      = "1"
      managed_by = "terraform"
    }
  }
}

# Bucket names are global across all AWS accounts, so add a random suffix.
resource "random_id" "suffix" {
  byte_length = 4
}

# ---------- The "central kitchen": a private S3 bucket ----------

resource "aws_s3_bucket" "site" {
  bucket = "certbuddy-site-${random_id.suffix.hex}"
}

# Block every form of public access. Visitors never reach the bucket directly.
resource "aws_s3_bucket_public_access_block" "site" {
  bucket                  = aws_s3_bucket.site.id
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

# Turn off ACLs entirely; access is controlled only by policies.
resource "aws_s3_bucket_ownership_controls" "site" {
  bucket = aws_s3_bucket.site.id
  rule {
    object_ownership = "BucketOwnerEnforced"
  }
}

# Encrypt every object at rest with S3-managed keys (free).
resource "aws_s3_bucket_server_side_encryption_configuration" "site" {
  bucket = aws_s3_bucket.site.id
  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

# ---------- The "ID badge": origin access control ----------

resource "aws_cloudfront_origin_access_control" "site" {
  name                              = "certbuddy-oac-${random_id.suffix.hex}"
  origin_access_control_origin_type = "s3"
  signing_behavior                  = "always"
  signing_protocol                  = "sigv4"
}

# ---------- The "high-street shops": CloudFront ----------

# AWS's ready-made caching policy for static files.
data "aws_cloudfront_cache_policy" "optimized" {
  name = "Managed-CachingOptimized"
}

resource "aws_cloudfront_distribution" "site" {
  enabled             = true
  is_ipv6_enabled     = true
  comment             = "CertBuddy phase 1"
  default_root_object = "index.html"
  price_class         = "PriceClass_100" # cheapest set of edge locations (North America + Europe)

  origin {
    domain_name              = aws_s3_bucket.site.bucket_regional_domain_name
    origin_id                = "s3-site"
    origin_access_control_id = aws_cloudfront_origin_access_control.site.id
  }

  default_cache_behavior {
    target_origin_id       = "s3-site"
    viewer_protocol_policy = "redirect-to-https" # anyone using http:// is sent to https://
    allowed_methods        = ["GET", "HEAD"]
    cached_methods         = ["GET", "HEAD"]
    cache_policy_id        = data.aws_cloudfront_cache_policy.optimized.id
    compress               = true
  }

  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
  }

  viewer_certificate {
    cloudfront_default_certificate = true # free HTTPS on the *.cloudfront.net address
  }
}

# ---------- The kitchen door rule: only THIS distribution may read ----------

data "aws_iam_policy_document" "site" {
  statement {
    sid       = "AllowCloudFrontOAC"
    actions   = ["s3:GetObject"]
    resources = ["${aws_s3_bucket.site.arn}/*"]

    principals {
      type        = "Service"
      identifiers = ["cloudfront.amazonaws.com"]
    }

    condition {
      test     = "StringEquals"
      variable = "AWS:SourceArn"
      values   = [aws_cloudfront_distribution.site.arn]
    }
  }
}

resource "aws_s3_bucket_policy" "site" {
  bucket     = aws_s3_bucket.site.id
  policy     = data.aws_iam_policy_document.site.json
  depends_on = [aws_s3_bucket_public_access_block.site]
}

# ---------- The page itself ----------

resource "aws_s3_object" "index" {
  bucket        = aws_s3_bucket.site.id
  key           = "index.html"
  source        = "${path.module}/../../web/demo/index.html"
  etag          = filemd5("${path.module}/../../web/demo/index.html")
  content_type  = "text/html; charset=utf-8"
  cache_control = "max-age=300" # edges may keep a copy for 5 minutes
}

# ---------- The narrated lessons (built by web/lessons/tools/build.sh) ----------

locals {
  lessons_dir = "${path.module}/../../web/lessons/dist"
  mime_types = {
    html = "text/html; charset=utf-8"
    mp3  = "audio/mpeg"
  }
}

resource "aws_s3_object" "lessons" {
  for_each      = fileset(local.lessons_dir, "**/*.{html,mp3}")
  bucket        = aws_s3_bucket.site.id
  key           = "lessons/${each.value}"
  source        = "${local.lessons_dir}/${each.value}"
  etag          = filemd5("${local.lessons_dir}/${each.value}")
  content_type  = lookup(local.mime_types, reverse(split(".", each.value))[0], "application/octet-stream")
  cache_control = endswith(each.value, ".mp3") ? "max-age=86400" : "max-age=300"
}
