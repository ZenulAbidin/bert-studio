#!/usr/bin/env python3
"""Build an auditable, evidence-backed TalkSearch training set."""
import argparse, base64, json, random, re, ssl, urllib.request
from pathlib import Path


def env_file(path):
    return dict(line.rstrip("\n").split("=", 1) for line in Path(path).read_text().splitlines()
                if "=" in line and not line.lstrip().startswith("#"))


def request(env, endpoint, body):
    req = urllib.request.Request(env["TARGET_URL"].rstrip("/") + endpoint,
                                 data=json.dumps(body).encode(), headers={"Content-Type": "application/json"})
    token = base64.b64encode(f"{env['TARGET_USERNAME']}:{env['TARGET_PASSWORD']}".encode()).decode()
    req.add_header("Authorization", f"Basic {token}")
    with urllib.request.urlopen(req, context=ssl.create_default_context(cafile=env["TARGET_CA_FILE"]), timeout=90) as response:
        return json.load(response)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--env", required=True)
    parser.add_argument("--out", required=True)
    parser.add_argument("--negatives-per-positive", type=int, default=3)
    args = parser.parse_args()
    env = env_file(args.env)
    index = "talksearch_bitcointalk_v2"
    reports = request(env, f"/{index}/_search", {"size": 1000, "_source": ["post_id", "content"], "query": {"simple_query_string": {"query": '"AI/GPT Generated" | "AI Content Detected" | "Probability AI Generated"', "fields": ["content"]}}})["hits"]["hits"]
    evidence = {}
    for hit in reports:
        post = hit.get("_source", {})
        text = post.get("content") or ""
        low = text.lower()
        if "gptzero" not in low or "zerogpt" not in low or ("ai/gpt generated" not in low and "ai content detected" not in low):
            continue
        for target in re.findall(r"(?:msg|#msg)(\d{6,})", text, re.I):
            if str(post.get("post_id")) != target:
                evidence.setdefault(int(target), set()).add(int(post["post_id"]))
    positives = request(env, f"/{index}/_search", {"size": len(evidence) * 2, "_source": ["post_id", "content", "lang"],
        "query": {"bool": {"filter": [{"terms": {"post_id": sorted(evidence)}}, {"term": {"lang": "en"}}]}}})["hits"]["hits"]
    positive_by_id = {}
    for doc in positives:
        source = doc.get("_source", {})
        post_id = source.get("post_id")
        text = source.get("content", "")
        if post_id in evidence and len(text.split()) >= 40:
            positive_by_id.setdefault(post_id, {"post_id": post_id, "text": text, "label": 1,
                                                "evidence_post_ids": sorted(evidence[post_id]),
                                                "label_source": "explicit_multi_detector_report"})
    rows = list(positive_by_id.values())
    wanted_negatives = len(rows) * args.negatives_per_positive
    negatives = request(env, f"/{index}/_search", {"size": min(10000, max(wanted_negatives * 5, 1000)), "_source": ["post_id", "content"], "query": {"function_score": {"query": {"bool": {"filter": [{"term": {"lang": "en"}}], "must_not": [{"terms": {"post_id": sorted(positive_by_id)}}, {"simple_query_string": {"query": "chatgpt | ai generated | gptzero | zerogpt", "fields": ["content"]}}]}}, "random_score": {"seed": 20260823}}}})["hits"]["hits"]
    negative_ids = set()
    for hit in negatives:
        source = hit.get("_source", {})
        post_id = source.get("post_id")
        if post_id not in negative_ids and len(source.get("content", "").split()) >= 40:
            rows.append({"post_id": source["post_id"], "text": source["content"], "label": 0, "evidence_post_ids": [], "label_source": "random_non_ai_mention"})
            negative_ids.add(post_id)
        if len(negative_ids) >= wanted_negatives:
            break
    if len(negative_ids) < wanted_negatives:
        raise RuntimeError(f"Only found {len(negative_ids)} eligible negatives; need {wanted_negatives}")
    random.Random(20260823).shuffle(rows)
    Path(args.out).parent.mkdir(parents=True, exist_ok=True)
    Path(args.out).write_text("".join(json.dumps(row, ensure_ascii=False) + "\n" for row in rows))
    print(json.dumps({"rows": len(rows), "positives": sum(row["label"] for row in rows), "output": args.out}))


if __name__ == "__main__":
    main()
