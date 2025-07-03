# Backend Service

This is a FastAPI backend for BERT embeddings using PyTorch and HuggingFace Transformers.

## Setup

1. Create a virtual environment (optional but recommended):
   ```bash
   python3 -m venv venv
   source venv/bin/activate
   ```

2. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```

## Running the Server

Start the FastAPI server with Uvicorn:

```bash
uvicorn main:app --reload
```

The server will be available at [http://localhost:8000](http://localhost:8000).

## Endpoints

- `GET /` — Health check
- `POST /embed` — Get BERT embeddings for a list of texts (to be implemented) 