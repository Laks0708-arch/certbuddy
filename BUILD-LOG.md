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
