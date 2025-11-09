# API Reference

## Overview

BERT Studio provides a RESTful API built with FastAPI for all backend operations. The API handles model management, task execution, custom code processing, and MongoDB operations.

## Base URL

- Development: `http://localhost:8000`
- Production: `https://your-domain.com/api`

## Authentication

Most endpoints require API key authentication via session management.

### Login
```http
POST /auth/login
Content-Type: application/json

{
  "api_key": "your-api-key"
}
```

### Logout
```http
POST /auth/logout
```

## Model Management

### List Available Models
```http
GET /models
```

### Download Model
```http
POST /models/download
Content-Type: application/json

{
  "model_name": "distilbert-base-uncased",
  "task_type": "classification"
}
```

### Get Model Info
```http
GET /models/{model_name}/info
```

## Task Execution

### Text Classification
```http
POST /tasks/classification
Content-Type: application/json

{
  "text": "This is a great product!",
  "model_name": "distilbert-base-uncased"
}
```

### Question Answering
```http
POST /tasks/qa
Content-Type: application/json

{
  "question": "What is BERT?",
  "context": "BERT is a transformer model...",
  "model_name": "bert-large-uncased-whole-word-masking-finetuned-squad"
}
```

### Named Entity Recognition
```http
POST /tasks/ner
Content-Type: application/json

{
  "text": "John works at Google in California",
  "model_name": "dbmdz/bert-large-cased-finetuned-conll03-english"
}
```

### Text Summarization
```http
POST /tasks/summarization
Content-Type: application/json

{
  "text": "Long text to summarize...",
  "model_name": "facebook/bart-large-cnn",
  "max_length": 150,
  "min_length": 50
}
```

### Generate Embeddings
```http
POST /tasks/embeddings
Content-Type: application/json

{
  "text": "Text to embed",
  "model_name": "sentence-transformers/all-MiniLM-L6-v2"
}
```

## Custom Tasks

### Execute Custom Code
```http
POST /tasks/custom
Content-Type: application/json

{
  "tokenizer_code": "tokenizer = AutoTokenizer.from_pretrained('model-name')",
  "model_code": "model = AutoModel.from_pretrained('model-name')",
  "function_code": "def custom_function(text): return {'result': 'processed'}",
  "input_text": "Input text here"
}
```

### Save Custom Task
```http
POST /custom-tasks
Content-Type: application/json

{
  "name": "My Custom Task",
  "description": "Description of the task",
  "tags": ["nlp", "classification"],
  "tokenizer_code": "...",
  "model_code": "...",
  "function_code": "...",
  "model_name": "distilbert-base-uncased"
}
```

### List Custom Tasks
```http
GET /custom-tasks?search=query&tags=nlp,classification&model=distilbert-base-uncased
```

### Get Custom Task
```http
GET /custom-tasks/{task_id}
```

### Update Custom Task
```http
PUT /custom-tasks/{task_id}
Content-Type: application/json

{
  "name": "Updated Task Name",
  "description": "Updated description",
  "tags": ["updated", "tags"]
}
```

### Delete Custom Task
```http
DELETE /custom-tasks/{task_id}
```

## Task Management

### Export Tasks
```http
POST /custom-tasks/export
Content-Type: application/json

{
  "task_ids": ["task1_id", "task2_id"]
}
```

### Import Tasks
```http
POST /custom-tasks/import
Content-Type: multipart/form-data

file: tasks.json
```

### Get Statistics
```http
GET /custom-tasks/stats
```

## Health Check

### API Health
```http
GET /health
```

### Database Health
```http
GET /health/db
```

## Error Responses

All error responses follow this format:

```json
{
  "error": "Error message",
  "detail": "Detailed error information",
  "status_code": 400
}
```

## Rate Limiting

- 100 requests per minute per IP
- 1000 requests per hour per authenticated user
- Custom tasks limited to 10 concurrent executions

## Response Formats

### Successful Response
```json
{
  "success": true,
  "data": { ... },
  "message": "Operation completed successfully"
}
```

### Error Response
```json
{
  "success": false,
  "error": "Error description",
  "status_code": 400
}
```

## WebSocket Endpoints

### Real-time Task Updates
```
ws://localhost:8000/ws/tasks/{task_id}
```

### Model Download Progress
```
ws://localhost:8000/ws/download/{download_id}
```