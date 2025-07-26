# Database Schema

## Overview

BERT Studio uses MongoDB as its primary database for storing custom tasks, user sessions, API keys, and application metadata. MongoDB's flexible document structure accommodates the varying requirements of ML tasks and user-generated content.

## Database Design Principles

- **Document-oriented**: Each entity is stored as a self-contained document
- **Flexible schema**: Accommodates different task types and configurations
- **Indexing strategy**: Optimized for common query patterns
- **Scalability**: Designed for horizontal scaling with sharding support

## Collections

### 1. custom_tasks

Stores user-created custom ML tasks with code and metadata.

```javascript
{
  "_id": ObjectId("..."),
  "name": "Sentiment Analysis with Custom Logic",
  "description": "Custom sentiment analysis using distilbert with additional preprocessing",
  "tags": ["sentiment", "nlp", "classification"],
  "model_name": "distilbert-base-uncased",
  "tokenizer_code": "tokenizer = AutoTokenizer.from_pretrained('distilbert-base-uncased')",
  "model_code": "model = AutoModelForSequenceClassification.from_pretrained('distilbert-base-uncased')",
  "function_code": "def custom_function(text):\n    inputs = tokenizer(text, return_tensors='pt')\n    outputs = model(**inputs)\n    return {'prediction': outputs.logits.softmax(dim=1).tolist()}",
  "created_at": ISODate("2024-01-15T10:30:00Z"),
  "updated_at": ISODate("2024-01-15T10:30:00Z"),
  "created_by": "user_session_id",
  "usage_count": 25,
  "is_public": false,
  "execution_stats": {
    "avg_execution_time": 0.125,
    "success_rate": 0.96,
    "total_executions": 25
  },
  "model_config": {
    "max_length": 512,
    "padding": true,
    "truncation": true
  }
}
```

**Indexes:**
```javascript
// Text search index for name and description
db.custom_tasks.createIndex({ 
  "name": "text", 
  "description": "text" 
})

// Compound index for filtering by tags and model
db.custom_tasks.createIndex({ 
  "tags": 1, 
  "model_name": 1 
})

// Index for sorting by creation date and usage
db.custom_tasks.createIndex({ 
  "created_at": -1 
})
db.custom_tasks.createIndex({ 
  "usage_count": -1 
})

// Index for user-specific queries
db.custom_tasks.createIndex({ 
  "created_by": 1, 
  "created_at": -1 
})
```

### 2. api_keys

Manages API keys for authentication and access control.

```javascript
{
  "_id": ObjectId("..."),
  "api_key": "ak_1234567890abcdef",
  "name": "Development Key",
  "description": "Key for local development and testing",
  "created_at": ISODate("2024-01-10T08:00:00Z"),
  "last_used": ISODate("2024-01-15T14:22:30Z"),
  "is_active": true,
  "permissions": [
    "tasks:execute",
    "tasks:save",
    "models:download",
    "admin:read"
  ],
  "rate_limits": {
    "requests_per_minute": 100,
    "requests_per_hour": 1000,
    "custom_tasks_per_hour": 50
  },
  "usage_stats": {
    "total_requests": 1205,
    "requests_today": 45,
    "last_request_ip": "192.168.1.100"
  }
}
```

**Indexes:**
```javascript
// Unique index on api_key for fast lookups
db.api_keys.createIndex({ 
  "api_key": 1 
}, { unique: true })

// Index for active keys
db.api_keys.createIndex({ 
  "is_active": 1, 
  "last_used": -1 
})
```

### 3. user_sessions

Tracks active user sessions for authentication state management.

```javascript
{
  "_id": ObjectId("..."),
  "session_id": "sess_1234567890abcdef",
  "api_key_id": ObjectId("..."),
  "created_at": ISODate("2024-01-15T09:00:00Z"),
  "last_activity": ISODate("2024-01-15T14:30:00Z"),
  "expires_at": ISODate("2024-01-15T18:00:00Z"),
  "ip_address": "192.168.1.100",
  "user_agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36",
  "is_active": true,
  "activity_log": [
    {
      "action": "login",
      "timestamp": ISODate("2024-01-15T09:00:00Z"),
      "endpoint": "/auth/login"
    },
    {
      "action": "task_execution",
      "timestamp": ISODate("2024-01-15T14:30:00Z"),
      "endpoint": "/tasks/classification",
      "task_id": ObjectId("...")
    }
  ]
}
```

**Indexes:**
```javascript
// Unique index on session_id
db.user_sessions.createIndex({ 
  "session_id": 1 
}, { unique: true })

// Index for session cleanup
db.user_sessions.createIndex({ 
  "expires_at": 1 
})

// Index for active sessions
db.user_sessions.createIndex({ 
  "is_active": 1, 
  "last_activity": -1 
})
```

### 4. model_cache

Tracks downloaded and cached models for efficient storage management.

```javascript
{
  "_id": ObjectId("..."),
  "model_name": "distilbert-base-uncased",
  "model_type": "transformers",
  "task_type": "classification",
  "download_url": "https://huggingface.co/distilbert-base-uncased",
  "local_path": "/app/models/distilbert-base-uncased",
  "file_size": 267884032,
  "download_date": ISODate("2024-01-10T12:00:00Z"),
  "last_accessed": ISODate("2024-01-15T14:20:00Z"),
  "access_count": 156,
  "model_config": {
    "vocab_size": 30522,
    "hidden_size": 768,
    "num_attention_heads": 12,
    "max_position_embeddings": 512
  },
  "checksum": "sha256:abc123...",
  "is_cached": true,
  "cache_priority": "high"
}
```

**Indexes:**
```javascript
// Unique index on model_name and task_type
db.model_cache.createIndex({ 
  "model_name": 1, 
  "task_type": 1 
}, { unique: true })

// Index for cache management
db.model_cache.createIndex({ 
  "last_accessed": 1 
})
db.model_cache.createIndex({ 
  "access_count": -1 
})
```

### 5. execution_logs

Logs task executions for monitoring and analytics.

```javascript
{
  "_id": ObjectId("..."),
  "session_id": "sess_1234567890abcdef",
  "task_type": "classification",
  "task_id": ObjectId("..."), // null for built-in tasks
  "model_name": "distilbert-base-uncased",
  "input_text": "This is a great product!",
  "execution_time": 0.125,
  "memory_usage": 512,
  "gpu_usage": 0.0,
  "status": "success",
  "error_message": null,
  "result_size": 1024,
  "timestamp": ISODate("2024-01-15T14:30:00Z"),
  "ip_address": "192.168.1.100",
  "user_agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36"
}
```

**Indexes:**
```javascript
// Index for time-based queries and cleanup
db.execution_logs.createIndex({ 
  "timestamp": -1 
})

// Index for session-based analytics
db.execution_logs.createIndex({ 
  "session_id": 1, 
  "timestamp": -1 
})

// Index for task performance analytics
db.execution_logs.createIndex({ 
  "task_type": 1, 
  "model_name": 1, 
  "timestamp": -1 
})
```

### 6. system_settings

Stores application-wide configuration and metadata.

```javascript
{
  "_id": ObjectId("..."),
  "setting_key": "max_custom_tasks_per_user",
  "setting_value": 50,
  "setting_type": "integer",
  "description": "Maximum number of custom tasks a user can create",
  "created_at": ISODate("2024-01-01T00:00:00Z"),
  "updated_at": ISODate("2024-01-15T10:00:00Z"),
  "updated_by": "admin"
}
```

**Indexes:**
```javascript
// Unique index on setting_key
db.system_settings.createIndex({ 
  "setting_key": 1 
}, { unique: true })
```

## Data Relationships

### Task-Session Relationship
- Custom tasks are linked to user sessions via `created_by` field
- Execution logs reference both tasks and sessions
- Sessions are tied to API keys for authentication

### Model-Task Relationship
- Custom tasks reference models by name
- Model cache tracks which models are available locally
- Execution logs track which models were used

## Query Patterns

### Common Queries

1. **Find user's custom tasks:**
```javascript
db.custom_tasks.find({
  "created_by": "user_session_id"
}).sort({ "created_at": -1 })
```

2. **Search tasks by text:**
```javascript
db.custom_tasks.find({
  $text: { $search: "sentiment analysis" }
}).sort({ score: { $meta: "textScore" } })
```

3. **Filter tasks by tags and model:**
```javascript
db.custom_tasks.find({
  "tags": { $in: ["nlp", "classification"] },
  "model_name": "distilbert-base-uncased"
})
```

4. **Get popular tasks:**
```javascript
db.custom_tasks.find({
  "is_public": true
}).sort({ "usage_count": -1 }).limit(10)
```

5. **Session analytics:**
```javascript
db.execution_logs.aggregate([
  { $match: { 
    "timestamp": { 
      $gte: ISODate("2024-01-15T00:00:00Z") 
    } 
  }},
  { $group: { 
    "_id": "$task_type",
    "count": { $sum: 1 },
    "avg_execution_time": { $avg: "$execution_time" }
  }}
])
```

## Data Validation

### MongoDB Schema Validation

```javascript
// Custom tasks validation
db.createCollection("custom_tasks", {
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: ["name", "model_name", "function_code", "created_at"],
      properties: {
        name: {
          bsonType: "string",
          minLength: 1,
          maxLength: 100
        },
        description: {
          bsonType: "string",
          maxLength: 500
        },
        tags: {
          bsonType: "array",
          items: { bsonType: "string" },
          maxItems: 10
        },
        model_name: {
          bsonType: "string",
          pattern: "^[a-zA-Z0-9\\-_/]+$"
        }
      }
    }
  }
})
```

## Performance Considerations

### Index Strategy
- Compound indexes for common filter combinations
- Text indexes for search functionality
- TTL indexes for automatic cleanup of old data

### Sharding Strategy
For large deployments:
- Shard custom_tasks by user/session hash
- Shard execution_logs by timestamp
- Keep small collections unsharded

### Aggregation Optimization
- Use indexes to support aggregation pipeline stages
- Limit result sets early in pipelines
- Use `$project` to reduce document size

## Backup and Recovery

### Backup Strategy
- Daily full backups of all collections
- Point-in-time recovery capability
- Separate backups for critical collections (api_keys, custom_tasks)

### Data Retention
- Execution logs: 90 days
- User sessions: 30 days after expiration
- Custom tasks: Indefinite (user-controlled deletion)
- Model cache: Based on usage patterns and storage limits

## Security Considerations

### Data Encryption
- Encryption at rest for sensitive collections
- Field-level encryption for API keys
- Network encryption (TLS) for data in transit

### Access Control
- Role-based access control (RBAC)
- Application-level authentication
- Network-level restrictions for database access

### Data Privacy
- No storage of sensitive user data in logs
- Anonymization of execution logs for analytics
- GDPR compliance for user data deletion