#!/bin/sh
# Smoke tests for the live CertBuddy site. Run after every deploy:
#   sh tests/smoke.sh
# Needs: curl, python3, and AWS CLI credentials (read-only calls, plus one test item it cleans up).
# Every bug we find gets a check here so it can't come back.

SITE="https://d2hupot0oe0kpk.cloudfront.net"
BUCKET="certbuddy-site-cc2b0c55"
POOL="us-east-1_QiAQ8Ip4L"
pass=0; fail=0
check() { if [ "$2" = "$3" ]; then echo "  ✅ $1"; pass=$((pass+1)); else echo "  ❌ $1 (expected $3, got $2)"; fail=$((fail+1)); fi; }
code() { curl -s -o /dev/null -w "%{http_code}" "$@"; }

echo "Website"
check "home page loads"                      "$(code $SITE/)" "200"
check "http redirects to https"              "$(code http://d2hupot0oe0kpk.cloudfront.net/)" "301"
check "a lesson loads"                       "$(code $SITE/lessons/routing.html)" "200"
check "lesson audio loads"                   "$(code $SITE/lessons/audio/l6-01.mp3)" "200"
check "sign-in settings file loads"          "$(code $SITE/config.js)" "200"
check "HSTS header present"                  "$(curl -sI $SITE/ | grep -ci strict-transport-security)" "1"
check "nosniff header present"               "$(curl -sI $SITE/ | grep -ci 'x-content-type-options: nosniff')" "1"

echo "Security"
check "S3 bucket blocks direct access"       "$(code https://$BUCKET.s3.amazonaws.com/index.html)" "403"
URL=$(aws lambda get-function-url-config --function-name certbuddy-progress --query FunctionUrl --output text 2>/dev/null)
check "Lambda URL blocks direct calls"       "$(code ${URL}?learnerId=00000000-0000-4000-8000-000000000000)" "403"
check "fake sign-in token rejected"          "$(code $SITE/api/progress -H 'x-cb-token: abc.def.ghi')" "401"
check "API is never cached"                  "$(curl -sI "$SITE/api/progress?learnerId=00000000-0000-4000-8000-000000000000" | grep -ci 'x-cache: hit')" "0"

echo "Backup-code API (creates and deletes one test item)"
ID=$(python3 -c 'import uuid;print(uuid.uuid4())')
BODY="{\"learnerId\":\"$ID\",\"progress\":{\"smoke\":true}}"
HASH=$(printf '%s' "$BODY" | shasum -a 256 | cut -d' ' -f1)
check "save progress"                        "$(code -X PUT $SITE/api/progress -H 'Content-Type: application/json' -H "x-amz-content-sha256: $HASH" -d "$BODY")" "200"
check "load progress"                        "$(code "$SITE/api/progress?learnerId=$ID")" "200"
check "delete progress"                      "$(code -X DELETE "$SITE/api/progress?learnerId=$ID")" "200"
check "deleted progress is gone"             "$(code "$SITE/api/progress?learnerId=$ID")" "404"
check "bad backup code rejected"             "$(code "$SITE/api/progress?learnerId=hello")" "400"

echo "Sign-in configuration (bug found 27 Oct: GetUser needs this scope)"
CLIENT=$(aws cognito-idp list-user-pool-clients --user-pool-id $POOL --query 'UserPoolClients[0].ClientId' --output text 2>/dev/null)
SCOPES=$(aws cognito-idp describe-user-pool-client --user-pool-id $POOL --client-id "$CLIENT" --query 'UserPoolClient.AllowedOAuthScopes' --output text 2>/dev/null)
check "app client allows the admin scope"    "$(echo "$SCOPES" | grep -c 'aws.cognito.signin.user.admin')" "1"
check "website requests the admin scope"     "$(curl -s $SITE/ | grep -c 'aws.cognito.signin.user.admin')" "1"
check "website uses the right client ID"     "$(curl -s $SITE/config.js | grep -c "$CLIENT")" "1"

echo
echo "Passed: $pass   Failed: $fail"
[ "$fail" -eq 0 ]
