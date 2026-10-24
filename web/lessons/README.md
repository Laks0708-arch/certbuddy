# Animated lessons

Each lesson is a short, narrated animation that follows **one real-world app**: a streaming service, a game, a bank. You watch requests move through the architecture. Every step shows the service used, the exam key words and the common trap. The lesson ends with check questions set in *other* apps, so learners have to recognise the pattern instead of remembering an answer.

The engine knows nothing about AWS. **A lesson is just a data file**, so the same engine can teach any subject: networking, Azure, Kubernetes, or something outside IT.

## Lessons so far

| File | App story | Topics |
|---|---|---|
| `data/streaming.js` | Streaming app | Cognito, Route 53, CloudFront + OAC, DynamoDB + DAX, Aurora, Transfer Acceleration, SQS + Spot, Kinesis, failover |
| `data/game.js` | Multiplayer game | Internet vs AWS backbone, Global Accelerator, Route 53 failover, CloudFront, Transfer Acceleration |
| `data/storage.js` | Reading app | S3 classes, Intelligent-Tiering, Glacier, One Zone-IA, EBS, instance store, EFS, FSx, AWS Backup |
| `data/compute.js` | Food delivery app | EC2 + ASG, Fargate, Lambda, Step Functions, SNS→SQS fan-out, API Gateway, Batch on Spot |
| `data/security.js` | Banking app | Cognito, WAF + Shield, ACM/TLS, security groups vs NACLs, Secrets Manager, KMS, endpoints, Macie, SCPs, monitoring |
| `data/routing.js` | Concert ticket sale | Route 53 Alias, latency, geolocation, weighted, failover; ALB path routing, target groups, health checks, sessions; NLB |

## Build

```sh
sh web/lessons/tools/build.sh      # writes web/lessons/dist/*.html
```

## Write a new lesson

Create `data/<name>.js`:

```js
window.LESSON = {
  title: "How a Ticket Sale Routes Its Fans",
  eyebrow: "Real-world AWS · a concert ticket site",
  intro: "One paragraph that sets the scene.",
  nodes: {            // id: [x, y, title, subtitle, category]   (canvas is 1000 × 600)
    fans: [75, 300, "Fans", "phone", "ppl"],
    r53:  [255, 300, "Route 53", "DNS", "edge"]
  },
  steps: [{
    t: "Step title",
    path: ["fans", "r53"],                 // one moving dot along this route
    // or: flows: [{path:[...], w:9, label:"90%"}, {path:[...], w:1, alt:true, label:"10%"}]
    down: [],                              // nodes shown as failed
    lit: [],                               // extra nodes to highlight
    kind: "backbone",                      // optional: "internet" (wobbly red) or "backbone" (teal)
    fact: "One-line fact",
    story: "What happens, in plain words.",
    svc: "Service used",
    key: "exam key words",
    trap: "the tempting wrong answer"
  }],
  quiz: [{ app: "A different app", q: "Question", o: ["A", "B", "C"], a: 1, w: "Why" }]
};
```

Categories: `ppl`, `edge`, `compute`, `data`, `msg`, `sec`, `net`.

## Narration

Without audio files, the lesson uses the browser's own voice with subtitles. For a clear, natural voice, record the narration once with Amazon Polly:

```sh
sh web/lessons/tools/make-audio.sh routing l6
```

Then add `window.LESSON.audio = [...]` with one file per step (see the end of `data/routing.js`). Polly output may be stored and replayed at no extra charge. Recording one lesson costs about $0.08.

## Content rules

Every lesson and question must follow [CONTENT-RULES.md](../../CONTENT-RULES.md): original wording, no exam content, and no AWS logos.
