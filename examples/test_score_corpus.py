"""Tests for score_corpus.py against a small fake /classify server.

Run with:  python -m unittest discover -s examples
"""

import contextlib
import io
import json
import os
import tempfile
import threading
import unittest
from unittest import mock
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

import score_corpus


class FakeBackend(BaseHTTPRequestHandler):
    calls = []          # list of request bodies
    fail_next = 0       # number of requests to answer with HTTP 503
    expected_key = "test-key"

    def do_POST(self):  # noqa: N802 (http.server naming)
        body = json.loads(self.rfile.read(int(self.headers["Content-Length"])))
        if self.headers.get("Authorization") != f"Bearer {self.expected_key}":
            self._reply(401, {"detail": "Not authenticated"})
            return
        if FakeBackend.fail_next:
            FakeBackend.fail_next -= 1
            self._reply(503, {"detail": "busy"})
            return
        FakeBackend.calls.append(body)
        results = [
            {"label": "POSITIVE" if "good" in text else "NEGATIVE", "score": 0.9}
            for text in body["texts"]
        ]
        self._reply(200, {"results": results})

    def _reply(self, status, payload):
        data = json.dumps(payload).encode()
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(data)))
        self.end_headers()
        self.wfile.write(data)

    def log_message(self, *args):
        pass


class ScoreCorpusTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.server = ThreadingHTTPServer(("127.0.0.1", 0), FakeBackend)
        cls.url = f"http://127.0.0.1:{cls.server.server_address[1]}"
        threading.Thread(target=cls.server.serve_forever, daemon=True).start()

    @classmethod
    def tearDownClass(cls):
        cls.server.shutdown()

    def setUp(self):
        FakeBackend.calls = []
        FakeBackend.fail_next = 0
        self.tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        self.input = os.path.join(self.tmp.name, "in.jsonl")
        self.output = os.path.join(self.tmp.name, "out.jsonl")
        rows = [{"id": i, "text": ("good " if i % 2 else "bad ") + str(i)} for i in range(5)]
        rows.append({"id": 99, "text": "   "})
        with open(self.input, "w", encoding="utf-8") as handle:
            handle.writelines(json.dumps(row) + "\n" for row in rows)
        os.environ["BERT_STUDIO_API_KEY"] = "test-key"

    def run_script(self, *extra):
        with contextlib.redirect_stderr(io.StringIO()):
            return score_corpus.main(
                [self.input, self.output, "--url", self.url, "--batch-size", "2", *extra]
            )

    def read_output(self):
        with open(self.output, encoding="utf-8") as handle:
            return [json.loads(line) for line in handle]

    def test_scores_in_batches_and_skips_empty(self):
        self.assertEqual(self.run_script("--positive-label", "POSITIVE"), 0)
        rows = self.read_output()
        self.assertEqual([row["id"] for row in rows], ["0", "1", "2", "3", "4"])
        self.assertEqual([len(call["texts"]) for call in FakeBackend.calls], [2, 2, 1])
        self.assertEqual(rows[1]["positive_score"], 0.9)
        self.assertAlmostEqual(rows[0]["positive_score"], 0.1)

    def test_resume_skips_rows_already_scored(self):
        with open(self.output, "w", encoding="utf-8") as handle:
            handle.write(json.dumps({"id": "0", "label": "NEGATIVE", "score": 0.9}) + "\n")
            handle.write('{"id": "1", "lab')  # half-written line from a crash
        self.assertEqual(self.run_script(), 0)
        sent = [text for call in FakeBackend.calls for text in call["texts"]]
        self.assertEqual(sent, ["good 1", "bad 2", "good 3", "bad 4"])

    def test_retries_server_errors(self):
        FakeBackend.fail_next = 1
        with mock.patch.object(score_corpus.time, "sleep"):
            self.assertEqual(self.run_script(), 0)
        self.assertEqual(len(self.read_output()), 5)

    def test_bad_key_stops_without_retry(self):
        os.environ["BERT_STUDIO_API_KEY"] = "wrong"
        self.assertEqual(self.run_script(), 1)
        self.assertEqual(FakeBackend.calls, [])

    def test_lone_surrogate_is_replaced(self):
        self.assertEqual(score_corpus.well_formed("a\ud800b"), "a�b")


if __name__ == "__main__":
    unittest.main()
