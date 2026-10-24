#!/bin/sh
# Records narration for one lesson with Amazon Polly (neural voice "Amy", British English).
# Usage: sh web/lessons/tools/make-audio.sh routing l6
# Cost: roughly $16 per million characters (neural). One lesson is ~5,000 characters, about $0.08.
# Polly output may be stored and replayed with no extra charge.
set -e
cd "$(dirname "$0")/.."
LESSON=$1; PREFIX=$2
osascript -l JavaScript tools/narr-dump.js "$(pwd)/narrate.js" "$(pwd)/data/$LESSON.js" > "/tmp/$LESSON.narr.txt"
python3 - "$LESSON" "$PREFIX" <<'PY'
import subprocess, sys
lesson, prefix = sys.argv[1], sys.argv[2]
parts = open(f"/tmp/{lesson}.narr.txt").read().split("\n@@@\n")
for i, text in enumerate(parts, 1):
    out = f"audio/{prefix}-{i:02d}.mp3"
    subprocess.run(["aws", "polly", "synthesize-speech", "--region", "us-east-1", "--engine", "neural",
                    "--voice-id", "Amy", "--output-format", "mp3", "--text", text.strip(), out], check=True,
                   stdout=subprocess.DEVNULL)
    print("recorded", out)
PY
