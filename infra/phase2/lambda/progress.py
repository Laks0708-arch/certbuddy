"""Save and load a learner's study progress.

GET  ?learnerId=<uuid>                      -> returns the saved progress
PUT  {"learnerId": "<uuid>", "progress": {}} -> saves the progress

The learner ID is a random UUID made in the learner's browser, so no personal
data (name, email) is stored. Items expire after a year of no activity.
"""
import json
import os
import re
import time

import boto3

TABLE = boto3.resource("dynamodb").Table(os.environ["TABLE_NAME"])
UUID = re.compile(r"^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$")
MAX_BYTES = 20_000          # progress larger than this is rejected
ONE_YEAR = 365 * 24 * 3600


def reply(status, body):
    return {"statusCode": status, "headers": {"Content-Type": "application/json"}, "body": json.dumps(body)}


def handler(event, context):
    method = event.get("requestContext", {}).get("http", {}).get("method", "GET")

    if method == "GET":
        learner_id = (event.get("queryStringParameters") or {}).get("learnerId", "")
        if not UUID.match(learner_id):
            return reply(400, {"error": "learnerId must be a UUID"})
        item = TABLE.get_item(Key={"learnerId": learner_id}).get("Item")
        if not item:
            return reply(404, {"error": "no progress saved yet"})
        return reply(200, {"progress": json.loads(item["progress"]), "updatedAt": int(item["updatedAt"])})

    if method in ("PUT", "POST"):
        raw = event.get("body") or ""
        if len(raw.encode()) > MAX_BYTES:
            return reply(413, {"error": "progress too large"})
        try:
            data = json.loads(raw)
        except ValueError:
            return reply(400, {"error": "body must be JSON"})
        learner_id = data.get("learnerId", "")
        if not UUID.match(learner_id) or not isinstance(data.get("progress"), dict):
            return reply(400, {"error": "need learnerId (UUID) and progress (object)"})
        now = int(time.time())
        TABLE.put_item(Item={
            "learnerId": learner_id,
            "progress": json.dumps(data["progress"]),
            "updatedAt": now,
            "expiresAt": now + ONE_YEAR,   # DynamoDB TTL deletes inactive learners' data
        })
        return reply(200, {"saved": True, "updatedAt": now})

    return reply(405, {"error": "use GET or PUT"})
