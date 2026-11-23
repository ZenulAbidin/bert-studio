#!/usr/bin/env python3
"""Score a JSON Lines corpus with a BERT Studio text classifier.

Reads one JSON object per line, sends the texts to ``POST /classify`` in
batches, and appends one result per line to the output file. If the output
file already exists, rows whose id is already in it are skipped, so an
interrupted run continues where it stopped.

Uses only the Python standard library.

Example:

    export BERT_STUDIO_API_KEY=...
    python examples/score_corpus.py examples/sample_corpus.jsonl scores.jsonl \
        --model distilbert-base-uncased-finetuned-sst-2-english \
        --positive-label POSITIVE
"""

from __future__ import annotations

import argparse
import json
import os
import sys
import time
import urllib.error
import urllib.request
from typing import Any, Dict, Iterator, List, Optional, Set, Tuple

SERVER_MAX_BATCH = 128
SERVER_MAX_CHARS = 12000


def well_formed(text: str) -> str:
    """Replace lone UTF-16 surrogates, which cannot be encoded as UTF-8."""
    return "".join("�" if 0xD800 <= ord(ch) <= 0xDFFF else ch for ch in text)


def read_done_ids(path: str, id_field: str) -> Set[str]:
    done: Set[str] = set()
    if not os.path.exists(path):
        return done
    with open(path, encoding="utf-8") as handle:
        for line in handle:
            line = line.strip()
            if not line:
                continue
            try:
                done.add(str(json.loads(line)[id_field]))
            except (ValueError, KeyError):
                # A half-written last line from a crash; that row is redone.
                continue
    return done


def read_corpus(
    path: str, id_field: str, text_field: str, max_chars: int
) -> Iterator[Tuple[str, str]]:
    with open(path, encoding="utf-8") as handle:
        for number, line in enumerate(handle, start=1):
            line = line.strip()
            if not line:
                continue
            row = json.loads(line)
            if id_field not in row or text_field not in row:
                raise SystemExit(
                    f"{path}:{number}: missing '{id_field}' or '{text_field}'"
                )
            text = well_formed(str(row[text_field])).strip()[:max_chars]
            yield str(row[id_field]), text


def batches(rows: Iterator[Tuple[str, str]], size: int) -> Iterator[List[Tuple[str, str]]]:
    batch: List[Tuple[str, str]] = []
    for row in rows:
        batch.append(row)
        if len(batch) == size:
            yield batch
            batch = []
    if batch:
        yield batch


class ScoringError(Exception):
    pass


def classify(
    url: str,
    api_key: Optional[str],
    texts: List[str],
    model: Optional[str],
    timeout: float,
    retries: int,
) -> List[Dict[str, Any]]:
    body: Dict[str, Any] = {"texts": texts}
    if model:
        body["model"] = model
    data = json.dumps(body).encode("utf-8")
    headers = {"Content-Type": "application/json"}
    if api_key:
        headers["Authorization"] = f"Bearer {api_key}"

    delay = 2.0
    for attempt in range(retries + 1):
        request = urllib.request.Request(
            url.rstrip("/") + "/classify", data=data, headers=headers, method="POST"
        )
        try:
            with urllib.request.urlopen(request, timeout=timeout) as response:
                results = json.load(response)["results"]
            if len(results) != len(texts):
                raise ScoringError(f"sent {len(texts)} texts, got {len(results)} results")
            return results
        except urllib.error.HTTPError as exc:
            detail = exc.read().decode("utf-8", "replace")[:300]
            # 4xx means the request itself is wrong (bad key, bad model, bad
            # text); retrying will not help. 429 and 5xx are worth a retry.
            if exc.code < 500 and exc.code != 429:
                raise ScoringError(f"HTTP {exc.code}: {detail}") from exc
            error: Exception = ScoringError(f"HTTP {exc.code}: {detail}")
        except (urllib.error.URLError, TimeoutError, ConnectionError) as exc:
            error = exc
        if attempt == retries:
            raise ScoringError(f"giving up after {retries + 1} attempts: {error}")
        print(f"retrying in {delay:.0f}s: {error}", file=sys.stderr)
        time.sleep(delay)
        delay = min(delay * 2, 60.0)
    raise AssertionError("unreachable")


def to_output(
    row_id: str,
    id_field: str,
    result: Dict[str, Any],
    model: Optional[str],
    positive_label: Optional[str],
) -> Dict[str, Any]:
    out: Dict[str, Any] = {
        id_field: row_id,
        "label": result["label"],
        "score": round(float(result["score"]), 6),
    }
    if positive_label is not None:
        # For a two-label model, turn "top label + its probability" into the
        # probability of one fixed label, which is easier to threshold.
        is_positive = str(result["label"]).casefold() == positive_label.casefold()
        score = float(result["score"])
        out["positive_score"] = round(score if is_positive else 1.0 - score, 6)
    if model:
        out["model"] = model
    return out


def main(argv: Optional[List[str]] = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__.split("\n\n")[0])
    parser.add_argument("input", help="JSON Lines file, one object per line")
    parser.add_argument("output", help="JSON Lines file to append results to")
    parser.add_argument(
        "--url",
        default=os.environ.get("BERT_STUDIO_URL", "http://127.0.0.1:4794"),
        help="backend base URL (default: %(default)s or $BERT_STUDIO_URL)",
    )
    parser.add_argument("--model", help="Hugging Face model id or a path inside the container")
    parser.add_argument("--id-field", default="id")
    parser.add_argument("--text-field", default="text")
    parser.add_argument("--batch-size", type=int, default=32)
    parser.add_argument("--max-chars", type=int, default=4000,
                        help="truncate each text to this many characters (server limit 12000)")
    parser.add_argument("--positive-label",
                        help="also write positive_score, the probability of this label (two-label models)")
    parser.add_argument("--timeout", type=float, default=120.0, help="seconds per request")
    parser.add_argument("--retries", type=int, default=5)
    parser.add_argument("--pause", type=float, default=0.0, help="seconds to sleep between batches")
    args = parser.parse_args(argv)

    if not 1 <= args.batch_size <= SERVER_MAX_BATCH:
        parser.error(f"--batch-size must be 1-{SERVER_MAX_BATCH}")
    if not 1 <= args.max_chars <= SERVER_MAX_CHARS:
        parser.error(f"--max-chars must be 1-{SERVER_MAX_CHARS}")
    api_key = os.environ.get("BERT_STUDIO_API_KEY")

    done = read_done_ids(args.output, args.id_field)
    skipped_empty = 0

    def pending() -> Iterator[Tuple[str, str]]:
        nonlocal skipped_empty
        for row_id, text in read_corpus(args.input, args.id_field, args.text_field, args.max_chars):
            if row_id in done:
                continue
            if not text:
                skipped_empty += 1
                continue
            yield row_id, text

    scored = 0
    started = time.monotonic()
    with open(args.output, "a", encoding="utf-8") as out:
        for batch in batches(pending(), args.batch_size):
            try:
                results = classify(
                    args.url, api_key, [text for _, text in batch],
                    args.model, args.timeout, args.retries,
                )
            except ScoringError as exc:
                print(f"error: {exc}", file=sys.stderr)
                print(f"stopped after {scored} new rows; run again to resume", file=sys.stderr)
                return 1
            for (row_id, _), result in zip(batch, results):
                record = to_output(row_id, args.id_field, result, args.model, args.positive_label)
                out.write(json.dumps(record, ensure_ascii=False) + "\n")
            out.flush()
            os.fsync(out.fileno())
            scored += len(batch)
            rate = scored / max(time.monotonic() - started, 1e-9)
            print(f"scored {scored} new rows ({rate:.1f}/s)", file=sys.stderr)
            if args.pause:
                time.sleep(args.pause)

    print(
        f"done: {scored} new, {len(done)} already in {args.output}, {skipped_empty} empty skipped",
        file=sys.stderr,
    )
    return 0


if __name__ == "__main__":
    sys.exit(main())
