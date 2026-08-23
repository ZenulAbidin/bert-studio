#!/usr/bin/env python3
"""Mine auditable *user-reported* AI-use labels from linked TalkSearch posts.

This does not decide whether a post was actually AI-written.  It identifies a
much narrower training signal: a user links a particular post and alleges that
the author used AI.  Every accepted label keeps the report and evidence window
so it can be reviewed or removed later.
"""
import argparse
import base64
import html
import json
import os
import re
import ssl
import urllib.request
from pathlib import Path


LINK = re.compile(r"(?:#?msg|\.msg)(\d{4,})", re.I)
AI_WORDS = re.compile(r"\b(?:ai|chatgpt|gpt[- ]?\d*|llm|artificial intelligence)\b", re.I)
# A small lexical guard prevents the NLI model from accepting a mere discussion
# of AI tools as an allegation against a linked post.
ALLEGATION = re.compile(
    r"\b(?:using|used|use|written|write|generated|generate|made|create[ds]?|produced|copy(?:ing|ied)?|plagiar(?:ized|ism)|bot)\b",
    re.I,
)


def load_env(path):
    return {
        key: value.strip().strip('"').strip("'")
        for line in Path(path).read_text().splitlines()
        if "=" in line and not line.lstrip().startswith("#")
        for key, value in [line.split("=", 1)]
    }


def request(env, endpoint, body):
    token = base64.b64encode(
        f"{env['TARGET_USERNAME']}:{env['TARGET_PASSWORD']}".encode()
    ).decode()
    req = urllib.request.Request(
        env["TARGET_URL"].rstrip("/") + endpoint,
        data=json.dumps(body).encode(),
        headers={"Content-Type": "application/json", "Authorization": f"Basic {token}"},
    )
    with urllib.request.urlopen(
        req, context=ssl.create_default_context(cafile=env["TARGET_CA_FILE"]), timeout=90
    ) as response:
        return json.load(response)


def plain_text(content):
    return re.sub(r"\s+", " ", html.unescape(re.sub(r"<[^>]+>", " ", content or ""))).strip()


def evidence_windows(text):
    """Return (target id, localized evidence) pairs, de-duplicated per report."""
    windows = {}
    for match in LINK.finditer(text):
        start = max(0, match.start() - 650)
        end = min(len(text), match.end() + 650)
        window = text[start:end]
        target = int(match.group(1))
        # A link alone is not a label.  The reporter must mention AI and an
        # accusation/action close enough for a human reviewer to understand it.
        if AI_WORDS.search(window) and ALLEGATION.search(window):
            windows.setdefault(target, window)
    return windows.items()


def iter_reports(env, index):
    query = {
        "simple_query_string": {
            "query": '(chatgpt | "ai generated" | "ai-written" | "ai written" | '
            '"using ai" | "used ai" | "ai content" | "gpt generated" | gptzero | zerogpt)',
            "fields": ["content"],
            "default_operator": "or",
        }
    }
    after = None
    while True:
        body = {
            "size": 500,
            "_source": ["post_id", "topic_id", "content", "date"],
            "query": query,
            "sort": [{"post_id": "asc"}],
        }
        if after is not None:
            body["search_after"] = after
        hits = request(env, f"/{index}/_search", body)["hits"]["hits"]
        if not hits:
            return
        yield from hits
        after = hits[-1]["sort"]


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--env", required=True)
    parser.add_argument("--out", required=True)
    parser.add_argument("--index", default="talksearch_posts_v3_en")
    parser.add_argument("--model", default="MoritzLaurer/deberta-v3-base-zeroshot-v1.1-all-33")
    parser.add_argument("--threshold", type=float, default=0.80)
    parser.add_argument("--device", type=int, default=0)
    parser.add_argument("--limit", type=int, default=0, help="candidate limit; 0 means all")
    args = parser.parse_args()

    # Delayed import keeps corpus-only inspection usable in minimal environments.
    from transformers import pipeline

    classifier = pipeline("zero-shot-classification", model=args.model, device=args.device)
    env = load_env(args.env)
    candidates = []
    seen = set()
    for hit in iter_reports(env, args.index):
        report = hit.get("_source", {})
        report_id = int(report["post_id"])
        for target_id, evidence in evidence_windows(plain_text(report.get("content"))):
            if target_id == report_id or (report_id, target_id) in seen:
                continue
            seen.add((report_id, target_id))
            candidates.append(
                {
                    "report_post_id": report_id,
                    "report_topic_id": report.get("topic_id"),
                    "target_post_id": target_id,
                    "report_date": report.get("date"),
                    "evidence_text": evidence,
                }
            )
            if args.limit and len(candidates) >= args.limit:
                break
        if args.limit and len(candidates) >= args.limit:
            break

    accepted = []
    for row in candidates:
        result = classifier(
            row["evidence_text"],
            candidate_labels=["the linked post's author is being accused of using AI to write it"],
            hypothesis_template="This report says that {}.",
            multi_label=True,
            truncation=True,
        )
        score = float(result["scores"][0])
        row.update(
            label="user_reported_ai_link" if score >= args.threshold else "rejected_or_ambiguous",
            nli_entailment_score=round(score, 6),
            nli_model=args.model,
            nli_hypothesis="the linked post's author is being accused of using AI to write it",
        )
        if score >= args.threshold:
            accepted.append(row)

    Path(args.out).parent.mkdir(parents=True, exist_ok=True)
    Path(args.out).write_text("".join(json.dumps(row, ensure_ascii=False) + "\n" for row in accepted))
    print(json.dumps({"candidates": len(candidates), "accepted": len(accepted), "threshold": args.threshold, "output": args.out}))


if __name__ == "__main__":
    main()
