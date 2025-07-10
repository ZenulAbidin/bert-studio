from fastapi import FastAPI, HTTPException, BackgroundTasks, Query, Request, Path, Depends, Header
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, RootModel
from typing import List, Optional, Dict, Any
import torch
import transformers
from transformers import AutoTokenizer, AutoModel, AutoModelForSequenceClassification, pipeline, Pipeline
from huggingface_hub import HfApi, hf_hub_download, hf_hub_url, get_hf_file_metadata, scan_cache_dir
import time
import os
import numpy as np
from mongodb_database import mongodb_manager, CustomTask
from datetime import datetime
import secrets

# --- Session and Captcha Auth ---
from fastapi import Response, status, Depends
from fastapi.responses import StreamingResponse, JSONResponse
from itsdangerous import URLSafeSerializer, BadSignature
from io import BytesIO
from PIL import Image, ImageDraw, ImageFont
import random, string
from config import Config

SESSION_SECRET = os.getenv("SESSION_SECRET", "supersecretkey")
session_serializer = URLSafeSerializer(SESSION_SECRET, salt="session")

# Helper: get session from cookie

def get_session(request: Request):
    cookie = request.cookies.get("session")
    if not cookie:
        return {}
    try:
        return session_serializer.loads(cookie)
    except BadSignature:
        return {}

def set_session(response: Response, session: dict):
    cookie_val = session_serializer.dumps(session)
    response.set_cookie("session", cookie_val, httponly=True, samesite="lax")

def clear_session(response: Response):
    response.delete_cookie("session")

# Captcha generation

def generate_captcha_text(length=5):
    return ''.join(random.choices(string.ascii_uppercase + string.digits, k=length))

def generate_captcha_image(text):
    img = Image.new('RGB', (120, 40), color=(255, 255, 255))
    d = ImageDraw.Draw(img)
    # Use a truetype font if available, else default
    try:
        font = ImageFont.truetype("arial.ttf", 28)
    except:
        font = ImageFont.load_default()
    d.text((10, 5), text, font=font, fill=(0, 0, 0))
    # Add noise
    for _ in range(30):
        x1 = random.randint(0, 120)
        y1 = random.randint(0, 40)
        x2 = random.randint(0, 120)
        y2 = random.randint(0, 40)
        d.line(((x1, y1), (x2, y2)), fill=(0,0,0), width=1)
    return img

app = FastAPI(
    title="BERT Studio Embedding API",
    version="1.0.0",
    description="API for loading HuggingFace models from local storage and generating embeddings for input text."
    )

# CORS Middleware
origins = [
    "http://localhost:8000", # Vite default port
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
loaded_models: Dict[str, Any] = {}  # Only stores models now
loaded_tokenizers: Dict[str, Any] = {}  # New: stores tokenizers
loading_models: Dict[str, Dict[str, Any]] = {}  # Track loading status

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
        api = HfApi()
        files = api.list_repo_files(repo_id=model_id, repo_type="model")
        total_files = len(files)
        files_downloaded = 0
        total_bytes = 0
        downloaded_bytes = 0
        # Precompute total size
        file_sizes = {}
        for filename in files:
            try:
                url = hf_hub_url(repo_id=model_id, filename=filename)
                meta = get_hf_file_metadata(url)
                file_sizes[filename] = meta.size or 0
                total_bytes += meta.size or 0
            except Exception as e:
                print(f"Could not get size for {filename}: {e}")
                file_sizes[filename] = 0
        total_size_mb = round(total_bytes / (1024 * 1024))
        downloaded_models[model_id] = {
            "status": "downloading",
            "size": total_size_mb,
            "timestamp": None,
            "progress": 0,
            "files_downloaded": 0,
            "total_files": total_files,
            "downloaded_size_mb": 0,
            "total_size_mb": total_size_mb
        }
        for filename in files:
            try:
                local_path = hf_hub_download(repo_id=model_id, filename=filename)
                if os.path.exists(local_path):
                    downloaded_bytes += file_sizes[filename]
            except Exception as file_e:
                print(f"Failed to download file {filename} for {model_id}: {file_e}")
                continue
            files_downloaded += 1
            progress = int((files_downloaded / total_files) * 100)
            downloaded_models[model_id]["progress"] = progress
            downloaded_models[model_id]["files_downloaded"] = files_downloaded
            downloaded_models[model_id]["downloaded_size_mb"] = round(downloaded_bytes / (1024 * 1024))
        downloaded_models[model_id].update({
            "status": "completed",
            "timestamp": time.strftime("%Y-%m-%d %H:%M"),
            "progress": 100,
            "files_downloaded": total_files,
            "downloaded_size_mb": total_size_mb
        })
        # Load model and tokenizer after download
        tokenizer = AutoTokenizer.from_pretrained(model_id)
        model = AutoModel.from_pretrained(model_id, device_map='cpu')
        if model_id not in loaded_models:
            loaded_models[model_id] = model
            loaded_tokenizers[model_id] = tokenizer
            stats_store["loaded_models"] += 1
    except Exception as e:
        print(f"Failed to download {model_id}: {e}")
        if model_id in downloaded_models:
            downloaded_models[model_id]["status"] = "failed"
            downloaded_models[model_id]["progress"] = 0

def _load_model_task(model_id: str):
    """
    Background task to load a model into memory.
    """
    try:
        # Initialize loading status
        loading_models[model_id] = {
            "status": "loading",
            "timestamp": time.strftime("%Y-%m-%d %H:%M"),
            "progress": 0
        }


        # Load tokenizer first
        loading_models[model_id]["progress"] = 25
        tokenizer = AutoTokenizer.from_pretrained(model_id)
        
        # Load model
        loading_models[model_id]["progress"] = 75
        model = AutoModel.from_pretrained(model_id, device_map='cpu')
        
        # Store in memory
        loaded_models[model_id] = model
        loaded_tokenizers[model_id] = tokenizer
        stats_store["loaded_models"] += 1
        
        # Update status to completed
        loading_models[model_id].update({
            "status": "completed",
            "progress": 100,
            "timestamp": time.strftime("%Y-%m-%d %H:%M")
        })
        
        print(f"Successfully loaded model {model_id}")
        
    except Exception as e:
        error_msg = str(e)
        print(f"Failed to load {model_id}: {error_msg}")
        if model_id in loading_models:
            loading_models[model_id]["status"] = "failed"
            loading_models[model_id]["progress"] = 0
            loading_models[model_id]["error_message"] = error_msg
        # Clean up any partial loads
        if model_id in loaded_models:
            del loaded_models[model_id]
        if model_id in loaded_tokenizers:
            del loaded_tokenizers[model_id]

def _cleanup_loading_status():
    """
    Clean up old loading status entries.
    """
    current_time = time.time()
    to_remove = []
    
    for model_id, status_info in loading_models.items():
        # Remove entries older than 1 hour
        if status_info["status"] in ["completed", "failed"]:
            # Parse timestamp and check if older than 1 hour
            try:
                timestamp = time.strptime(status_info["timestamp"], "%Y-%m-%d %H:%M")
                timestamp_seconds = time.mktime(timestamp)
                if current_time - timestamp_seconds > 3600:  # 1 hour
                    to_remove.append(model_id)
            except:
                # If timestamp parsing fails, remove after 1 hour
                to_remove.append(model_id)
    
    for model_id in to_remove:
        del loading_models[model_id]

# --- Models and Embedding Logic ---
def get_model_and_tokenizer(model_id: str):
    if model_id not in loaded_models or loaded_models.get(model_id) is None or \
       model_id not in loaded_tokenizers or loaded_tokenizers.get(model_id) is None:
        # Check if model is currently loading
        if model_id in loading_models and loading_models[model_id]["status"] == "loading":
            raise HTTPException(status_code=400, detail="Model is currently being loaded. Please wait for it to complete.")
        # Check if model is downloaded
        if model_id not in downloaded_models or downloaded_models[model_id].get("status") != "completed":
            raise HTTPException(status_code=400, detail="Model not downloaded or ready. Please download it first.")
        raise HTTPException(status_code=400, detail="Model is not loaded in memory. Please load it first.")
    model = loaded_models[model_id]
    tokenizer = loaded_tokenizers[model_id]
    return tokenizer, model

class EmbeddingRequest(BaseModel):
    texts: List[str]
    model: Optional[str] = "bert-base-uncased"

class DownloadModelRequest(BaseModel):
    model_id: str
    class Config:
        protected_namespaces = ()

class LoadModelRequest(BaseModel):
    model_id: str
    class Config:
        protected_namespaces = ()

class SettingsUpdateRequest(BaseModel):
    hf_token: Optional[str] = None
    server_url: Optional[str] = None
    model_cache_dir: Optional[str] = None
    notifications: Optional[dict] = None
    security: Optional[dict] = None
    class Config:
        protected_namespaces = ()

class MessageResponse(BaseModel):
    message: str

class HealthResponse(BaseModel):
    message: str

class EmbeddingResponse(BaseModel):
    embeddings: List[List[float]]

class StatsResponse(BaseModel):
    loaded_models: int
    available_models: str
    embeddings_generated: int
    playground_sessions: int

class ModelInfo(BaseModel):
    id: str
    name: str
    description: str
    tags: Optional[List[str]] = None
    downloads: Optional[int] = None
    likes: Optional[int] = None

class AvailableModelsResponse(RootModel[List[ModelInfo]]):
    pass

class DownloadedModelInfo(BaseModel):
    status: str
    size: int
    timestamp: Optional[str]
    progress: int
    files_downloaded: int
    total_files: int
    downloaded_size_mb: int
    total_size_mb: int

class DownloadedModelsResponse(RootModel[Dict[str, DownloadedModelInfo]]):
    pass

class LoadedModelsResponse(RootModel[List[str]]):
    pass

class LoadingModelInfo(BaseModel):
    status: str
    timestamp: Optional[str]
    progress: int
    error_message: Optional[str] = None

class LoadingModelsResponse(RootModel[Dict[str, LoadingModelInfo]]):
    pass

class SettingsNotifications(BaseModel):
    download_complete: bool
    on_error: bool

class SettingsSecurity(BaseModel):
    verify_checksums: bool
    sandbox_mode: bool

class SettingsResponse(BaseModel):
    hf_token: Optional[str]
    server_url: str
    model_cache_dir: str
    notifications: SettingsNotifications
    security: SettingsSecurity
    class Config:
        protected_namespaces = ()

def login_required(request: Request):
    session = get_session(request)
    if not session.get('logged_in'):
        raise HTTPException(status_code=401, detail="Not authenticated")
    return session

def api_key_or_login_required(request: Request, authorization: str = Header(None)):
    # 1. Check for API key in Authorization header
    api_key = None
    if authorization and authorization.lower().startswith('bearer '):
        api_key = authorization[7:]
    # 2. Or in query param
    if not api_key:
        api_key = request.query_params.get('api_key')
    # 3. Validate API key
    if api_key and mongodb_manager.validate_api_key(api_key):
        return {"api_key": api_key}
    # 4. Fallback to session
    session = get_session(request)
    if not session.get('logged_in'):
        raise HTTPException(status_code=401, detail="Not authenticated")
    return session

@app.get("/", response_model=HealthResponse)
def read_root():
    """
    Health check endpoint.
    Returns a simple message to confirm the backend is running.
    """
    # Clean up old loading status entries
    _cleanup_loading_status()
    return {"message": "Backend is running!"}

@app.post("/embed", response_model=EmbeddingResponse)
def embed_texts(request: EmbeddingRequest, session=Depends(api_key_or_login_required)):
    """
    Generate embeddings for a list of input texts using a loaded HuggingFace model.
    """
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

class BatchEmbeddingRequest(BaseModel):
    texts: List[str]
    model: Optional[str] = "bert-base-uncased"

class BatchEmbeddingResponse(BaseModel):
    embeddings: List[List[float]]

@app.post("/embed/batch", response_model=BatchEmbeddingResponse)
def embed_texts_batch(request: BatchEmbeddingRequest, session=Depends(api_key_or_login_required)):
    """
    Generate embeddings for a batch of input texts using a loaded HuggingFace model.
    """
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
@app.get("/stats", response_model=StatsResponse)
def get_stats():
    """
    Get backend statistics.
    """
    return stats_store

# --- Browse Models ---
@app.get("/models/available", response_model=AvailableModelsResponse)
def list_available_models(search: Optional[str] = None, tag: Optional[str] = None):
    """
    List available BERT models from HuggingFace Hub.
    """
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

    response_models = [
        ModelInfo(
            id=model.modelId,
            name=model.modelId.replace(f"{model.author}/", "") if model.author else model.modelId,
            description=f"A text-classification model by {model.author}." if model.author else "A text-classification model.",
            tags=model.tags,
            downloads=model.downloads,
            likes=model.likes
        ) for model in bert_models
    ]
    
    return AvailableModelsResponse(response_models)

@app.post("/models/download", response_model=MessageResponse)
def download_model(data: DownloadModelRequest, background_tasks: BackgroundTasks):
    """
    Download a model from HuggingFace Hub in the background.
    """
    model_id = data.model_id
    if not model_id or not isinstance(model_id, str):
        raise HTTPException(status_code=400, detail="model_id must be a non-empty string")
    if model_id in downloaded_models and downloaded_models[model_id]["status"] in ["completed", "downloading"]:
        return {"message": f"Model {model_id} already downloaded or is downloading."}
    background_tasks.add_task(_download_model_task, model_id)
    return {"message": f"Started downloading {model_id}"}

# --- Downloads ---
@app.get("/models/downloaded", response_model=DownloadedModelsResponse)
def list_downloaded_models():
    """
    List all downloaded models (from memory and HuggingFace cache).
    """
    # Start with tracked models
    models = dict(downloaded_models)
    # Scan HuggingFace cache for all cached model repos
    try:
        cache_info = scan_cache_dir()
        for repo in cache_info.repos:
            if repo.repo_type != "model":
                continue
            model_id = repo.repo_id
            # If not already tracked, add as completed
            if model_id not in models:
                models[model_id] = {
                    "status": "completed",
                    "size": round(repo.size_on_disk / (1024 * 1024)),
                    "timestamp": None,
                    "progress": 100,
                    "files_downloaded": repo.nb_files,
                    "total_files": repo.nb_files,
                    "downloaded_size_mb": round(repo.size_on_disk / (1024 * 1024)),
                    "total_size_mb": round(repo.size_on_disk / (1024 * 1024)),
                }
    except Exception as e:
        print(f"Failed to scan HF cache: {e}")
    # Convert to DownloadedModelsResponse
    models_out = {k: DownloadedModelInfo(**v) for k, v in models.items()}
    return DownloadedModelsResponse(models_out)

@app.delete("/models/downloaded", response_model=MessageResponse)
def delete_downloaded_model(author: str = Query(...), model: str = Query(...)):
    """
    Delete a downloaded model from memory and HuggingFace cache.
    """
    model_id = f"{author}/{model}"
    # Remove from in-memory stores if present
    in_memory_deleted = False
    if model_id in downloaded_models:
        del downloaded_models[model_id]
        in_memory_deleted = True
    if model_id in loaded_models:
        del loaded_models[model_id]
    if model_id in loaded_tokenizers:
        del loaded_tokenizers[model_id]
    if in_memory_deleted:
        stats_store["loaded_models"] = max(0, stats_store["loaded_models"] - 1)
    # Always attempt to remove from HF cache
    cache_deleted = False
    try:
        cache_info = scan_cache_dir()
        for repo in cache_info.repos:
            if repo.repo_type == "model" and repo.repo_id == model_id:
                # Delete all revisions for this model
                revision_hashes = [rev.commit_hash for rev in repo.revisions]
                if revision_hashes:
                    delete_strategy = cache_info.delete_revisions(*revision_hashes)
                    delete_strategy.execute()
                    cache_deleted = True
    except Exception as e:
        print(f"Failed to delete {model_id} from HF cache: {e}")
    if in_memory_deleted or cache_deleted:
        return {"message": f"Deleted {model_id} from memory and/or HuggingFace cache"}
    raise HTTPException(status_code=404, detail="Model not found in memory or cache")

# --- Playground ---
@app.get("/models/loaded", response_model=LoadedModelsResponse)
def list_loaded_models():
    """
    List all currently loaded models in memory.
    """
    return LoadedModelsResponse([k for k, v in loaded_models.items() if v is not None])

@app.get("/models/loading", response_model=LoadingModelsResponse)
def list_loading_models():
    """
    List all models currently being loaded.
    """
    return LoadingModelsResponse(loading_models)

# --- Settings ---
@app.get("/settings", response_model=SettingsResponse)
def get_settings():
    """
    Get backend settings.
    """
    return SettingsResponse(
        hf_token=settings_store["hf_token"],
        server_url=settings_store["server_url"],
        model_cache_dir=settings_store["model_cache_dir"],
        notifications=SettingsNotifications(**settings_store["notifications"]),
        security=SettingsSecurity(**settings_store["security"])
    )

@app.post("/settings", response_model=MessageResponse)
def update_settings(data: SettingsUpdateRequest):
    """
    Update backend settings.
    """
    for k, v in data.dict(exclude_unset=True).items():
        if k is not None and isinstance(k, str) and k in settings_store:
            settings_store[k] = v
    return {"message": "Settings updated"}

@app.post("/models/load", response_model=MessageResponse)
def load_model(data: LoadModelRequest, background_tasks: BackgroundTasks):
    """
    Load a model from local cache into memory in the background.
    """
    model_id = data.model_id
    if not model_id or not isinstance(model_id, str):
        raise HTTPException(status_code=400, detail="model_id must be a non-empty string")
    
    # Check if already loaded
    if model_id in loaded_models and loaded_models[model_id] is not None and \
       model_id in loaded_tokenizers and loaded_tokenizers[model_id] is not None:
        return {"message": f"Model {model_id} is already loaded."}
    
    # Check if already loading
    if model_id in loading_models and loading_models[model_id]["status"] in ["loading"]:
        return {"message": f"Model {model_id} is already being loaded."}
    
    # Check if model is available
    in_downloaded = model_id in downloaded_models and downloaded_models[model_id].get("status") == "completed"
    in_cache = False
    if not in_downloaded:
        try:
            cache_info = scan_cache_dir()
            for repo in cache_info.repos:
                if repo.repo_type == "model" and repo.repo_id == model_id:
                    in_cache = True
                    break
        except Exception as e:
            print(f"Failed to scan HF cache: {e}")
    
    if not in_downloaded and not in_cache:
        raise HTTPException(status_code=400, detail="Model is not downloaded, not ready, and not found in cache.")
    
    # Start background loading task
    background_tasks.add_task(_load_model_task, model_id)
    return {"message": f"Started loading {model_id} in the background"}

# --- ML Activity Endpoints ---
class ClassificationRequest(BaseModel):
    texts: List[str]
    model: Optional[str] = "distilbert-base-uncased-finetuned-sst-2-english"

class ClassificationResponse(BaseModel):
    results: List[Dict[str, Any]]

@app.post("/classify", response_model=ClassificationResponse)
def classify_texts(request: ClassificationRequest, session=Depends(api_key_or_login_required)):
    model_id = request.model or "distilbert-base-uncased-finetuned-sst-2-english"
    try:
        classifier = pipeline("sentiment-analysis", model=model_id)
        results = classifier(request.texts)
        return {"results": results}
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Classification not supported for this model: {str(e)}")

# --- Custom Tasks Endpoint ---
class CustomTaskRequest(BaseModel):
    tokenizer_code: str
    model_code: str
    function_code: str
    input_text: str
    model_id: str

class CustomTaskResponse(BaseModel):
    result: Any
    error: Optional[str] = None

class BatchCustomTaskRequest(BaseModel):
    tokenizer_code: str
    model_code: str
    function_code: str
    input_texts: List[str]
    model_id: str

class BatchCustomTaskResponse(BaseModel):
    results: List[Any]
    errors: List[Optional[str]]

def _validate_and_sanitize_code(code: str, code_type: str) -> str:
    """
    Validate and sanitize code to ensure security.
    """
    # Check for disallowed imports
    disallowed_imports = [
        'import os', 'from os', 'import sys', 'from sys', 'import subprocess', 
        'from subprocess', 'import eval', 'from eval', 'import exec', 'from exec',
        'import __import__', 'from __import__', 'import globals', 'from globals',
        'import locals', 'from locals', 'import open', 'from open', 'import file',
        'from file', 'import input', 'from input', 'import raw_input', 'from raw_input'
    ]
    
    code_lower = code.lower()
    for disallowed in disallowed_imports:
        if disallowed in code_lower:
            raise HTTPException(
                status_code=400, 
                detail=f"Security violation: {disallowed} is not allowed in {code_type} code"
            )
    
    # Only allow transformers and torch imports
    allowed_imports = ['import torch', 'from torch', 'import transformers', 'from transformers']
    has_allowed_import = any(allowed in code_lower for allowed in allowed_imports)
    
    if not has_allowed_import and ('import' in code_lower or 'from' in code_lower):
        raise HTTPException(
            status_code=400,
            detail=f"Only 'transformers' and 'torch' imports are allowed in {code_type} code. Implicit imports are forbidden."
        )
    
    return code

def _execute_custom_task(tokenizer_code: str, model_code: str, function_code: str, input_text: str, model_id: str):
    """
    Execute custom task with security restrictions.
    """
    try:
        # Validate all code inputs
        tokenizer_code = _validate_and_sanitize_code(tokenizer_code, "tokenizer")
        model_code = _validate_and_sanitize_code(model_code, "model")
        function_code = _validate_and_sanitize_code(function_code, "function")
        
        # Create a restricted execution environment
        restricted_globals: Dict[str, Any] = {}
        
        # Add basic builtins
        restricted_globals.update({
            'print': print,
            'len': len,
            'str': str,
            'int': int,
            'float': float,
            'list': list,
            'dict': dict,
            'tuple': tuple,
            'set': set,
            'bool': bool,
            'type': type,
            'isinstance': isinstance,
            'range': range,
            'enumerate': enumerate,
            'zip': zip,
            'map': map,
            'filter': filter,
            'sum': sum,
            'max': max,
            'min': min,
            'abs': abs,
            'round': round,
            'sorted': sorted,
            'reversed': reversed,
            'any': any,
            'all': all,
            'chr': chr,
            'ord': ord,
            'hex': hex,
            'oct': oct,
            'bin': bin,
            'format': format,
            'repr': repr,
            'ascii': ascii,
            'hash': hash,
            'id': id,
            'callable': callable,
            'getattr': getattr,
            'hasattr': hasattr,
            'setattr': setattr,
            'delattr': delattr,
            'property': property,
            'super': super,
            'object': object,
            'Exception': Exception,
            'ValueError': ValueError,
            'TypeError': TypeError,
            'IndexError': IndexError,
            'KeyError': KeyError,
            'AttributeError': AttributeError,
            'RuntimeError': RuntimeError,
            'ImportError': ImportError,
            'NameError': NameError,
            'UnboundLocalError': UnboundLocalError,
            'ZeroDivisionError': ZeroDivisionError,
            'OverflowError': OverflowError,
            'FloatingPointError': FloatingPointError,
            'AssertionError': AssertionError,
            'NotImplementedError': NotImplementedError,
            'ArithmeticError': ArithmeticError,
            'BufferError': BufferError,
            'EOFError': EOFError,
            'LookupError': LookupError,
            'MemoryError': MemoryError,
            'OSError': OSError,
            'ReferenceError': ReferenceError,
            'SyntaxError': SyntaxError,
            'SystemError': SystemError,
            'Warning': Warning,
            'UserWarning': UserWarning,
            'DeprecationWarning': DeprecationWarning,
            'PendingDeprecationWarning': PendingDeprecationWarning,
            'SyntaxWarning': SyntaxWarning,
            'RuntimeWarning': RuntimeWarning,
            'FutureWarning': FutureWarning,
            'ImportWarning': ImportWarning,
            'UnicodeWarning': UnicodeWarning,
            'BytesWarning': BytesWarning,
            'ResourceWarning': ResourceWarning,
        })
        
        # Add allowed modules
        restricted_globals['torch'] = torch
        restricted_globals['transformers'] = transformers
        restricted_globals['AutoTokenizer'] = AutoTokenizer
        restricted_globals['AutoModel'] = AutoModel
        restricted_globals['AutoModelForSequenceClassification'] = AutoModelForSequenceClassification
        restricted_globals['pipeline'] = pipeline
        
        # Expose model_id to the sandbox
        restricted_globals['model_id'] = model_id
        
        # Execute tokenizer code
        exec(tokenizer_code, restricted_globals)
        if 'tokenizer' not in restricted_globals:
            raise ValueError("Tokenizer code must assign to variable 'tokenizer'")
        
        # Execute model code
        exec(model_code, restricted_globals)
        if 'model' not in restricted_globals:
            raise ValueError("Model code must assign to variable 'model'")
        
        # Create the function
        exec(function_code, restricted_globals)
        if 'custom_function' not in restricted_globals:
            raise ValueError("Function code must define a function named 'custom_function'")
        
        # Execute the function with input text
        custom_function = restricted_globals['custom_function']
        result = custom_function(input_text)
        
        return result
        
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Custom task execution failed: {str(e)}")

@app.post("/custom-task", response_model=CustomTaskResponse)
def execute_custom_task(request: CustomTaskRequest, session=Depends(api_key_or_login_required)):
    """
    Execute custom tasks with security restrictions.
    """
    try:
        result = _execute_custom_task(
            request.tokenizer_code,
            request.model_code,
            request.function_code,
            request.input_text,
            request.model_id
        )
        return {"result": result, "error": None}
    except Exception as e:
        return {"result": None, "error": str(e)}

@app.post("/custom-task/batch", response_model=BatchCustomTaskResponse)
def execute_custom_task_batch(request: BatchCustomTaskRequest, session=Depends(api_key_or_login_required)):
    """
    Execute a custom task for a batch of input texts with security restrictions, efficiently in one call.
    The provided function_code must define custom_function(input_texts: List[str]) -> List[Any].
    """
    try:
        # Validate and sanitize code
        tokenizer_code = _validate_and_sanitize_code(request.tokenizer_code, "tokenizer")
        model_code = _validate_and_sanitize_code(request.model_code, "model")
        function_code = _validate_and_sanitize_code(request.function_code, "function")

        # Create a restricted execution environment
        restricted_globals: Dict[str, Any] = {}
        # Add basic builtins (same as _execute_custom_task)
        restricted_globals.update({
            'print': print,
            'len': len,
            'str': str,
            'int': int,
            'float': float,
            'list': list,
            'dict': dict,
            'tuple': tuple,
            'set': set,
            'bool': bool,
            'type': type,
            'isinstance': isinstance,
            'range': range,
            'enumerate': enumerate,
            'zip': zip,
            'map': map,
            'filter': filter,
            'sum': sum,
            'max': max,
            'min': min,
            'abs': abs,
            'round': round,
            'sorted': sorted,
            'reversed': reversed,
            'any': any,
            'all': all,
            'chr': chr,
            'ord': ord,
            'hex': hex,
            'oct': oct,
            'bin': bin,
            'format': format,
            'repr': repr,
            'ascii': ascii,
            'hash': hash,
            'id': id,
            'callable': callable,
            'getattr': getattr,
            'hasattr': hasattr,
            'setattr': setattr,
            'delattr': delattr,
            'property': property,
            'super': super,
            'object': object,
            'Exception': Exception,
            'ValueError': ValueError,
            'TypeError': TypeError,
            'IndexError': IndexError,
            'KeyError': KeyError,
            'AttributeError': AttributeError,
            'RuntimeError': RuntimeError,
            'ImportError': ImportError,
            'NameError': NameError,
            'UnboundLocalError': UnboundLocalError,
            'ZeroDivisionError': ZeroDivisionError,
            'OverflowError': OverflowError,
            'FloatingPointError': FloatingPointError,
            'AssertionError': AssertionError,
            'NotImplementedError': NotImplementedError,
            'ArithmeticError': ArithmeticError,
            'BufferError': BufferError,
            'EOFError': EOFError,
            'LookupError': LookupError,
            'MemoryError': MemoryError,
            'OSError': OSError,
            'ReferenceError': ReferenceError,
            'SyntaxError': SyntaxError,
            'SystemError': SystemError,
            'Warning': Warning,
            'UserWarning': UserWarning,
            'DeprecationWarning': DeprecationWarning,
            'PendingDeprecationWarning': PendingDeprecationWarning,
            'SyntaxWarning': SyntaxWarning,
            'RuntimeWarning': RuntimeWarning,
            'FutureWarning': FutureWarning,
            'ImportWarning': ImportWarning,
            'UnicodeWarning': UnicodeWarning,
            'BytesWarning': BytesWarning,
            'ResourceWarning': ResourceWarning,
        })
        # Add allowed modules
        restricted_globals['torch'] = torch
        restricted_globals['transformers'] = transformers
        restricted_globals['AutoTokenizer'] = AutoTokenizer
        restricted_globals['AutoModel'] = AutoModel
        restricted_globals['AutoModelForSequenceClassification'] = AutoModelForSequenceClassification
        restricted_globals['pipeline'] = pipeline
        restricted_globals['model_id'] = request.model_id
        # Execute tokenizer and model code
        exec(tokenizer_code, restricted_globals)
        if 'tokenizer' not in restricted_globals:
            raise ValueError("Tokenizer code must assign to variable 'tokenizer'")
        exec(model_code, restricted_globals)
        if 'model' not in restricted_globals:
            raise ValueError("Model code must assign to variable 'model'")
        # Create the function
        exec(function_code, restricted_globals)
        if 'custom_function' not in restricted_globals:
            raise ValueError("Function code must define a function named 'custom_function'")
        custom_function = restricted_globals['custom_function']
        # Call the function ONCE with the whole batch
        results = custom_function(request.input_texts)
        if not isinstance(results, list):
            raise ValueError("custom_function must return a list of results, one per input text")
        return {"results": results, "errors": [None] * len(results)}
    except Exception as e:
        return {"results": [None] * len(request.input_texts), "errors": [str(e)] * len(request.input_texts)}

# --- Custom Task Management Endpoints ---
class SaveTaskRequest(BaseModel):
    name: str
    description: str
    model_id: str
    tokenizer_code: str
    model_code: str
    function_code: str
    tags: Optional[str] = None
    batch_mode: Optional[bool] = None

class TaskInfo(BaseModel):
    id: str
    name: str
    description: str
    model_id: str
    tokenizer_code: str
    model_code: str
    function_code: str
    tags: Optional[str]
    created_at: str
    updated_at: str
    batch_mode: Optional[bool] = None

class TasksResponse(BaseModel):
    tasks: List[TaskInfo]

class ImportTasksRequest(BaseModel):
    tasks: List[Dict[str, Any]]

@app.post("/custom-tasks", response_model=MessageResponse)
def save_custom_task(request: SaveTaskRequest, session=Depends(api_key_or_login_required)):
    """
    Save a custom task to the database.
    """
    try:
        task = CustomTask(
            id=None,
            name=request.name,
            description=request.description,
            model_id=request.model_id,
            tokenizer_code=request.tokenizer_code,
            model_code=request.model_code,
            function_code=request.function_code,
            tags=request.tags,
            created_at=datetime.now().isoformat(),
            updated_at=datetime.now().isoformat(),
            batch_mode=request.batch_mode,
        )
        task_id = mongodb_manager.create_task(task)
        return {"message": f"Task '{request.name}' saved successfully with ID {task_id}"}
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to save task: {str(e)}")

@app.get("/custom-tasks", response_model=TasksResponse)
def get_custom_tasks(session=Depends(api_key_or_login_required)):
    """
    Get all saved custom tasks.
    """
    try:
        tasks = mongodb_manager.get_all_tasks()
        task_infos = [
            TaskInfo(
                id=task.id,
                name=task.name,
                description=task.description,
                model_id=task.model_id,
                tokenizer_code=task.tokenizer_code,
                model_code=task.model_code,
                function_code=task.function_code,
                tags=task.tags,
                created_at=task.created_at,
                updated_at=task.updated_at,
                batch_mode=task.batch_mode,
            )
            for task in tasks
        ]
        return TasksResponse(tasks=task_infos)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to get tasks: {str(e)}")

@app.get("/custom-tasks/{task_id}", response_model=TaskInfo)
def get_custom_task(task_id: str, session=Depends(api_key_or_login_required)):
    """
    Get a specific custom task by ID.
    """
    try:
        task = mongodb_manager.get_task_by_id(task_id)
        if not task:
            raise HTTPException(status_code=404, detail="Task not found")
        return TaskInfo(
            id=task.id,
            name=task.name,
            description=task.description,
            model_id=task.model_id,
            tokenizer_code=task.tokenizer_code,
            model_code=task.model_code,
            function_code=task.function_code,
            tags=task.tags,
            created_at=task.created_at,
            updated_at=task.updated_at,
            batch_mode=task.batch_mode,
        )
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to get task: {str(e)}")

@app.put("/custom-tasks/{task_id}", response_model=MessageResponse)
def update_custom_task(task_id: str, request: SaveTaskRequest, session=Depends(api_key_or_login_required)):
    """
    Update an existing custom task.
    """
    try:
        task = CustomTask(
            id=task_id,
            name=request.name,
            description=request.description,
            model_id=request.model_id,
            tokenizer_code=request.tokenizer_code,
            model_code=request.model_code,
            function_code=request.function_code,
            tags=request.tags,
            created_at="",  # Will be preserved
            updated_at=datetime.now().isoformat(),
            batch_mode=request.batch_mode,
        )
        success = mongodb_manager.update_task(task_id, task)
        if not success:
            raise HTTPException(status_code=404, detail="Task not found")
        return {"message": f"Task '{request.name}' updated successfully"}
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to update task: {str(e)}")

@app.delete("/custom-tasks/{task_id}", response_model=MessageResponse)
def delete_custom_task(task_id: str, session=Depends(api_key_or_login_required)):
    """
    Delete a custom task.
    """
    try:
        success = mongodb_manager.delete_task(task_id)
        if not success:
            raise HTTPException(status_code=404, detail="Task not found")
        
        return {"message": "Task deleted successfully"}
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to delete task: {str(e)}")

@app.get("/custom-tasks/search/{query}", response_model=TasksResponse)
def search_custom_tasks(query: str, session=Depends(api_key_or_login_required)):
    """
    Search custom tasks by name, description, or tags.
    """
    try:
        tasks = mongodb_manager.search_tasks(query)
        task_infos = [
            TaskInfo(
                id=task.id,
                name=task.name,
                description=task.description,
                model_id=task.model_id,
                tokenizer_code=task.tokenizer_code,
                model_code=task.model_code,
                function_code=task.function_code,
                tags=task.tags,
                created_at=task.created_at,
                updated_at=task.updated_at,
                batch_mode=task.batch_mode,
            )
            for task in tasks
        ]
        return TasksResponse(tasks=task_infos)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to search tasks: {str(e)}")

@app.get("/custom-tasks/model/{model_id}", response_model=TasksResponse)
def get_tasks_by_model(model_id: str, session=Depends(api_key_or_login_required)):
    """
    Get all custom tasks for a specific model.
    """
    try:
        tasks = mongodb_manager.get_tasks_by_model(model_id)
        task_infos = [
            TaskInfo(
                id=task.id,
                name=task.name,
                description=task.description,
                model_id=task.model_id,
                tokenizer_code=task.tokenizer_code,
                model_code=task.model_code,
                function_code=task.function_code,
                tags=task.tags,
                created_at=task.created_at,
                updated_at=task.updated_at,
                batch_mode=task.batch_mode,
            )
            for task in tasks
        ]
        return TasksResponse(tasks=task_infos)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to get tasks for model: {str(e)}")

@app.get("/custom-tasks/export", response_model=List[Dict[str, Any]])
def export_custom_tasks(session=Depends(api_key_or_login_required)):
    """
    Export all custom tasks as JSON.
    """
    try:
        return mongodb_manager.export_tasks()
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to export tasks: {str(e)}")

@app.post("/custom-tasks/import", response_model=MessageResponse)
def import_custom_tasks(request: ImportTasksRequest, session=Depends(api_key_or_login_required)):
    """
    Import custom tasks from JSON.
    """
    try:
        created_ids = mongodb_manager.import_tasks(request.tasks)
        return {"message": f"Successfully imported {len(created_ids)} tasks"}
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to import tasks: {str(e)}")

@app.get("/custom-tasks/stats")
def get_task_stats(session=Depends(api_key_or_login_required)):
    """
    Get statistics about custom tasks.
    """
    try:
        return mongodb_manager.get_task_stats()
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to get task stats: {str(e)}")

@app.get("/custom-tasks/tags/{tags}")
def get_tasks_by_tags(tags: str, session=Depends(api_key_or_login_required)):
    """
    Get tasks that have any of the specified tags.
    """
    try:
        tag_list = [tag.strip() for tag in tags.split(',')]
        tasks = mongodb_manager.get_tasks_by_tags(tag_list)
        task_infos = [
            TaskInfo(
                id=task.id,
                name=task.name,
                description=task.description,
                model_id=task.model_id,
                tokenizer_code=task.tokenizer_code,
                model_code=task.model_code,
                function_code=task.function_code,
                tags=task.tags,
                created_at=task.created_at,
                updated_at=task.updated_at,
                batch_mode=task.batch_mode,
            )
            for task in tasks
        ]
        return TasksResponse(tasks=task_infos)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to get tasks by tags: {str(e)}")

class QARequest(BaseModel):
    question: str
    context: str
    model: Optional[str] = "bert-large-uncased-whole-word-masking-finetuned-squad"

class QAResponse(BaseModel):
    answer: str
    score: float
    start: int
    end: int

@app.post("/qa", response_model=QAResponse)
def question_answering(request: QARequest, session=Depends(api_key_or_login_required)):
    model_id = request.model or "bert-large-uncased-whole-word-masking-finetuned-squad"
    try:
        qa = pipeline("question-answering", model=model_id)
        result = qa(question=request.question, context=request.context)
        return {
            "answer": result["answer"],
            "score": result["score"],
            "start": result["start"],
            "end": result["end"]
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Question answering not supported for this model: {str(e)}")

class NERRequest(BaseModel):
    text: str
    model: Optional[str] = "dslim/bert-base-NER"

class NERResponse(BaseModel):
    entities: List[Dict[str, Any]]

@app.post("/ner", response_model=NERResponse)
def named_entity_recognition(request: NERRequest, session=Depends(api_key_or_login_required)):
    model_id = request.model or "dslim/bert-base-NER"
    try:
        ner = pipeline("ner", model=model_id, aggregation_strategy="simple")
        entities = ner(request.text)
        # Convert all numpy types to native Python types
        def convert(obj):
            if isinstance(obj, dict):
                return {k: convert(v) for k, v in obj.items()}
            elif isinstance(obj, list):
                return [convert(i) for i in obj]
            elif isinstance(obj, np.generic):
                return obj.item()
            return obj
        entities = convert(entities)
        return {"entities": entities}
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"NER not supported for this model: {str(e)}")

class FillMaskRequest(BaseModel):
    text: str
    model: Optional[str] = "bert-base-uncased"

class FillMaskResponse(BaseModel):
    results: List[Dict[str, Any]]

@app.post("/fill-mask", response_model=FillMaskResponse)
def fill_mask(request: FillMaskRequest, session=Depends(api_key_or_login_required)):
    model_id = request.model or "bert-base-uncased"
    try:
        fill_masker = pipeline("fill-mask", model=model_id)
        results = fill_masker(request.text)
        return {"results": results}
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Fill-mask not supported for this model: {str(e)}")

class SummarizationRequest(BaseModel):
    text: str
    model: Optional[str] = "facebook/bart-large-cnn"
    max_length: Optional[int] = 50
    min_length: Optional[int] = 25

class SummarizationResponse(BaseModel):
    summary: str

@app.post("/summarize", response_model=SummarizationResponse)
def summarize(request: SummarizationRequest, session=Depends(api_key_or_login_required)):
    model_id = request.model or "facebook/bart-large-cnn"
    try:
        summarizer = pipeline("summarization", model=model_id)
        result = summarizer(request.text, max_length=request.max_length, min_length=request.min_length)
        return {"summary": result[0]["summary_text"]}
    except Exception as e:
        msg = str(e)
        if "AutoModelForSeq2SeqLM" in msg or "Unrecognized configuration class" in msg:
            raise HTTPException(
                status_code=400,
                detail="This model does not support summarization. Please use a model like BART, T5, or Pegasus."
            )
        raise HTTPException(status_code=400, detail=f"Summarization not supported for this model: {msg}")

class FeatureExtractionRequest(BaseModel):
    text: str
    model: Optional[str] = "bert-base-uncased"

class FeatureExtractionResponse(BaseModel):
    features: List[List[float]]

@app.post("/features", response_model=FeatureExtractionResponse)
def feature_extraction(request: FeatureExtractionRequest, session=Depends(api_key_or_login_required)):
    model_id = request.model or "bert-base-uncased"
    try:
        extractor = pipeline("feature-extraction", model=model_id)
        features = extractor(request.text)
        return {"features": features[0]}
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Feature extraction not supported for this model: {str(e)}") 

@app.get("/captcha")
def get_captcha(request: Request):
    text = generate_captcha_text()
    img = generate_captcha_image(text)
    buf = BytesIO()
    img.save(buf, format='PNG')
    buf.seek(0)
    # Set captcha answer in session
    session = get_session(request)
    session['captcha'] = text
    response = StreamingResponse(buf, media_type="image/png")
    set_session(response, session)
    return response

@app.post("/api/login")
async def login(request: Request):
    body = await request.json()
    username = body.get('username')
    password = body.get('password')
    captcha = body.get('captcha')
    session = get_session(request)
    # Check captcha
    if not captcha or captcha.upper() != session.get('captcha', '').upper():
        return JSONResponse({"error": "Invalid captcha"}, status_code=400)
    # Check username/password
    if username != Config.AUTH_USERNAME or password != Config.AUTH_PASSWORD:
        return JSONResponse({"error": "Invalid username or password"}, status_code=400)
    # Success: set session
    session['logged_in'] = True
    session.pop('captcha', None)
    response = JSONResponse({"success": True})
    set_session(response, session)
    return response

@app.post("/logout")
def logout(request: Request):
    response = JSONResponse({"success": True})
    clear_session(response)
    return response 

@app.post("/api-keys")
def create_api_key(request: Request, session=Depends(login_required)):
    login_required(request)
    key = secrets.token_urlsafe(32)
    key_id = mongodb_manager.create_api_key(key)
    return {"id": key_id, "key": key}

@app.get("/api-keys")
def list_api_keys(request: Request, session=Depends(login_required)):
    login_required(request)
    keys = mongodb_manager.list_api_keys()
    # Do not return the actual key string for security, only id and metadata
    for k in keys:
        k.pop('key', None)
    return {"api_keys": keys}

@app.delete("/api-keys/{key_id}")
def delete_api_key(request: Request, key_id: str = Path(...), session=Depends(login_required)):
    login_required(request)
    ok = mongodb_manager.delete_api_key(key_id)
    return {"success": ok} 

@app.get("/auth/check")
def auth_check(request: Request):
    session = get_session(request)
    return {"authenticated": bool(session.get('logged_in'))} 