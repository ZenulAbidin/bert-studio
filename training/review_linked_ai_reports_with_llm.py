#!/usr/bin/env python3
"""Second-pass local-LLM review for linked user-report evidence.

The model's decision is evidence triage, not a claim that a target was AI-written.
Only a direct user allegation concerning the specific linked target is accepted.
"""
import argparse
import json
import os
import re
import urllib.request
from pathlib import Path


SYSTEM = """You are an evidence reviewer for a forum moderation research dataset.
The report may contain unverified allegations. Decide only whether the quoted
evidence specifically alleges that the author of TARGET_POST_ID used AI to write
that target forum post. Do not infer authorship from generic AI policy discussion,
AI-generated images, websites, team biographies, or a different post. Return only
JSON: {\"decision\":\"accept\"|\"reject\"|\"unclear\",\"confidence\":0.0-1.0,\"reason\":\"short\"}."""


def env_file(path):
    return {
        key: value.strip().strip('"').strip("'")
        for line in Path(path).read_text().splitlines()
        if "=" in line and not line.lstrip().startswith("#")
        for key, value in [line.split("=", 1)]
    }


def parse_json(text):
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        match = re.search(r"\{.*\}", text, re.S)
        if not match:
            raise
        return json.loads(match.group(0))


def review(url, key, row):
    user = (
        f"REPORT_POST_ID: {row['report_post_id']}\n"
        f"TARGET_POST_ID: {row['target_post_id']}\n"
        f"EVIDENCE:\n{row['evidence_text'][:900]}"
    )
    body = json.dumps({"messages": [{"role": "system", "content": SYSTEM}, {"role": "user", "content": user}],
                       "temperature": 0, "max_tokens": 110, "response_format": {"type": "json_object"}}).encode()
    request = urllib.request.Request(url, data=body, headers={"Content-Type": "application/json", "Authorization": f"Bearer {key}"})
    with urllib.request.urlopen(request, timeout=90) as response:
        answer = json.load(response)["choices"][0]["message"]["content"]
    verdict = parse_json(answer)
    decision = verdict.get("decision")
    confidence = float(verdict.get("confidence", 0))
    if decision not in {"accept", "reject", "unclear"}:
        raise ValueError(f"invalid decision: {decision!r}")
    return decision, confidence, str(verdict.get("reason", ""))[:300]


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--input", required=True)
    parser.add_argument("--out", required=True)
    parser.add_argument("--llm-env", required=True)
    parser.add_argument("--url", default="http://local-llm:5030/v1/chat/completions")
    parser.add_argument("--threshold", type=float, default=0.85)
    args = parser.parse_args()
    key = env_file(args.llm_env)["LOCAL_LLM_API_KEY"]
    rows = [json.loads(line) for line in Path(args.input).read_text().splitlines() if line.strip()]
    accepted, rejected = [], 0
    for row in rows:
        decision, confidence, reason = review(args.url, key, row)
        row.update(llm_review_model="Qwen2.5-3B-Instruct-Q4_K_M", llm_review_decision=decision,
                   llm_review_confidence=round(confidence, 4), llm_review_reason=reason)
        if decision == "accept" and confidence >= args.threshold:
            accepted.append(row)
        else:
            rejected += 1
    Path(args.out).parent.mkdir(parents=True, exist_ok=True)
    Path(args.out).write_text("".join(json.dumps(row, ensure_ascii=False) + "\n" for row in accepted))
    print(json.dumps({"input": len(rows), "accepted": len(accepted), "rejected_or_unclear": rejected, "output": args.out}))


if __name__ == "__main__":
    main()
