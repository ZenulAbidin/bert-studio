# Backend Architecture

## Overview

BERT Studio's backend is built with FastAPI and Python, providing a robust, high-performance API for machine learning model operations, custom code execution, and database management.

## Technology Stack

- **FastAPI**: Modern, fast web framework for building APIs
- **Python 3.9+**: Core programming language
- **PyTorch**: Deep learning framework
- **Transformers**: HuggingFace's transformer library
- **MongoDB**: NoSQL database for flexible data storage
- **PyMongo**: MongoDB driver for Python
- **Uvicorn**: ASGI server for production deployment
- **Pydantic**: Data validation using Python type annotations

## Project Structure

```
backend/
├── main.py                 # FastAPI application entry point
├── config.py              # Configuration management
├── mongodb_database.py    # Database connection and operations
├── requirements.txt       # Python dependencies
├── setup_env.py          # Environment setup utilities
├── start_server.py       # Development server launcher
└── test_mongodb_config.py # Database configuration tests
```

## Core Architecture

### FastAPI Application (main.py)

Main application with:
- CORS middleware configuration
- Route registration
- Error handling middleware
- Security middleware
- API documentation generation

```python
from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(
    title="BERT Studio API",
    description="ML Model Playground API",
    version="1.0.0"
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

### Configuration Management (config.py)

Environment-based configuration:
- Database connection strings
- Security settings
- ML model cache paths
- API rate limiting settings

```python
import os
from typing import Optional

class Settings:
    mongodb_connection_string: str = os.getenv(
        "MONGODB_CONNECTION_STRING", 
        "mongodb://localhost:27017"
    )
    mongodb_database_name: str = os.getenv(
        "MONGODB_DATABASE_NAME", 
        "bert_studio"
    )
    secret_key: str = os.getenv("SECRET_KEY", "development-key")
    cors_origins: list = os.getenv(
        "CORS_ORIGINS", 
        "http://localhost:3000"
    ).split(",")

settings = Settings()
```

## Database Layer

### MongoDB Integration (mongodb_database.py)

Database operations with:
- Connection pooling
- Error handling
- Collection management
- Index optimization
- Backup/restore utilities

```python
from pymongo import MongoClient, IndexModel, ASCENDING, TEXT
from typing import List, Dict, Any, Optional

class MongoDatabase:
    def __init__(self, connection_string: str, database_name: str):
        self.client = MongoClient(connection_string)
        self.db = self.client[database_name]
        self.setup_collections()

    def setup_collections(self):
        # Custom tasks collection with indexes
        self.tasks = self.db.custom_tasks
        self.tasks.create_indexes([
            IndexModel([("name", TEXT), ("description", TEXT)]),
            IndexModel([("tags", ASCENDING)]),
            IndexModel([("model_name", ASCENDING)]),
            IndexModel([("created_at", ASCENDING)])
        ])
```

### Collection Schemas

**Custom Tasks Collection**:
```json
{
  "_id": "ObjectId",
  "name": "string",
  "description": "string", 
  "tags": ["string"],
  "model_name": "string",
  "tokenizer_code": "string",
  "model_code": "string", 
  "function_code": "string",
  "created_at": "datetime",
  "updated_at": "datetime",
  "usage_count": "number"
}
```

**API Keys Collection**:
```json
{
  "_id": "ObjectId",
  "api_key": "string",
  "name": "string",
  "created_at": "datetime",
  "last_used": "datetime",
  "is_active": "boolean"
}
```

## API Endpoints

### Authentication Routes

```python
@app.post("/auth/login")
async def login(api_key: str = Form(...)):
    # Validate API key against database
    # Create session
    # Return success response

@app.post("/auth/logout") 
async def logout(session_id: str = Depends(get_current_session)):
    # Invalidate session
    # Clear cookies
```

### Model Management Routes

```python
@app.get("/models")
async def list_models():
    # Return available models from HuggingFace Hub
    
@app.post("/models/download")
async def download_model(model_request: ModelDownloadRequest):
    # Download model from HuggingFace Hub
    # Cache locally
    # Return download status

@app.get("/models/{model_name}/info")
async def get_model_info(model_name: str):
    # Retrieve model metadata
    # Return model configuration
```

### Task Execution Routes

```python
@app.post("/tasks/classification")
async def classify_text(request: ClassificationRequest):
    # Load model and tokenizer
    # Process input text
    # Return classification results

@app.post("/tasks/custom")
async def execute_custom_task(request: CustomTaskRequest):
    # Validate custom code
    # Execute in sandboxed environment
    # Return results
```

## ML Model Management

### Model Loading and Caching

```python
from transformers import AutoModel, AutoTokenizer
import torch
from functools import lru_cache

class ModelManager:
    def __init__(self):
        self.model_cache = {}
        self.tokenizer_cache = {}
    
    @lru_cache(maxsize=10)
    def get_model(self, model_name: str, task_type: str):
        cache_key = f"{model_name}_{task_type}"
        
        if cache_key not in self.model_cache:
            model = self._load_model(model_name, task_type)
            self.model_cache[cache_key] = model
            
        return self.model_cache[cache_key]
    
    def _load_model(self, model_name: str, task_type: str):
        if task_type == "classification":
            return AutoModelForSequenceClassification.from_pretrained(model_name)
        elif task_type == "qa":
            return AutoModelForQuestionAnswering.from_pretrained(model_name)
        # ... other task types
```

### GPU/CPU Management

```python
import torch

class DeviceManager:
    def __init__(self):
        self.device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
        self.gpu_memory_threshold = 0.8
    
    def check_gpu_memory(self):
        if torch.cuda.is_available():
            memory_used = torch.cuda.memory_allocated() / torch.cuda.max_memory_allocated()
            return memory_used < self.gpu_memory_threshold
        return False
    
    def move_to_device(self, model):
        if self.check_gpu_memory():
            return model.to(self.device)
        return model.to("cpu")
```

## Custom Code Execution

### Security Sandbox

```python
import ast
import sys
from typing import Dict, Any

class CodeValidator:
    ALLOWED_IMPORTS = {"torch", "transformers", "numpy"}
    FORBIDDEN_FUNCTIONS = {"eval", "exec", "open", "import", "__import__"}
    
    def validate_code(self, code: str) -> bool:
        try:
            tree = ast.parse(code)
            validator = SecurityVisitor()
            validator.visit(tree)
            return validator.is_safe
        except SyntaxError:
            return False

class SecurityVisitor(ast.NodeVisitor):
    def __init__(self):
        self.is_safe = True
        
    def visit_Import(self, node):
        for alias in node.names:
            if alias.name not in CodeValidator.ALLOWED_IMPORTS:
                self.is_safe = False
                
    def visit_Call(self, node):
        if isinstance(node.func, ast.Name):
            if node.func.id in CodeValidator.FORBIDDEN_FUNCTIONS:
                self.is_safe = False
        self.generic_visit(node)
```

### Execution Environment

```python
import subprocess
import tempfile
import os
from contextlib import contextmanager

class CodeExecutor:
    def __init__(self):
        self.timeout = 30  # seconds
        self.memory_limit = "1G"
    
    @contextmanager
    def temporary_environment(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            old_cwd = os.getcwd()
            try:
                os.chdir(temp_dir)
                yield temp_dir
            finally:
                os.chdir(old_cwd)
    
    def execute_custom_code(self, code: str, input_text: str) -> Dict[str, Any]:
        with self.temporary_environment() as temp_dir:
            # Write code to temporary file
            # Execute with resource limits
            # Capture output and errors
            # Return structured results
```

## Error Handling

### Custom Exception Classes

```python
class BERTStudioException(Exception):
    def __init__(self, message: str, status_code: int = 500):
        self.message = message
        self.status_code = status_code
        super().__init__(self.message)

class ModelNotFoundException(BERTStudioException):
    def __init__(self, model_name: str):
        message = f"Model '{model_name}' not found"
        super().__init__(message, 404)

class InvalidCodeException(BERTStudioException):
    def __init__(self, details: str):
        message = f"Invalid code: {details}"
        super().__init__(message, 400)
```

### Global Error Handler

```python
@app.exception_handler(BERTStudioException)
async def bert_studio_exception_handler(request: Request, exc: BERTStudioException):
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "success": False,
            "error": exc.message,
            "status_code": exc.status_code
        }
    )
```

## Performance Optimization

### Caching Strategy

- **Model Caching**: LRU cache for frequently used models
- **Result Caching**: Redis for API response caching
- **Database Indexing**: Optimized MongoDB indexes

### Async Operations

```python
import asyncio
from concurrent.futures import ThreadPoolExecutor

class AsyncModelOperations:
    def __init__(self):
        self.executor = ThreadPoolExecutor(max_workers=4)
    
    async def async_model_inference(self, model, inputs):
        loop = asyncio.get_event_loop()
        return await loop.run_in_executor(
            self.executor, 
            self._run_inference, 
            model, 
            inputs
        )
    
    def _run_inference(self, model, inputs):
        with torch.no_grad():
            return model(**inputs)
```

## Security Features

### Input Validation

```python
from pydantic import BaseModel, validator
import re

class TextInput(BaseModel):
    text: str
    model_name: str
    
    @validator('text')
    def validate_text_length(cls, v):
        if len(v) > 10000:
            raise ValueError('Text too long (max 10,000 characters)')
        return v
    
    @validator('model_name')
    def validate_model_name(cls, v):
        if not re.match(r'^[a-zA-Z0-9\-\_\/]+$', v):
            raise ValueError('Invalid model name format')
        return v
```

### Rate Limiting

```python
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address

limiter = Limiter(key_func=get_remote_address)

@app.post("/tasks/classification")
@limiter.limit("10/minute")
async def classify_text(request: Request, data: ClassificationRequest):
    # Rate limited endpoint
```

## Monitoring and Logging

### Structured Logging

```python
import logging
import json
from datetime import datetime

class StructuredLogger:
    def __init__(self):
        self.logger = logging.getLogger("bert_studio")
        
    def log_request(self, endpoint: str, user_id: str, execution_time: float):
        log_data = {
            "timestamp": datetime.utcnow().isoformat(),
            "endpoint": endpoint,
            "user_id": user_id,
            "execution_time": execution_time,
            "type": "api_request"
        }
        self.logger.info(json.dumps(log_data))
```

### Health Checks

```python
@app.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "timestamp": datetime.utcnow().isoformat(),
        "version": "1.0.0"
    }

@app.get("/health/db")
async def database_health():
    try:
        # Test database connection
        db.command("ping")
        return {"database": "healthy"}
    except Exception as e:
        raise HTTPException(status_code=503, detail="Database unavailable")
```

## Deployment Configuration

### Docker Setup

```python
# Dockerfile considerations:
# - Multi-stage build for optimization
# - Non-root user for security
# - Health check endpoints
# - Environment variable configuration
# - GPU support when available
```

### Production Settings

```python
class ProductionSettings(Settings):
    debug: bool = False
    workers: int = 4
    max_requests: int = 1000
    max_requests_jitter: int = 100
    preload_app: bool = True
```