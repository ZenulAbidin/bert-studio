from fastapi import FastAPI, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
import torch
from transformers import AutoTokenizer, AutoModel
from huggingface_hub import HfApi
import time
import os

app = FastAPI()

# CORS Middleware
origins = [
    "http://localhost:5173", # Vite default port
    "http://localhost:8080", # Another common dev port
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# In-memory storage for demonstration (replace with persistent storage in production)
settings_store = {
    "hf_token": None,
    "server_url": "http://localhost:8000",
    "model_cache_dir": "./models",
    "notifications": {
        "download_complete": True,
        "on_error": True
    },
    "security": {
        "verify_checksums": True,
        "sandbox_mode": False
    }
}
stats_store = {
    "loaded_models": 0,
    "available_models": "1000+",
    "embeddings_generated": 0,
    "playground_sessions": 0
}
downloaded_models: Dict[str, Dict[str, Any]] = {}
loaded_models: Dict[str, Any] = {}

# --- Helper Functions ---
def _get_model_size(model_id: str) -> int:
    try:
        from huggingface_hub import snapshot_download
        model_path = snapshot_download(repo_id=model_id)
        total_size = sum(os.path.getsize(os.path.join(dirpath, f)) for dirpath, _, filenames in os.walk(model_path) for f in filenames)
        return round(total_size / (1024 * 1024))
    except Exception:
        return 0

def _download_model_task(model_id: str):
    try:
        downloaded_models[model_id] = {"status": "downloading", "size": 0, "timestamp": None}
        tokenizer = AutoTokenizer.from_pretrained(model_id)
        model = AutoModel.from_pretrained(model_id)
        model_size_mb = _get_model_size(model_id)
        
        downloaded_models[model_id] = {
            "status": "completed", "size": model_size_mb, "timestamp": time.strftime("%Y-%m-%d %H:%M")
        }
        if model_id not in loaded_models:
            loaded_models[model_id] = (tokenizer, model)
            stats_store["loaded_models"] += 1
    except Exception as e:
        print(f"Failed to download {model_id}: {e}")
        if model_id in downloaded_models:
            downloaded_models[model_id]["status"] = "failed"

# --- Models and Embedding Logic ---
def get_model_and_tokenizer(model_id: str):
    if model_id not in loaded_models or loaded_models.get(model_id) is None:
        if model_id not in downloaded_models or downloaded_models[model_id].get("status") != "completed":
            raise HTTPException(status_code=400, detail="Model not downloaded or ready. Please download it first.")
        tokenizer, model = loaded_models[model_id]
    return tokenizer, model

class EmbeddingRequest(BaseModel):
    texts: List[str]
    model: Optional[str] = "bert-base-uncased"

@app.get("/")
def read_root():
    return {"message": "Backend is running!"}

@app.post("/embed")
def embed_texts(request: EmbeddingRequest):
    model_id = request.model or "bert-base-uncased"
    try:
        tokenizer, model = get_model_and_tokenizer(model_id)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Model loading failed: {str(e)}")
    with torch.no_grad():
        encoded = tokenizer(request.texts, padding=True, truncation=True, return_tensors="pt")
        output = model(**encoded)
        attention_mask = encoded["attention_mask"]
        last_hidden = output.last_hidden_state
        mask_expanded = attention_mask.unsqueeze(-1).expand(last_hidden.size()).float()
        sum_hidden = torch.sum(last_hidden * mask_expanded, 1)
        sum_mask = torch.clamp(mask_expanded.sum(1), min=1e-9)
        embeddings = sum_hidden / sum_mask
        embeddings_list = embeddings.cpu().tolist()
    stats_store["embeddings_generated"] += len(request.texts)
    return {"embeddings": embeddings_list}

# --- Dashboard ---
@app.get("/stats")
def get_stats():
    return stats_store

# --- Browse Models ---
@app.get("/models/available")
def list_available_models(search: Optional[str] = None, tag: Optional[str] = None):
    TOTAL_SEARCH_LIMIT = 500
    api = HfApi()
    
    try:
        all_models_iterator = api.list_models(
            filter="text-classification",
            search=search if search else "bert",
            sort="downloads",
            direction=-1,
            limit=TOTAL_SEARCH_LIMIT
        )
        bert_models = [m for m in all_models_iterator if 'bert' in m.modelId.lower()]
        if tag:
            bert_models = [m for m in bert_models if tag in (m.tags or [])]
    except Exception as e:
        print(f"Could not fetch from HuggingFace Hub: {e}")
        return []

    response_models = [{
        "id": model.modelId,
        "name": model.modelId.replace(f"{model.author}/", "") if model.author else model.modelId,
        "description": f"A text-classification model by {model.author}." if model.author else "A text-classification model.",
        "tags": model.tags,
        "downloads": model.downloads,
        "likes": model.likes
    } for model in bert_models]
    
    return response_models

@app.post("/models/download")
def download_model(data: dict, background_tasks: BackgroundTasks):
    model_id = data.get("model_id")
    if not model_id or not isinstance(model_id, str):
        raise HTTPException(status_code=400, detail="model_id must be a non-empty string")
    
    if model_id in downloaded_models and downloaded_models[model_id]["status"] in ["completed", "downloading"]:
        return {"message": f"Model {model_id} already downloaded or is downloading."}
    
    background_tasks.add_task(_download_model_task, model_id)
    return {"message": f"Started downloading {model_id}"}

# --- Downloads ---
@app.get("/models/downloaded")
def list_downloaded_models():
    return downloaded_models

@app.delete("/models/downloaded/{model_id}")
def delete_downloaded_model(model_id: str):
    if model_id in downloaded_models:
        del downloaded_models[model_id]
        if model_id in loaded_models:
            del loaded_models[model_id]
            stats_store["loaded_models"] -= 1
        return {"message": f"Deleted {model_id}"}
    raise HTTPException(status_code=404, detail="Model not found")

# --- Playground ---
@app.get("/models/loaded")
def list_loaded_models():
    return [k for k, v in loaded_models.items() if v is not None]

# --- Settings ---
@app.get("/settings")
def get_settings():
    return settings_store

@app.post("/settings")
def update_settings(data: dict):
    for k, v in data.items():
        if k is not None and isinstance(k, str) and k in settings_store:
            settings_store[k] = v
    return {"message": "Settings updated"}

# --- Background jobs and persistent storage ---
# TODO: Implement background jobs for model downloads
# TODO: Replace in-memory stores with persistent storage (e.g., database, file system) 