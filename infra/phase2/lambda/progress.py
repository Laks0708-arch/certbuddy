"""Save, load and delete a learner's study progress.

Two ways to identify a learner:
  1. Signed in:  header "x-cb-token: <Cognito access token>"  -> stored under "u#<user id>"
  2. Anonymous:  a random backup code (UUID) in the request     -> stored under that UUID

GET    [?learnerId=<uuid>]                        -> returns the saved progress
PUT    {"learnerId": "<uuid>"?, "progress": {}}   -> saves the progress
DELETE [?learnerId=<uuid>]                        -> deletes it (right to erasure)

The token travels in a custom header because CloudFront's origin access control
signs the request to Lambda and replaces the standard Authorization header.
No names or emails are stored. Items expire after a year of no activity.
"""
import base64
import json
import os
import re
import time

import boto3

TABLE = boto3.resource("dynamodb").Table(os.environ["TABLE_NAME"])
COGNITO = boto3.client("cognito-idp")
CLIENT_ID = os.environ.get("CLIENT_ID", "")
UUID = re.compile(r"^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$")
MAX_BYTES = 20_000
ONE_YEAR = 365 * 24 * 3600


def reply(status, body):
    return {"statusCode": status, "headers": {"Content-Type": "application/json"}, "body": json.dumps(body)}


def claims_of(token):
    """Read the (already verified) token's payload."""
    payload = token.split(".")[1]
    return json.loads(base64.urlsafe_b64decode(payload + "=" * (-len(payload) % 4)))


def signed_in_key(event):
    """Return 'u#<sub>' for a valid token from our app, None if no token, or raise PermissionError."""
    token = (event.get("headers") or {}).get("x-cb-token", "")
    if not token:
        return None
    try:
        COGNITO.get_user(AccessToken=token)          # Cognito checks the signature and expiry
        claims = claims_of(token)
    except Exception as exc:
        print(f"token check failed: {type(exc).__name__}: {exc}")   # visible in CloudWatch Logs
        raise PermissionError("invalid or expired sign-in") from exc
    if claims.get("token_use") != "access" or claims.get("client_id") != CLIENT_ID:
        print("token rejected: wrong token_use or client_id")
        raise PermissionError("token is not for this app")
    return "u#" + claims["sub"]


def anonymous_key(value):
    return value if UUID.match(value or "") else None


def handler(event, context):
    method = event.get("requestContext", {}).get("http", {}).get("method", "GET")
    query = event.get("queryStringParameters") or {}

    try:
        user_key = signed_in_key(event)
    except PermissionError as exc:
        return reply(401, {"error": str(exc)})

    if method in ("GET", "DELETE"):
        key = user_key or anonymous_key(query.get("learnerId"))
        if not key:
            return reply(400, {"error": "sign in, or provide a backup code"})
        if method == "DELETE":
            TABLE.delete_item(Key={"learnerId": key})
            return reply(200, {"deleted": True})
        item = TABLE.get_item(Key={"learnerId": key}).get("Item")
        if not item:
            return reply(404, {"error": "no progress saved yet"})
        return reply(200, {"progress": json.loads(item["progress"]), "updatedAt": int(item["updatedAt"])})

    if method in ("PUT", "POST"):
        raw = event.get("body") or ""
        if event.get("isBase64Encoded"):
            raw = base64.b64decode(raw).decode("utf-8", "replace")
        if len(raw.encode()) > MAX_BYTES:
            return reply(413, {"error": "progress too large"})
        try:
            data = json.loads(raw)
        except ValueError:
            return reply(400, {"error": "body must be JSON"})
        key = user_key or anonymous_key(data.get("learnerId"))
        if not key or not isinstance(data.get("progress"), dict):
            return reply(400, {"error": "need a sign-in or backup code, and progress (object)"})
        now = int(time.time())
        TABLE.put_item(Item={
            "learnerId": key,
            "progress": json.dumps(data["progress"]),
            "updatedAt": now,
            "expiresAt": now + ONE_YEAR,
        })
        return reply(200, {"saved": True, "updatedAt": now})

    return reply(405, {"error": "use GET, PUT or DELETE"})
