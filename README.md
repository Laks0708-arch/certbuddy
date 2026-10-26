# CertBuddy

**A free, open-source exam coach for AWS certifications: real-format practice, narrated lessons and flashcards that remember what you miss.**

> Status: 🟢 **Live preview:** https://d2hupot0oe0kpk.cloudfront.net · Phase 1 done (S3 + CloudFront + OAC with Terraform). Built in public, one phase at a time.

## Why I'm building this

I sat the AWS Certified Solutions Architect – Associate (SAA-C03) exam in October 2026 and narrowly missed the pass mark. The gap wasn't only knowledge. It was reading long scenario questions with very similar answer options fast enough, and I ran out of time. Most free practice material didn't train that skill.

CertBuddy is the tool I wished I'd had. It's free for everyone, with no adverts and no paywall.

## What it will do (v1: SAA-C03)

- **Real-format practice:** long scenarios, near-identical options, policy exhibits, Select TWO and THREE, a 2-minute pace timer.
- **Flashcards that remember you:** missed topics come back later in a *different* scenario (spaced repetition).
- **Word-flip drills:** spot the one word that changes the answer, to train reading speed.
- **Narrated, animated app-story lessons:** watch requests move through a real app (streaming, gaming, banking, ticketing) with subtitles and a natural Polly voice. Six lessons are built so far ([web/lessons](web/lessons/)). Each lesson is just a data file, so the same engine can teach **any subject**.
- **Progress by exam domain**, measured against the pass line.
- **No sign-up needed.** Optional email sign-in saves progress across devices.

All questions are original and written from the public exam guide and AWS documentation. **No exam dumps.** See [CONTENT-RULES.md](CONTENT-RULES.md).

## Planned architecture (serverless, inside the AWS always-free tier)

| Need | Service | Why |
|---|---|---|
| Website | Amazon S3 + CloudFront (origin access control) | Global, cached, private bucket, 1 TB/month free |
| Sign-in (optional) | Amazon Cognito user pool, email sign-in | 10,000 monthly users free (social sign-in only has 50 free) |
| API and logic | AWS Lambda | 1M requests/month free, scales to zero |
| Progress data | Amazon DynamoDB | 25 GB free, single-digit-ms reads |
| Daily reminders | Amazon EventBridge + SNS | Scheduled, 1M publishes/month free |
| Narration | Amazon Polly, generated once and stored in S3 | No per-listen cost |
| Infrastructure | Terraform + GitHub Actions | Reproducible, reviewed, automated deploys |

## Decisions log

Short notes on *why*, and what was traded away.

| # | Decision | Why | Trade-off |
|---|---|---|---|
| 1 | Serverless instead of EC2 for the live app | Always-free allowances, no servers to patch, scales automatically | Cold starts; 15-minute Lambda limit (not an issue for this workload) |
| 2 | Email sign-in instead of Google/Apple sign-in | Cognito federation is free for only 50 users/month vs 10,000 for email | Slightly more friction for users |
| 3 | Save progress once per session, not per click | ~10× fewer Lambda calls, stays inside the free tier | Progress from an unfinished session can be lost |

## Cost safety: how this free app can't surprise-bill me

| Guard | What it does | Cost |
|---|---|---|
| Early-warning budget | Emails at 50% / 100% / forecast of **$5/month usage measured before credits** | Free |
| **Emergency brake** (budget action) | At **$10/month**, automatically attaches a deny policy that blocks new paid resources (EC2, NAT, load balancers, RDS, Bedrock…) | Free (first two action budgets) |
| Cost Anomaly Detection | Daily email for any unusual spend of **$1 or more** | Free |
| Tagging | Every resource tagged `project=certbuddy` | Free |
| One Region | Everything in `us-east-1`, so nothing gets forgotten elsewhere | n/a |

## Roadmap

- [x] Phase 0: account safety, budgets, repo
- [x] Phase 1: static site on S3 + CloudFront with OAC (Terraform)
- [x] Phase 2a: DynamoDB progress table + least-privilege Lambda (Terraform)
- [x] Phase 2b: website ↔ API through CloudFront (OAC to a Lambda function URL); cloud backup and restore
- [ ] Phase 3: optional sign-in (Cognito)
- [ ] Phase 4: spaced repetition + daily reminder emails
- [ ] Phase 5: narrated lessons on the live site (Polly). The lesson engine and 6 lessons are already built in `web/lessons`.
- [ ] Phase 6: security hardening (least-privilege IAM, KMS, headers)
- [ ] Phase 7: monitoring (CloudWatch alarms, dashboards)
- [ ] Phase 8: CI/CD with GitHub Actions
- [ ] Lab: same API on EC2 + ALB, cost compared, then deleted

### Feature ideas (backlog)

- [ ] **"Make your AWS account safe in 10 minutes"**: a free beginner guide (budgets, emergency brake, anomaly alerts)
- [ ] **Live cost badge**: "This month: £0.00" shown on the site and in this README
- [ ] **Monday account-health email**: what's running, what it cost, any security findings
- [ ] **"Why did I get this wrong?"**: explains the specific trap the learner fell into
- [ ] **Exam-countdown mode**: the final week shows only the learner's weak topics
- [ ] **Accessibility**: narrated lessons, dyslexia-friendly font, large text, full keyboard use
- [ ] **Low-data / offline mode**: download today's cards and study without signal
- [ ] **Translated explanations** (e.g. Hindi, Tamil, Spanish, Arabic), translated once and stored
- [ ] **Job-ready section**: "explain this architecture" interview practice and CV bullet examples
- [ ] **Study buddies**: small groups with the same exam date
- [ ] **More exams**: AWS Cloud Practitioner first, then others on the same engine
- [ ] **Community questions**: written by people who passed, reviewed before publishing

## Disclaimer

CertBuddy is an independent study aid. It is not affiliated with or endorsed by Amazon Web Services. AWS and related marks are trademarks of Amazon.com, Inc. or its affiliates. No pass is guaranteed.

## Licence

[MIT](LICENSE): free to use, copy and build on.
