# Scoring a text corpus

This guide is about running one classifier over many texts (thousands to
millions): forum posts, reviews, support tickets, documents. It assumes the
stack from the [Quickstart](../README.md#quickstart) is running and you have
an API key in `BERT_STUDIO_API_KEY`.

## How it works

1. Your client reads the corpus and sends batches to `POST /classify`.
2. The first request for a model builds a Hugging Face `text-classification`
   pipeline and keeps it in memory. Later requests reuse it.
3. Each request returns one `{"label", "score"}` per text, in input order.
   `score` is the probability of the returned label (the top label).
4. The client writes results somewhere durable and moves on to the next batch.

The server keeps no state about your corpus, so the client decides what has
been scored. Restarting the backend only costs reloading the model.

## The example script

[`examples/score_corpus.py`](../examples/score_corpus.py) is a complete client
in about 200 lines of standard-library Python. Copy it and adapt it.

```bash
python3 examples/score_corpus.py corpus.jsonl scores.jsonl \
  --model /models/my-classifier \
  --positive-label spam \
  --batch-size 32 --max-chars 4000
```

| Option | Default | Meaning |
|---|---|---|
| `--url` | `$BERT_STUDIO_URL` or `http://127.0.0.1:4794` | Backend address |
| `--model` | server default | Hub id or a path inside the container |
| `--id-field`, `--text-field` | `id`, `text` | Field names in the input |
| `--batch-size` | 32 | Texts per request, 1 to 128 |
| `--max-chars` | 4000 | Characters kept from each text, 1 to 12,000 |
| `--positive-label` | unset | Also write `positive_score`, the probability of this label |
| `--timeout` | 120 | Seconds per request |
| `--retries` | 5 | Retries for 429, 5xx and connection errors |
| `--pause` | 0 | Seconds to sleep between batches |

The script:

- **resumes**: it reads the ids already in the output file and skips them. A
  half-written last line after a crash is ignored and that row is redone;
- **retries** 429, 5xx, timeouts and refused connections with exponential
  backoff (2 s doubling to 60 s), and **stops** on other 4xx errors such as a
  wrong key or a model that does not exist, because retrying cannot fix them;
- **skips** empty texts, since the server rejects them;
- **replaces** lone UTF-16 surrogates (common in scraped text) with U+FFFD,
  because they cannot be encoded as UTF-8;
- **fsyncs** the output after every batch, so a power cut loses at most one
  batch.

If your corpus is in a database rather than a file, keep the same shape:
select rows in a stable order (for example by primary key), remember the last
key you stored, and continue from there after a restart.

## Plain HTTP

Any language works. One request:

```bash
curl -s http://127.0.0.1:4794/classify \
  -H "Authorization: Bearer $BERT_STUDIO_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"texts": ["first text", "second text"], "model": "/models/my-classifier"}'
```

```json
{"results": [{"label": "spam", "score": 0.97}, {"label": "not_spam", "score": 0.88}]}
```

Limits per request: 1 to 128 texts, each 1 to 12,000 characters and not only
whitespace. Breaking a limit returns `422`. A model that cannot be loaded, or
is not a sequence classifier, returns `400` with the reason in `detail`.

## Positive score

For a two-label model you usually want one number per text: the probability
of the label you care about. `/classify` returns the top label, so convert:

```python
p = score if label == "spam" else 1 - score
```

This holds only for two-label models. For more labels, the top label and its
probability are all `/classify` returns; if you need every label's
probability, use a [custom task](api-reference.md#custom-tasks) that returns
the full softmax.

## Text length

BERT-style models read at most 512 tokens (roughly 300 to 400 English words).
Longer texts are truncated by the tokenizer, so characters beyond that limit
are sent and then ignored. Trimming on the client side (`--max-chars`) saves
bandwidth and JSON parsing. Around 2,000 to 4,000 characters covers 512
tokens for most English text. If the end of long documents matters, split
them into chunks and combine the chunk scores yourself (for example the
maximum or the mean).

## Throughput

What matters most, roughly in order:

1. **GPU or CPU.** A GPU is usually at least ten times faster for
   base-size models. Check `GET /healthz`: `inference_device` should be `cuda`.
2. **Text length.** Cost grows with token count; truncating to what the model
   reads is free speed.
3. **Batch size.** 16 to 64 is a good range on a GPU. Larger batches help only
   while the GPU has memory to spare; on CPU, batch size matters little.
4. **Model size.** A distilled model (DistilBERT, MiniLM) is noticeably faster
   than a base model; a large model is several times slower.

Measure on your own data: the script prints rows per second after each batch.
The backend is a single process that shares one copy of the model between
requests, so one or two client loops are usually enough to keep a GPU busy. If the host also serves other work,
use `--pause` (or the equivalent in your client) to leave it headroom.

## Choosing a threshold

A score is not a decision. Before acting on the output:

1. Label a random sample by hand (a few hundred texts at least), spread over
   the kinds of text in the corpus: sources, dates, lengths, languages.
2. Score the sample and pick the threshold that gives the precision you need.
3. Check the error rate per group. A model trained on one language or one
   source often does much worse on others.
4. Store the model id with every score, so results from different model
   versions are never mixed.

The script writes `model` into every output row for that last reason.

## Running as a service

For a corpus that keeps growing, run the scorer as a long-lived process that
scores new rows, then sleeps and checks again. Some practical points:

- Start it after the backend is healthy. With systemd, use
  `After=` / `Wants=` on the backend unit, and poll `GET /healthz` before the
  first batch.
- Give it low priority (`Nice=19`, a `CPUQuota=`) if it shares the host.
- Keep the API key in an environment file readable only by the service user,
  not in the unit file or on the command line.
- Send each batch only once you have stored the previous one, and retry the
  same batch after an error. That way a crash or restart never skips rows.
