# Phase 4: know when something breaks, before a user tells us.
# Lambda errors → CloudWatch alarm → SNS topic → email to both inboxes.

# The "phone that rings": an SNS topic that sends alerts to subscribers.
resource "aws_sns_topic" "alerts" {
  name = "certbuddy-alerts"
}

# Who gets the alert. Each address must click "Confirm subscription" in the email AWS sends.
resource "aws_sns_topic_subscription" "email" {
  for_each  = toset(["laks8022@gmail.com", "laks22uk@gmail.com"])
  topic_arn = aws_sns_topic.alerts.arn
  protocol  = "email"
  endpoint  = each.value
}

# The "smoke alarm": goes off if the progress Lambda has ANY error in a 5-minute window.
resource "aws_cloudwatch_metric_alarm" "lambda_errors" {
  alarm_name          = "certbuddy-progress-lambda-errors"
  alarm_description   = "The progress Lambda had errors in the last 5 minutes. Check: aws logs tail /aws/lambda/certbuddy-progress --since 15m"
  namespace           = "AWS/Lambda"
  metric_name         = "Errors" # runs that ended with an unhandled error
  dimensions          = { FunctionName = aws_lambda_function.progress.function_name }
  statistic           = "Sum"
  period              = 300 # 5 minutes
  evaluation_periods  = 1
  comparison_operator = "GreaterThanThreshold"
  threshold           = 0                          # your choice D1: any error at all
  treat_missing_data  = "notBreaching"             # no traffic = no problem
  alarm_actions       = [aws_sns_topic.alerts.arn] # email when it goes off
  ok_actions          = [aws_sns_topic.alerts.arn] # email when it's healthy again
}

# The website alarm (in the Phase 1 stack) sends to this same topic.
output "alerts_topic_arn" {
  value = aws_sns_topic.alerts.arn
}
