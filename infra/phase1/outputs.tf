output "site_url" {
  description = "Public HTTPS address of CertBuddy"
  value       = "https://${aws_cloudfront_distribution.site.domain_name}"
}

output "bucket_name" {
  description = "Private bucket that holds the site files"
  value       = aws_s3_bucket.site.id
}

output "distribution_id" {
  description = "CloudFront distribution ID (used to clear the cache after changes)"
  value       = aws_cloudfront_distribution.site.id
}
