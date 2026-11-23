# BERT Studio

BERT Studio is a self-hosted server for running Hugging Face transformer models
(BERT, RoBERTa, DeBERTa, DistilBERT and similar) over HTTP, with a web
interface for trying them out.

Typical uses:

- **Scoring a large text corpus** with your own fine-tuned classifier: send
  batches of texts, get back a label and a probability for each one. The
  backend keeps the model in memory and uses a GPU when one is available.
- **Trying models** in the browser: classification, embeddings, question
  answering, named entities, fill-mask, summarization and feature extraction.

![BERT Studio web interface](https://i.imgur.com/SJZIUq7.png)

## Contents

- [Quickstart](#quickstart)
- [Scoring a corpus](#scoring-a-corpus)
- [Using a GPU](#using-a-gpu)
- [Using your own model](#using-your-own-model)
- [Web interface](#web-interface)
- [API overview](#api-overview)
- [Configuration](#configuration)
- [Development setup](#development-setup)
- [Security](#security)
- [Documentation](#documentation)
- [License](#license)

## Quickstart

You need Docker with the Compose plugin. This runs on CPU; see
[Using a GPU](#using-a-gpu) for NVIDIA cards.

```bash
git clone https://github.com/ZenulAbidin/bert-studio.git
cd bert-studio
cp backend/.env.example backend/.env.local
```

Edit `backend/.env.local` and replace the three `replace-with-...` values with
long random strings (for example the output of `openssl rand -base64 32`).
`SESSION_SECRET` is required; the backend does not start without it.

Build and start the stack. The CPU-only PyTorch build keeps the image small:

```bash
TORCH_INDEX_URL=https://download.pytorch.org/whl/cpu docker compose up -d --build
docker compose ps        # wait until bert-backend shows "healthy"
```

This starts three containers:

| Container | Address | What it is |
|---|---|---|
| `bert-backend` | `http://127.0.0.1:4794` | The API (FastAPI). Interactive docs at `/docs`. |
| `bert-caddy` | `http://127.0.0.1:4793` | Web interface, plus the API under `/api/`. |
| `bert-mongo` | internal only | Stores API keys and saved custom tasks. |

Both ports listen on 127.0.0.1 only. See [docs/deployment.md](docs/deployment.md)
before exposing anything to a network.

Create an API key:

```bash
export BERT_STUDIO_API_KEY=$(docker compose exec -T backend python backend/create_api_key.py)
```

Classify two texts. The first request downloads the model from the Hugging
Face Hub, so it takes a little longer:

```bash
curl -s http://127.0.0.1:4794/classify \
  -H "Authorization: Bearer $BERT_STUDIO_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"texts": ["I love this.", "This is terrible."],
       "model": "distilbert-base-uncased-finetuned-sst-2-english"}'
```

```json
{"results":[{"label":"POSITIVE","score":0.9998741149902344},{"label":"NEGATIVE","score":0.9996345043182373}]}
```

## Scoring a corpus

`POST /classify` takes up to 128 texts per request (each up to 12,000
characters) and returns results in the same order. The model is loaded once
and cached, so a long run is a loop of batched requests.

[`examples/score_corpus.py`](examples/score_corpus.py) does that loop for a
JSON Lines file. It needs only the Python standard library:

```bash
python3 examples/score_corpus.py examples/sample_corpus.jsonl scores.jsonl \
  --model distilbert-base-uncased-finetuned-sst-2-english \
  --positive-label POSITIVE
```

Input, one object per line:

```json
{"id": "r1", "text": "The battery lasts two days and the screen is bright."}
```

Output, appended one line per scored row:

```json
{"id": "r1", "label": "POSITIVE", "score": 0.999845, "positive_score": 0.999845, "model": "distilbert-base-uncased-finetuned-sst-2-english"}
```

If the script stops (Ctrl-C, a crash, a server restart), run the same command
again: ids already in the output file are skipped. Server errors and rate
limits are retried with backoff; other errors stop the run.

[docs/corpus-scoring.md](docs/corpus-scoring.md) covers batch sizes, text
length, throughput, choosing a threshold, and running the scorer as a service.

## Using a GPU

On a host with an NVIDIA driver and the
[NVIDIA Container Toolkit](https://docs.nvidia.com/datacenter/cloud-native/container-toolkit/latest/install-guide.html),
build the default (CUDA) image and add the GPU override file:

```bash
docker compose -f docker-compose.yml -f docker-compose.gpu.yml up -d --build
curl -s http://127.0.0.1:4794/healthz
```

```json
{"status":"ok","cuda_available":true,"inference_device":"cuda","loaded_classifiers":[]}
```

`INFERENCE_DEVICE` in `backend/.env.local` controls the device: `auto` (the
default) uses the GPU when PyTorch can see one, `cuda` asks for it explicitly,
and `cpu` never uses it. A base-size BERT model needs well under 2 GB of GPU
memory for inference. For Podman and systemd, see
[docs/deployment.md](docs/deployment.md#podman-and-systemd).

## Using your own model

The `model` field accepts either a Hugging Face Hub id or a directory inside
the backend container that holds a model saved with `save_pretrained()`
(`config.json`, the weights and the tokenizer files).

The `/models` volume is the place for local models:

```bash
docker compose cp ./my-classifier backend:/models/my-classifier
```

```bash
curl -s http://127.0.0.1:4794/classify \
  -H "Authorization: Bearer $BERT_STUDIO_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"texts": ["some text"], "model": "/models/my-classifier"}'
```

The label names in the response come from `id2label` in the model's
`config.json`. Set them when you fine-tune, so you get `spam` / `not_spam`
rather than `LABEL_0` / `LABEL_1`. For a private Hub model, set `HF_TOKEN` in
`backend/.env.local`.

## Web interface

Open `http://127.0.0.1:4793` and log in with `AUTH_USERNAME` and
`AUTH_PASSWORD` from `backend/.env.local`. From there you can browse and
download models from the Hub, run each task in a playground, manage API keys
and save custom tasks.

## API overview

All endpoints accept an API key as `Authorization: Bearer <key>` or a
logged-in browser session. Full request and response formats are in
[docs/api-reference.md](docs/api-reference.md), and the running backend serves
interactive docs at `http://127.0.0.1:4794/docs`.

| Method and path | What it does |
|---|---|
| `GET /healthz` | Liveness and GPU status (no authentication) |
| `POST /classify` | Text classification, up to 128 texts per request |
| `POST /embed` | Mean-pooled embeddings (model must be downloaded and loaded first) |
| `POST /qa`, `/ner`, `/fill-mask`, `/summarize`, `/features` | Other pipelines, one text per request |
| `POST /custom-task` | Run saved Python code against a model |
| `GET/POST /models/...` | Search the Hub, download, load and delete models |
| `GET/POST/DELETE /api-keys` | Manage API keys (browser session only) |

## Configuration

Settings are read from `backend/.env.local`, which is not committed.
`backend/.env.example` lists them all.

| Variable | Default | Meaning |
|---|---|---|
| `SESSION_SECRET` | none, required | Signs the login session cookie |
| `AUTH_USERNAME`, `AUTH_PASSWORD` | `bert-developer` / `changeme` | Web interface login. Always change them. |
| `MONGODB_CONNECTION_STRING` | `mongodb://localhost:27017` | `mongodb://mongo:27017` under Compose |
| `MONGODB_DATABASE_NAME` | `bert_studio` | |
| `INFERENCE_DEVICE` | `auto` | `auto`, `cuda` or `cpu` |
| `HF_HOME` | Hugging Face default | Model download cache; `/models/huggingface` under Compose |
| `HF_TOKEN` | unset | For private or gated Hub models |
| `CORS_ORIGINS` | empty | Comma-separated origins allowed to call the API from a browser |

## Development setup

Backend (Python 3.10 or newer, and a MongoDB you can reach):

```bash
cd backend
python3 -m venv .venv && . .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env.local    # set SESSION_SECRET and point MONGODB_CONNECTION_STRING at your MongoDB
uvicorn main:app --reload --port 8000
```

Frontend (Node.js 18 or newer), in a second terminal from the repository root:

```bash
npm ci
npm run dev                   # http://localhost:8080, proxies /api to port 8000
```

Tests for the example scorer:

```bash
python3 -m unittest discover -s examples
```

## Security

- Keep BERT Studio on a private network or behind an authenticating reverse
  proxy. Both published ports bind to 127.0.0.1 by default.
- **Anyone with an API key or a login can run Python code on the server**
  through custom tasks. The import filter in front of them is not a sandbox.
  Give keys only to people you would give a shell on that machine.
- Send API keys in the `Authorization` header. The `api_key` query parameter
  also works, but URLs end up in proxy and access logs.

See [SECURITY.md](SECURITY.md) to report a vulnerability, and
[docs/security.md](docs/security.md) for details.

## Documentation

- [Corpus scoring guide](docs/corpus-scoring.md)
- [API reference](docs/api-reference.md)
- [Deployment](docs/deployment.md): Docker, GPU, Podman and systemd, reverse proxy, backups
- [Security notes](docs/security.md)
- [Architecture](docs/architecture.md)

## Contributing

Bug reports and pull requests are welcome. See [CONTRIBUTING.md](CONTRIBUTING.md).

## License

[MIT](LICENSE)
