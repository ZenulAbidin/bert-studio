# Backend

The FastAPI service behind BERT Studio. Setup, configuration and the API are
described in the main documentation:

- [README](../README.md#development-setup): running it locally
- [API reference](../docs/api-reference.md)
- [Architecture](../docs/architecture.md): what each file in this directory does

Quick start for development, with a MongoDB you can reach:

```bash
python3 -m venv .venv && . .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env.local    # set SESSION_SECRET and MONGODB_CONNECTION_STRING
uvicorn main:app --reload --port 8000
```

If a model fails to load with an "unrecognized model type" error, the
installed Transformers is older than the model: `pip install -U transformers`.
