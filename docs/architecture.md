# Architecture

```
 browser ──► Caddy :4793 ──/api/* (prefix stripped)──┐
                       └─ everything else ───────────┤
                                                     ▼
 scripts ───────────────────────────────► backend :4794 (FastAPI, one process)
                                            │   ├─ web interface (built React app in backend/static)
                                            │   ├─ Transformers pipelines, cached in memory
                                            │   └─ Hugging Face cache and local models in /models
                                            ▼
                                         MongoDB (API keys, saved custom tasks)
```

## Backend (`backend/`)

| File | Contents |
|---|---|
| `main.py` | The FastAPI app: every endpoint, authentication, model download and load tasks, custom task execution |
| `config.py` | Settings read from the environment and `.env.local` |
| `mongodb_database.py` | MongoDB access for the `custom_tasks` and `api_keys` collections |
| `create_api_key.py` | Creates an API key from the shell |
| `setup_env.py` | Interactive helper that writes a MongoDB connection string to `.env.local` |
| `start_server.py` | Development launcher: installs requirements, checks MongoDB, runs uvicorn with reload |

Models are held in process memory in three places:

- `/classify` keeps one Transformers `text-classification` pipeline per
  model, created on first use, on the device chosen by `INFERENCE_DEVICE`;
- `/embed` uses models loaded explicitly through `/models/load`;
- `/qa`, `/ner`, `/fill-mask`, `/summarize` and `/features` build a pipeline
  per request.

Nothing about models or settings is stored in MongoDB; a restart clears the
in-memory models, and the Hugging Face cache under `/models` keeps the files.

The last route, `GET /{path}`, serves the built web interface, so every API
path has to be registered before it.

## Frontend (`src/`)

React 18, TypeScript, Vite, Tailwind CSS and shadcn/ui components
(`src/components/ui`). `src/lib/api.ts` is an axios client with base URL
`/api`, sending the session cookie. Pages live in `src/pages`, one per route:
dashboard, model browser, downloads, one playground per task, custom tasks,
API keys and settings. Every route except `/login` requires a session.

In production the Dockerfile builds the frontend and copies it into the
backend image; in development `npm run dev` serves it on port 8080 and
proxies `/api` to the backend on port 8000.

## Data

MongoDB database `bert_studio`:

| Collection | Documents |
|---|---|
| `api_keys` | `key`, `created_at`, `revoked`, `last_used_at` |
| `custom_tasks` | `name`, `description`, `model_id`, `tokenizer_code`, `model_code`, `function_code`, `tags`, `batch_mode`, `created_at`, `updated_at` |
