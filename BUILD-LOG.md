# Build log

A short entry for every step: what I built, what I learned, and what it cost.

## Phase 0: account safety and project setup (24 Oct 2026)

**Built**
- Early-warning budget: $5/month of usage measured *before* credits, with alerts at 50%, 100% and forecast
- Emergency brake: an AWS Budgets action that automatically attaches a deny policy at $10/month, blocking new EC2, NAT gateways, load balancers, RDS, Bedrock and other paid resources
- Lowered the Cost Anomaly Detection alert threshold from $100 to $1
- All alerts sent to two inboxes
- Repo, README, decisions log, MIT licence and a `.gitignore` that blocks secrets

**Learned**
- Budgets that include credits show $0 spend even while credits are being used, so a "before credits" budget is needed to see real usage
- A budget action needs its own IAM role that AWS Budgets can assume, scoped so it can only attach this one policy to this one user
- Cognito's free tier is 10,000 monthly users for email sign-in but only 50 for Google/Apple sign-in, so it pays to read pricing before choosing features

**Cost:** $0.00

## Lesson engine and content rules (24 Oct 2026)

**Built**
- Animated lesson engine: moving requests, failures, weighted traffic splits shown as streams of dots, subtitles, and a natural voice recorded once with Amazon Polly
- Six lessons: streaming, multiplayer game, reading app (storage), food delivery (compute), banking (security), ticket sale (Route 53 + load balancers)
- Lessons are plain data files, so the engine can teach any subject
- CONTENT-RULES.md: no exam content, AWS trademark rules, sources, privacy

**Learned**
- Polly output can be stored and replayed indefinitely at no extra cost, so recording once beats generating speech every time
- The AWS Certification Program Agreement treats all exam content as confidential, so every question has to be original

**Cost:** about $0.08 of Polly (neural voice, ~5,000 characters), covered by credits

## Phase 1: first public page (25 Oct 2026)

**Built** (all with Terraform, in `infra/phase1/`)
- Private S3 bucket: Block Public Access on, ACLs disabled, encryption at rest (SSE-S3)
- CloudFront distribution: HTTPS only (HTTP redirects to HTTPS), managed caching policy, cheapest price class
- Origin access control (OAC), with a bucket policy that only allows this one distribution (`AWS:SourceArn` condition)
- The home page plus all six narrated lessons and their audio, uploaded as S3 objects
- Live at https://d2hupot0oe0kpk.cloudfront.net

**Tested**
- First visit: `x-cache: Miss from cloudfront` (edge MAN51, Manchester); second visit: `Hit`, served from the edge's cache
- Opening the bucket URL directly returns `AccessDenied`, so the bucket really is private
- Used a CloudFront invalidation (`/*`) after updating the site

**Broke it on purpose**
- Changed one character of the distribution ARN in the bucket policy by hand, and the site returned `403 AccessDenied`
- `terraform plan` detected the drift and showed the exact one-character difference; one `terraform apply` fixed it

**Learned**
- Without the `AWS:SourceArn` condition, any CloudFront distribution in any account could read the bucket (the "confused deputy" problem)
- Updates may not appear until cached copies expire (`max-age`) or are invalidated
- The Terraform AWS provider couldn't read the CLI's `aws login` session directly, so I exported temporary credentials first

**Cost:** $0.00 (CloudFront's always-free 1 TB/month; a few MB in S3)

## Phase 2a: back end for saving progress (25 Oct 2026)

**Built** (Terraform, `infra/phase2/`)
- DynamoDB table `certbuddy-progress`: partition key `learnerId`, provisioned 5/5 capacity (inside the always-free tier), TTL on `expiresAt`
- Lambda `certbuddy-progress` (Python 3.13, arm64/Graviton, 128 MB): GET loads progress, PUT saves it, with input checks (UUID only, 20 KB limit)
- IAM execution role allowing only `dynamodb:GetItem` + `dynamodb:PutItem` on that one table, plus writing its own logs
- CloudWatch log group with 14-day retention

**Tested**
- Save: 200, with a cold start (init 469 ms). Load: 200 in 59 ms (warm). Bad ID: 400 in 2 ms
- The item is visible in DynamoDB with its expiry date set a year ahead

**Broke it on purpose**
- Removed `dynamodb:PutItem` from the role by hand. Loading still worked, but saving failed with `AccessDeniedException ... is not authorized to perform: dynamodb:PutItem ... because no identity-based policy allows` it
- `terraform plan` showed `+ "dynamodb:PutItem"`, and one apply restored it

**Learned**
- AWS errors say who (the role), what (the action) and where (the resource), which is enough to find the fix
- Fix with the smallest change, never AdministratorAccess or `dynamodb:*`
- No personal data: a random learner ID instead of a name or email, and TTL deletes inactive data after a year

**Cost:** $0.00 (Lambda and DynamoDB always-free tiers)

## Phase 2b: the website talks to the back end (26 Oct 2026)

**Built**
- Lambda function URL with `AWS_IAM` auth, so only signed requests are accepted
- A second CloudFront origin for the function URL, protected by an origin access control of type `lambda`
- CloudFront behaviour `/api/*` → Lambda with caching disabled (personal data is never cached); everything else → S3
- Resource-based permissions so only this distribution can invoke the function (`lambda:InvokeFunctionUrl` + `lambda:InvokeFunction`)
- "Cloud backup (beta)" on the Account page: back up with a random backup code and restore on another device. The browser sends an `x-amz-content-sha256` header, which OAC needs to sign PUT bodies

**Tested**
- Calling the function URL directly: `403 Forbidden`
- Through the site: back up `200`, restore `200` (always `x-cache: Miss`), unknown code `404`
- Real test: backed up on a laptop and restored on a phone

**Learned**
- One web address for pages and API avoids CORS; OAC keeps the API locked to CloudFront
- Never cache personal API responses
- A function URL is enough for a small app; API Gateway adds throttling, API keys and usage plans
- Stack order matters: the back-end stack must exist before the front-door stack reads its outputs

**Cost:** $0.00

## Delete my cloud backup (27 Oct 2026)

**Built**
- Lambda handles `DELETE /api/progress?learnerId=…`
- Added exactly one permission, `dynamodb:DeleteItem` on the progress table, next to GetItem and PutItem (an additive change; nothing else widened)
- A "Delete my cloud backup" button on the Account page, with a confirmation step

**Tested:** backup exists `200` → DELETE `200 {"deleted": true}` → GET `404`

**Why:** UK GDPR right to erasure. Learners can remove their data any time instead of waiting for the one-year TTL.

**Cost:** $0.00

## Security headers (27 Oct 2026)

Suggested in a LinkedIn comment by a senior engineer. Attached the AWS managed `SecurityHeadersPolicy` to both cache behaviours, so every response now carries `Strict-Transport-Security` (HSTS), `X-Content-Type-Options: nosniff`, `X-Frame-Options`, `Referrer-Policy` and `X-XSS-Protection`. Before: none. One Terraform line per behaviour; cost $0.

## Phase 3: sign-in with Cognito, and my first real bug (27 Oct 2026)

**Built**
- Cognito user pool (email sign-up, password rules, email verification), Cognito-hosted sign-in pages, a public app client using the authorization code flow with PKCE
- Lambda checks the access token (via Cognito `GetUser`), checks it was issued for this app, and stores signed-in learners under `u#<user id>`, separate from backup codes
- The token travels in a custom `x-cb-token` header, because CloudFront's OAC signs the request to Lambda and replaces the `Authorization` header
- The website signs in, loads progress from the account and saves automatically

**The bug:** sign-in worked, but saving to the account silently failed with 401s. `GetUser` only accepts access tokens that carry the `aws.cognito.signin.user.admin` scope, and the app only requested `openid email`. With no error logging, it was invisible.

**The fix:** request and allow that scope, log every token error, and add `tests/smoke.sh`: 19 automatic checks run after every deploy, including one for this exact bug.

**Lesson:** "it looks like it works" isn't the same as "it works". Check the data really landed, log errors from day one, and turn every bug into a test.

**Cost:** $0.00 (Cognito is free for up to 10,000 monthly users with email sign-in)

**Follow-up (same day): a better fix.** The scope fix only helped new sign-ins, and an old token in a browser tab kept failing. So Lambda now verifies tokens itself: it fetches the user pool's public keys (JWKS), checks the RS256 signature, the issuer, the expiry, the token type and the client ID. No scope or call to Cognito is needed, and it's faster.

**Tested before announcing it:** with a temporary test user (deleted afterwards) and a temporary admin sign-in flow (switched off afterwards, with a smoke test to prove it's off): save 200, load 200, item in DynamoDB under `u#<sub>`, delete 200.
- A first "tampering" test passed when it shouldn't have. Investigation showed the test itself was flawed: changing the last base64 character of a 256-byte signature doesn't change its bytes.
- Re-tested by changing the middle of the signature and the payload: both 401, with logs showing `ValueError: bad signature` from the new code.
- Smoke tests: 20/20.

## Debugging drill: I found and fixed it myself (27 Oct 2026)

*A practice fault was injected on purpose, without telling me what it was. Everything below I did myself.*

- **Symptom:** on the website, Sync failed.
- **How I found it:** I ran `aws logs tail /aws/lambda/certbuddy-progress --since 10m`. The error said `AccessDeniedException … dynamodb:PutItem on resource …table/certbuddy-progres`.
- **Root cause:** a misspelling. Reading the resource name letter by letter, the table name was missing an "s". `aws lambda get-function-configuration` showed the Lambda's `TABLE_NAME` setting was `certbuddy-progres`. The error said AccessDenied because the role is only allowed on the correctly named table.
- **Fix:** I ran `terraform plan`, which showed `~ "TABLE_NAME" = "certbuddy-progres" -> "certbuddy-progress"` (0 to destroy), then `terraform apply` to change the spelling back to what it should be.
- **Proof:** I ran the smoke tests (20/20 passed) and checked on the website myself: Sync now worked.
- **What I learned:** read every word of an error, including spelling. An error can name the effect (AccessDenied) rather than the cause (a wrong name). Fix with code, not by hand, then verify.

## Phase 4: monitoring and alarms (28 Oct 2026, I ran it myself)

- I set up two CloudWatch alarms: one for Lambda errors (any error in 5 minutes) and one for the website (CloudFront 5xx error rate above 5%).
- They send an email through an SNS topic to both of my email addresses. I confirmed both subscriptions.
- I tested it by forcing the alarm into the ALARM state with `aws cloudwatch set-alarm-state`. The email arrived in both inboxes within a minute, and an OK email followed once it rechecked.
- I added 3 monitoring checks to the smoke tests (alarms exist, emails confirmed); the total is now 23, all passing.
- **Design decision:** I first chose only the Lambda alarm. On review, I added the website alarm, because a front-end outage (like the Phase 1 bucket-policy break) wouldn't trip a Lambda alarm. Next, scheduled smoke tests in CI will also catch 4xx problems such as a 403.

**Cost:** $0.00 (within the free 10 alarms and 1,000 SNS emails)
