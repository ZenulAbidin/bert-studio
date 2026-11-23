# API reference

The backend is a FastAPI application. A running backend also serves this
information, generated from the code, at `/docs` (Swagger UI) and
`/openapi.json`.

## Base URL

| Route | Base URL | Notes |
|---|---|---|
| Directly to the backend | `http://127.0.0.1:4794` | Use this from scripts on the same host or network |
| Through Caddy | `http://127.0.0.1:4793/api` | What the web interface uses; Caddy strips the `/api` prefix |

The paths below are relative to either base URL.

## Authentication

Every endpoint except `GET /healthz`, `GET /status`, `GET /stats`,
`GET /captcha`, `GET /auth/check` and the login itself needs one of:

- an **API key** in the header: `Authorization: Bearer <key>`. The
  `?api_key=<key>` query parameter also works, but avoid it: URLs are
  written to access logs;
- a **browser session**: the signed `session` cookie set by a successful
  login.

A missing or wrong key returns `401 {"detail": "Not authenticated"}`.

### Creating an API key

From the shell on the server (no browser needed):

```bash
docker compose exec -T backend python backend/create_api_key.py
```

Or log in to the web interface and use the API Keys page. The key is shown
once. Keys are stored in MongoDB.

| Method and path | Body | Response |
|---|---|---|
| `POST /api-keys` | none | `{"id": "...", "key": "..."}` |
| `GET /api-keys` | none | `{"api_keys": [{"id", "created_at", "revoked", "last_used_at"}]}` |
| `DELETE /api-keys/{id}` | none | `{"success": true}` |

These three need a logged-in browser session; an API key alone cannot create
or list keys.

### Web login

| Method and path | Body | Response |
|---|---|---|
| `GET /captcha` | none | PNG image; sets the session cookie |
| `POST /api/login` | `{"username", "password", "captcha"}` | `{"success": true}` and a logged-in session cookie |
| `POST /logout` | none | `{"success": true}` |
| `GET /auth/check` | none | `{"authenticated": true}` or `false` |

## Health

### `GET /healthz`

No authentication. Suitable for container health checks.

```json
{
  "status": "ok",
  "cuda_available": true,
  "inference_device": "cuda",
  "loaded_classifiers": ["distilbert-base-uncased-finetuned-sst-2-english"]
}
```

`loaded_classifiers` lists the models that `/classify` has in memory.

## Text classification

### `POST /classify`

Runs a Hugging Face `text-classification` pipeline. The pipeline for each
model is built on first use and then cached for the life of the process, on
the device chosen by `INFERENCE_DEVICE`. The model does not need to be
downloaded or loaded first: a Hub model is downloaded on the first request.

Request:

```json
{
  "texts": ["I love this.", "This is terrible."],
  "model": "distilbert-base-uncased-finetuned-sst-2-english"
}
```

| Field | Type | Rules |
|---|---|---|
| `texts` | array of strings | 1 to 128 items; each 1 to 12,000 characters and not only whitespace |
| `model` | string, optional | Hub id, or a directory inside the container. Default `distilbert-base-uncased-finetuned-sst-2-english` |

Response, one result per input text, in the same order:

```json
{
  "results": [
    {"label": "POSITIVE", "score": 0.9998},
    {"label": "NEGATIVE", "score": 0.9997}
  ]
}
```

`label` is the top label from the model's `id2label`; `score` is its
probability. Texts longer than the model's maximum length (512 tokens for
BERT-style models) are truncated.

Errors:

| Status | When |
|---|---|
| `422` | A limit above is broken, or the body is not valid JSON |
| `400` | The model cannot be loaded or is not a sequence classifier; `detail` says why |

See the [corpus scoring guide](corpus-scoring.md) for batching large inputs.

## Embeddings

### `POST /embed` and `POST /embed/batch`

Both take the same body and return mean-pooled last-layer embeddings, one
vector per text.

```json
{"texts": ["first text", "second text"], "model": "bert-base-uncased"}
```

```json
{"embeddings": [[0.0123, -0.0456, ...], [0.0789, ...]]}
```

Unlike `/classify`, the model must first be downloaded and loaded with
`POST /models/download` and `POST /models/load` (or from the web interface).
Otherwise the response is `400` with a message saying which step is missing.

## Other pipelines

Each of these takes one text per request and builds the pipeline on every
call, so they suit interactive use rather than bulk jobs.

| Method and path | Request | Response | Default model |
|---|---|---|---|
| `POST /qa` | `{"question", "context", "model"?}` | `{"answer", "score", "start", "end"}` | `bert-large-uncased-whole-word-masking-finetuned-squad` |
| `POST /ner` | `{"text", "model"?}` | `{"entities": [...]}` | `dslim/bert-base-NER` |
| `POST /fill-mask` | `{"text", "model"?}` (text contains `[MASK]`) | `{"results": [...]}` | `bert-base-uncased` |
| `POST /summarize` | `{"text", "model"?}` | `{"summary": "..."}` | `facebook/bart-large-cnn` |
| `POST /features` | `{"text", "model"?}` | `{"features": [...]}` | `bert-base-uncased` |

## Custom tasks

A custom task is three snippets of Python run by the backend: tokenizer code,
model code, and a function named `custom_function`. Anyone who can call these
endpoints can run code on the server; see [security.md](security.md).

### `POST /custom-task`

```json
{
  "model_id": "distilbert-base-uncased-finetuned-sst-2-english",
  "tokenizer_code": "tokenizer = AutoTokenizer.from_pretrained(model_id)",
  "model_code": "model = AutoModelForSequenceClassification.from_pretrained(model_id)",
  "function_code": "def custom_function(text):\n    inputs = tokenizer(text, return_tensors='pt', truncation=True)\n    probs = torch.softmax(model(**inputs).logits, dim=-1)[0]\n    return {model.config.id2label[i]: float(p) for i, p in enumerate(probs)}",
  "input_text": "I love this."
}
```

```json
{"result": {"NEGATIVE": 0.0002, "POSITIVE": 0.9998}, "error": null}
```

Errors in the code come back as `{"result": null, "error": "..."}` with
status 200.

### `POST /custom-task/batch`

Same as above with `input_texts` (an array) instead of `input_text`.
`custom_function` receives the whole list and must return a list of the same
length. Response: `{"results": [...], "errors": [...]}`.

### Saved tasks

Tasks can be stored in MongoDB and shared between installations.

| Method and path | What it does |
|---|---|
| `POST /custom-tasks` | Save a task: `{"name", "description", "model_id", "tokenizer_code", "model_code", "function_code", "tags"?, "batch_mode"?}` |
| `GET /custom-tasks` | List saved tasks |
| `GET /custom-tasks/{id}` | Get one task |
| `PUT /custom-tasks/{id}` | Replace a task (same body as saving) |
| `DELETE /custom-tasks/{id}` | Delete a task |
| `GET /custom-tasks/search/{query}` | Search by name, description and tags |
| `GET /custom-tasks/model/{model_id}` | Tasks for one model |
| `GET /custom-tasks/tags/{tags}` | Tasks with any of the comma-separated tags |
| `POST /custom-tasks/import` | Import tasks from an export |

## Model management

These manage the Hugging Face cache and the in-memory models used by
`/embed`. `/classify` does not need them.

| Method and path | Body or query | What it does |
|---|---|---|
| `GET /models/available` | `?search=&tag=` | Search the Hub for BERT text-classification models (up to 500) |
| `POST /models/download` | `{"model_id"}` | Start a background download |
| `GET /models/downloaded` | none | Downloads in progress and models in the cache, with sizes |
| `DELETE /models/downloaded` | `?author=&model=` | Remove a model from memory and the cache |
| `POST /models/load` | `{"model_id"}` | Load a downloaded model into memory, in the background |
| `GET /models/loading` | none | Load progress and errors |
| `GET /models/loaded` | none | Models in memory |

## Settings and statistics

| Method and path | What it does |
|---|---|
| `GET /settings`, `POST /settings` | Web interface settings. Kept in memory only; reset on restart |
| `GET /stats` | Counters shown on the dashboard |
| `GET /status` | `{"message": "Backend is running!"}` |
