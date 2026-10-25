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
