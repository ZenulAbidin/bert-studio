# Security Guidelines

## Overview

BERT Studio implements multiple layers of security to protect user data, prevent malicious code execution, and ensure safe operation in production environments. This document outlines security measures, best practices, and recommendations.

## Security Architecture

### Defense in Depth Strategy

1. **Application Layer**: Input validation, code sandboxing, authentication
2. **Infrastructure Layer**: Network security, container isolation, access controls
3. **Data Layer**: Encryption, access controls, audit logging
4. **Transport Layer**: TLS encryption, certificate management

## Authentication & Authorization

### API Key Management

**Implementation**:
```python
class APIKeyManager:
    def __init__(self):
        self.secret_key = os.getenv("SECRET_KEY")
        
    def generate_api_key(self) -> str:
        """Generate cryptographically secure API key"""
        prefix = "ak_"
        random_bytes = secrets.token_urlsafe(32)
        return f"{prefix}{random_bytes}"
    
    def hash_api_key(self, api_key: str) -> str:
        """Hash API key for storage"""
        return bcrypt.hashpw(api_key.encode(), bcrypt.gensalt()).decode()
    
    def verify_api_key(self, api_key: str, hashed: str) -> bool:
        """Verify API key against hash"""
        return bcrypt.checkpw(api_key.encode(), hashed.encode())
```

**Best Practices**:
- API keys are hashed before storage using bcrypt
- Keys include entropy-rich random components
- Implement key rotation policies
- Monitor for unusual API key usage patterns

### Session Management

**Secure Session Configuration**:
```python
from itsdangerous import URLSafeTimedSerializer

class SessionManager:
    def __init__(self, secret_key: str, max_age: int = 28800):  # 8 hours
        self.serializer = URLSafeTimedSerializer(secret_key)
        self.max_age = max_age
    
    def create_session(self, api_key_id: str) -> str:
        """Create secure session token"""
        session_data = {
            "api_key_id": api_key_id,
            "created_at": datetime.utcnow().isoformat(),
            "nonce": secrets.token_hex(16)
        }
        return self.serializer.dumps(session_data)
    
    def validate_session(self, session_token: str) -> Optional[dict]:
        """Validate and decode session token"""
        try:
            return self.serializer.loads(session_token, max_age=self.max_age)
        except (BadSignature, SignatureExpired):
            return None
```

### Role-Based Access Control (RBAC)

**Permission System**:
```python
class Permissions:
    TASKS_EXECUTE = "tasks:execute"
    TASKS_SAVE = "tasks:save"
    TASKS_DELETE = "tasks:delete"
    MODELS_DOWNLOAD = "models:download"
    ADMIN_READ = "admin:read"
    ADMIN_WRITE = "admin:write"

class RoleManager:
    ROLES = {
        "user": [
            Permissions.TASKS_EXECUTE,
            Permissions.TASKS_SAVE,
        ],
        "premium": [
            Permissions.TASKS_EXECUTE,
            Permissions.TASKS_SAVE,
            Permissions.TASKS_DELETE,
            Permissions.MODELS_DOWNLOAD,
        ],
        "admin": [
            "*"  # All permissions
        ]
    }
```

## Code Execution Security

### Custom Code Sandboxing

**Security Restrictions**:
```python
import ast
import sys
from typing import Set, List

class CodeSecurityValidator:
    """Validates user-submitted code for security threats"""
    
    ALLOWED_IMPORTS = {
        "torch", "transformers", "numpy", "re", "math", "json",
        "datetime", "collections", "itertools", "functools"
    }
    
    FORBIDDEN_MODULES = {
        "os", "sys", "subprocess", "importlib", "eval", "exec",
        "open", "file", "input", "raw_input", "__import__",
        "compile", "globals", "locals", "vars", "dir"
    }
    
    FORBIDDEN_ATTRIBUTES = {
        "__class__", "__bases__", "__subclasses__", "__mro__",
        "__globals__", "__code__", "__closure__", "__defaults__"
    }
    
    def validate_code(self, code: str) -> tuple[bool, List[str]]:
        """Validate code and return (is_safe, errors)"""
        errors = []
        
        try:
            tree = ast.parse(code)
            visitor = SecurityASTVisitor(self)
            visitor.visit(tree)
            errors.extend(visitor.errors)
        except SyntaxError as e:
            errors.append(f"Syntax error: {e}")
        
        return len(errors) == 0, errors

class SecurityASTVisitor(ast.NodeVisitor):
    """AST visitor to check for security violations"""
    
    def __init__(self, validator: CodeSecurityValidator):
        self.validator = validator
        self.errors = []
    
    def visit_Import(self, node):
        """Check import statements"""
        for alias in node.names:
            if alias.name not in self.validator.ALLOWED_IMPORTS:
                self.errors.append(f"Forbidden import: {alias.name}")
        self.generic_visit(node)
    
    def visit_ImportFrom(self, node):
        """Check from...import statements"""
        if node.module not in self.validator.ALLOWED_IMPORTS:
            self.errors.append(f"Forbidden module: {node.module}")
        self.generic_visit(node)
    
    def visit_Call(self, node):
        """Check function calls"""
        if isinstance(node.func, ast.Name):
            if node.func.id in self.validator.FORBIDDEN_MODULES:
                self.errors.append(f"Forbidden function: {node.func.id}")
        self.generic_visit(node)
    
    def visit_Attribute(self, node):
        """Check attribute access"""
        if node.attr in self.validator.FORBIDDEN_ATTRIBUTES:
            self.errors.append(f"Forbidden attribute: {node.attr}")
        self.generic_visit(node)
```

### Execution Environment Isolation

**Resource Limits**:
```python
import signal
import resource
from contextlib import contextmanager

class ExecutionSandbox:
    """Isolated execution environment with resource limits"""
    
    def __init__(self):
        self.memory_limit = 2 * 1024 * 1024 * 1024  # 2GB
        self.time_limit = 30  # 30 seconds
        self.file_size_limit = 100 * 1024 * 1024    # 100MB
    
    @contextmanager
    def limited_execution(self):
        """Context manager for resource-limited execution"""
        # Set memory limit
        resource.setrlimit(resource.RLIMIT_AS, (self.memory_limit, self.memory_limit))
        
        # Set file size limit
        resource.setrlimit(resource.RLIMIT_FSIZE, (self.file_size_limit, self.file_size_limit))
        
        # Set time limit
        def timeout_handler(signum, frame):
            raise TimeoutError("Execution time limit exceeded")
        
        old_handler = signal.signal(signal.SIGALRM, timeout_handler)
        signal.alarm(self.time_limit)
        
        try:
            yield
        finally:
            signal.alarm(0)
            signal.signal(signal.SIGALRM, old_handler)
```

**Docker Container Isolation**:
```dockerfile
# Use minimal base image
FROM python:3.9-slim

# Create non-root user
RUN groupadd -r sandboxuser && useradd -r -g sandboxuser sandboxuser

# Set security options
USER sandboxuser
WORKDIR /app

# Limit container capabilities
# In docker-compose.yml:
# cap_drop:
#   - ALL
# cap_add:
#   - NET_BIND_SERVICE
# security_opt:
#   - no-new-privileges:true
# read_only: true
```

## Input Validation & Sanitization

### Request Validation

**Pydantic Models with Security**:
```python
from pydantic import BaseModel, validator, Field
import re
from typing import List, Optional

class SecureTextInput(BaseModel):
    text: str = Field(..., min_length=1, max_length=50000)
    model_name: str = Field(..., regex=r'^[a-zA-Z0-9\-_/]+$')
    
    @validator('text')
    def validate_text_content(cls, v):
        # Remove potential script tags
        if re.search(r'<script.*?</script>', v, re.IGNORECASE | re.DOTALL):
            raise ValueError("HTML script tags not allowed")
        
        # Check for potential code injection
        dangerous_patterns = [
            r'__import__', r'eval\s*\(', r'exec\s*\(',
            r'subprocess', r'os\.system', r'open\s*\('
        ]
        
        for pattern in dangerous_patterns:
            if re.search(pattern, v):
                raise ValueError(f"Potentially dangerous content detected")
        
        return v
    
    @validator('model_name')
    def validate_model_name(cls, v):
        # Ensure model name follows expected format
        if not re.match(r'^[a-zA-Z0-9\-_/]+$', v):
            raise ValueError("Invalid model name format")
        
        # Prevent directory traversal
        if '..' in v or v.startswith('/'):
            raise ValueError("Invalid model name")
        
        return v

class CustomTaskInput(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    description: Optional[str] = Field(None, max_length=1000)
    tags: List[str] = Field(default=[], max_items=10)
    tokenizer_code: str = Field(..., max_length=10000)
    model_code: str = Field(..., max_length=10000)
    function_code: str = Field(..., max_length=20000)
    
    @validator('tags')
    def validate_tags(cls, v):
        for tag in v:
            if not re.match(r'^[a-zA-Z0-9\-_]+$', tag):
                raise ValueError(f"Invalid tag format: {tag}")
        return v
```

### SQL/NoSQL Injection Prevention

**MongoDB Query Sanitization**:
```python
from bson import ObjectId
from pymongo.errors import InvalidId

class DatabaseSecurity:
    """Secure database operations"""
    
    @staticmethod
    def sanitize_mongodb_query(query: dict) -> dict:
        """Sanitize MongoDB query to prevent injection"""
        safe_query = {}
        
        for key, value in query.items():
            # Validate field names
            if not re.match(r'^[a-zA-Z_][a-zA-Z0-9_]*$', key):
                continue
            
            # Handle ObjectId fields
            if key.endswith('_id') and isinstance(value, str):
                try:
                    safe_query[key] = ObjectId(value)
                except InvalidId:
                    continue
            elif isinstance(value, (str, int, float, bool)):
                safe_query[key] = value
            elif isinstance(value, dict):
                # Recursively sanitize nested objects
                safe_query[key] = DatabaseSecurity.sanitize_mongodb_query(value)
        
        return safe_query
```

## Network Security

### TLS/SSL Configuration

**Nginx Security Headers**:
```nginx
server {
    listen 443 ssl http2;
    
    # SSL Configuration
    ssl_certificate /path/to/certificate.crt;
    ssl_certificate_key /path/to/private.key;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256;
    ssl_prefer_server_ciphers off;
    
    # Security Headers
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains; preload";
    add_header X-Frame-Options DENY;
    add_header X-Content-Type-Options nosniff;
    add_header X-XSS-Protection "1; mode=block";
    add_header Referrer-Policy "strict-origin-when-cross-origin";
    add_header Content-Security-Policy "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline';";
    
    # Rate Limiting
    limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;
    limit_req zone=api burst=20 nodelay;
}
```

### CORS Security

**Secure CORS Configuration**:
```python
from fastapi.middleware.cors import CORSMiddleware

# Production CORS settings
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://your-domain.com",
        "https://app.your-domain.com"
    ],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE"],
    allow_headers=["Authorization", "Content-Type"],
    expose_headers=["X-Total-Count"],
    max_age=3600,
)
```

## Data Protection

### Encryption at Rest

**Database Encryption**:
```python
from cryptography.fernet import Fernet
import base64

class DataEncryption:
    """Handle sensitive data encryption"""
    
    def __init__(self, encryption_key: str):
        self.fernet = Fernet(encryption_key.encode())
    
    def encrypt_field(self, data: str) -> str:
        """Encrypt sensitive field"""
        return base64.b64encode(
            self.fernet.encrypt(data.encode())
        ).decode()
    
    def decrypt_field(self, encrypted_data: str) -> str:
        """Decrypt sensitive field"""
        return self.fernet.decrypt(
            base64.b64decode(encrypted_data.encode())
        ).decode()

# Example usage for API keys
class SecureAPIKey(BaseModel):
    api_key_hash: str
    encrypted_metadata: Optional[str] = None
    
    def set_metadata(self, metadata: dict, encryptor: DataEncryption):
        self.encrypted_metadata = encryptor.encrypt_field(json.dumps(metadata))
    
    def get_metadata(self, encryptor: DataEncryption) -> dict:
        if self.encrypted_metadata:
            return json.loads(encryptor.decrypt_field(self.encrypted_metadata))
        return {}
```

### Data Anonymization

**Log Sanitization**:
```python
import re
from typing import Dict, Any

class LogSanitizer:
    """Sanitize logs to remove sensitive information"""
    
    PATTERNS = [
        (r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b', '[EMAIL]'),
        (r'\b\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}\b', '[CARD]'),
        (r'\b(?:ak_|sk_)[A-Za-z0-9+/]{32,}\b', '[API_KEY]'),
        (r'\b[A-Za-z0-9+/]{40,}={0,2}\b', '[TOKEN]'),
    ]
    
    @classmethod
    def sanitize_text(cls, text: str) -> str:
        """Remove sensitive information from text"""
        for pattern, replacement in cls.PATTERNS:
            text = re.sub(pattern, replacement, text)
        return text
    
    @classmethod
    def sanitize_log_data(cls, data: Dict[str, Any]) -> Dict[str, Any]:
        """Recursively sanitize log data"""
        sanitized = {}
        for key, value in data.items():
            if isinstance(value, str):
                sanitized[key] = cls.sanitize_text(value)
            elif isinstance(value, dict):
                sanitized[key] = cls.sanitize_log_data(value)
            else:
                sanitized[key] = value
        return sanitized
```

## Rate Limiting & DDoS Protection

### Application-Level Rate Limiting

**Advanced Rate Limiter**:
```python
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
import redis
from typing import Optional

class AdvancedRateLimiter:
    """Advanced rate limiting with multiple strategies"""
    
    def __init__(self, redis_client: redis.Redis):
        self.redis = redis_client
        
    def check_rate_limit(self, 
                        key: str, 
                        limit: int, 
                        window: int,
                        burst_limit: Optional[int] = None) -> bool:
        """
        Check rate limit with sliding window
        Args:
            key: Identifier (IP, user_id, etc.)
            limit: Requests per window
            window: Time window in seconds
            burst_limit: Allow burst up to this limit
        """
        now = time.time()
        pipe = self.redis.pipeline()
        
        # Clean old entries
        pipe.zremrangebyscore(key, 0, now - window)
        
        # Count current requests
        pipe.zcard(key)
        
        # Add current request
        pipe.zadd(key, {str(now): now})
        
        # Set expiry
        pipe.expire(key, window)
        
        results = pipe.execute()
        current_count = results[1]
        
        # Check limits
        if burst_limit and current_count <= burst_limit:
            return True
        
        return current_count <= limit

# FastAPI integration
limiter = Limiter(key_func=get_remote_address)

@app.post("/tasks/custom")
@limiter.limit("5/minute")  # Strict limit for custom code
async def execute_custom_task(request: Request, task: CustomTaskInput):
    # Implementation
    pass

@app.post("/tasks/classification")
@limiter.limit("30/minute")  # More lenient for built-in tasks
async def classify_text(request: Request, data: ClassificationRequest):
    # Implementation
    pass
```

## Security Monitoring & Logging

### Security Event Logging

**Structured Security Logger**:
```python
import json
import logging
from datetime import datetime
from typing import Dict, Any, Optional

class SecurityLogger:
    """Centralized security event logging"""
    
    def __init__(self):
        self.logger = logging.getLogger("security")
        handler = logging.StreamHandler()
        formatter = logging.Formatter(
            '%(asctime)s - %(name)s - %(levelname)s - %(message)s'
        )
        handler.setFormatter(formatter)
        self.logger.addHandler(handler)
        self.logger.setLevel(logging.INFO)
    
    def log_auth_event(self, 
                      event_type: str, 
                      user_id: Optional[str], 
                      ip_address: str,
                      success: bool,
                      details: Optional[Dict[str, Any]] = None):
        """Log authentication events"""
        event = {
            "timestamp": datetime.utcnow().isoformat(),
            "event_type": f"auth_{event_type}",
            "user_id": user_id,
            "ip_address": ip_address,
            "success": success,
            "details": details or {}
        }
        
        level = logging.INFO if success else logging.WARNING
        self.logger.log(level, json.dumps(event))
    
    def log_code_execution(self,
                          user_id: str,
                          code_hash: str,
                          execution_time: float,
                          success: bool,
                          error: Optional[str] = None):
        """Log custom code execution attempts"""
        event = {
            "timestamp": datetime.utcnow().isoformat(),
            "event_type": "code_execution",
            "user_id": user_id,
            "code_hash": code_hash,
            "execution_time": execution_time,
            "success": success,
            "error": error
        }
        
        level = logging.INFO if success else logging.ERROR
        self.logger.log(level, json.dumps(event))
    
    def log_suspicious_activity(self,
                               activity_type: str,
                               ip_address: str,
                               details: Dict[str, Any]):
        """Log potentially suspicious activities"""
        event = {
            "timestamp": datetime.utcnow().isoformat(),
            "event_type": "suspicious_activity",
            "activity_type": activity_type,
            "ip_address": ip_address,
            "details": details,
            "severity": "high"
        }
        
        self.logger.warning(json.dumps(event))
```

### Intrusion Detection

**Anomaly Detection**:
```python
from collections import defaultdict, deque
import time

class AnomalyDetector:
    """Detect unusual patterns in user behavior"""
    
    def __init__(self):
        self.request_patterns = defaultdict(lambda: deque(maxlen=100))
        self.failed_auth_attempts = defaultdict(lambda: deque(maxlen=10))
    
    def check_request_pattern(self, ip_address: str, endpoint: str) -> bool:
        """Check for unusual request patterns"""
        now = time.time()
        pattern_key = f"{ip_address}:{endpoint}"
        
        # Add current request
        self.request_patterns[pattern_key].append(now)
        
        # Check for rapid requests (more than 50 in 60 seconds)
        recent_requests = [
            t for t in self.request_patterns[pattern_key] 
            if now - t < 60
        ]
        
        if len(recent_requests) > 50:
            return False  # Suspicious
        
        return True
    
    def check_auth_failures(self, ip_address: str) -> bool:
        """Check for repeated authentication failures"""
        now = time.time()
        
        # Clean old failures (older than 15 minutes)
        while (self.failed_auth_attempts[ip_address] and 
               now - self.failed_auth_attempts[ip_address][0] > 900):
            self.failed_auth_attempts[ip_address].popleft()
        
        # Add current failure
        self.failed_auth_attempts[ip_address].append(now)
        
        # Block if more than 5 failures in 15 minutes
        return len(self.failed_auth_attempts[ip_address]) <= 5
```

## Security Testing

### Automated Security Tests

**Security Test Suite**:
```python
import pytest
from fastapi.testclient import TestClient
from app import app

client = TestClient(app)

class TestSecurityValidation:
    """Test security measures"""
    
    def test_code_injection_prevention(self):
        """Test that code injection attempts are blocked"""
        malicious_code = """
        import os
        os.system('rm -rf /')
        """
        
        response = client.post("/tasks/custom", json={
            "name": "test",
            "function_code": malicious_code,
            "tokenizer_code": "tokenizer = None",
            "model_code": "model = None",
        })
        
        assert response.status_code == 400
        assert "forbidden" in response.json()["error"].lower()
    
    def test_input_validation(self):
        """Test input validation"""
        # Test XSS prevention
        response = client.post("/tasks/classification", json={
            "text": "<script>alert('xss')</script>",
            "model_name": "valid-model"
        })
        
        assert response.status_code == 400
    
    def test_rate_limiting(self):
        """Test rate limiting"""
        # Make multiple rapid requests
        responses = []
        for _ in range(15):
            response = client.post("/tasks/custom", json={
                "name": "test",
                "function_code": "def custom_function(text): return text",
                "tokenizer_code": "tokenizer = None",
                "model_code": "model = None",
            })
            responses.append(response)
        
        # Should get rate limited
        rate_limited = any(r.status_code == 429 for r in responses)
        assert rate_limited
    
    def test_authentication_required(self):
        """Test that protected endpoints require authentication"""
        response = client.post("/custom-tasks", json={
            "name": "test task"
        })
        
        assert response.status_code == 401

    def test_sql_injection_prevention(self):
        """Test MongoDB injection prevention"""
        malicious_query = {"$where": "this.password"}
        
        response = client.get("/custom-tasks", params=malicious_query)
        
        # Should not crash and should not return sensitive data
        assert response.status_code in [200, 400]
```

## Incident Response

### Security Incident Playbook

1. **Detection**: Monitor logs for security events
2. **Assessment**: Determine scope and impact
3. **Containment**: Isolate affected systems
4. **Eradication**: Remove threats
5. **Recovery**: Restore normal operations
6. **Lessons Learned**: Update security measures

### Automated Response

```python
class IncidentResponse:
    """Automated incident response"""
    
    def __init__(self, security_logger: SecurityLogger):
        self.logger = security_logger
        self.blocked_ips = set()
    
    def handle_suspicious_activity(self, ip_address: str, activity_type: str):
        """Handle detected suspicious activity"""
        if activity_type in ["code_injection", "auth_brute_force"]:
            # Automatically block IP
            self.blocked_ips.add(ip_address)
            
            # Log incident
            self.logger.log_suspicious_activity(
                activity_type, ip_address, 
                {"action": "auto_blocked"}
            )
            
            # Alert administrators
            self.send_alert(f"Blocked IP {ip_address} for {activity_type}")
    
    def send_alert(self, message: str):
        """Send alert to administrators"""
        # Implement alerting mechanism (email, Slack, etc.)
        pass
```

## Security Configuration Checklist

### Production Security Checklist

- [ ] Change all default passwords and secrets
- [ ] Enable HTTPS with valid certificates
- [ ] Configure security headers
- [ ] Set up rate limiting
- [ ] Enable audit logging
- [ ] Configure firewall rules
- [ ] Set up monitoring and alerting
- [ ] Implement backup and recovery procedures
- [ ] Review and update dependencies regularly
- [ ] Conduct security testing
- [ ] Document incident response procedures
- [ ] Train team on security best practices