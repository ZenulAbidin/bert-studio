# Deployment Guide

## Overview

This guide covers deployment options for BERT Studio, from local development to production-ready containerized deployments with scaling and monitoring capabilities.

## Deployment Options

### 1. Local Development
### 2. Docker Compose (Recommended)
### 3. Kubernetes
### 4. Cloud Platforms (AWS, GCP, Azure)

---

## 1. Local Development Setup

### Prerequisites
- Node.js 18+ and npm
- Python 3.9+
- MongoDB 6+
- Git

### Frontend Setup
```bash
# Clone repository
git clone <your-repo-url>
cd bert-studio

# Install dependencies
npm install

# Start development server
npm run dev
```

### Backend Setup
```bash
# Navigate to backend directory
cd backend

# Create virtual environment
python -m venv venv
source venv/bin/activate  # Linux/Mac
# or
venv\Scripts\activate     # Windows

# Install dependencies
pip install -r requirements.txt

# Set environment variables
export MONGODB_CONNECTION_STRING="mongodb://localhost:27017"
export MONGODB_DATABASE_NAME="bert_studio"
export SECRET_KEY="development-secret-key"

# Start backend server
python start_server.py
```

### MongoDB Setup
```bash
# Ubuntu/Debian
sudo apt-get install mongodb
sudo systemctl start mongodb

# macOS
brew install mongodb-community
brew services start mongodb-community

# Windows
# Download from https://www.mongodb.com/try/download/community
```

---

## 2. Docker Compose Deployment (Recommended)

### Quick Start

```bash
# Clone repository
git clone <your-repo-url>
cd bert-studio

# Copy environment template
cp backend/.env.example backend/.env.local

# Edit environment variables
nano backend/.env.local

# Deploy all services
docker-compose up -d

# Check service status
docker-compose ps
```

### Environment Configuration

Create `backend/.env.local`:
```bash
# Database Configuration
MONGODB_CONNECTION_STRING=mongodb://mongo:27017
MONGODB_DATABASE_NAME=bert_studio

# Security
SECRET_KEY=your-super-secret-key-here-change-in-production

# CORS Configuration
CORS_ORIGINS=http://localhost,http://localhost:3000

# Optional: HuggingFace Configuration
HF_TOKEN=your-huggingface-token
TRANSFORMERS_CACHE=/app/models

# Optional: GPU Support
CUDA_VISIBLE_DEVICES=0
```

### Docker Compose Configuration

**docker-compose.yml**:
```yaml
version: "3.8"

services:
  bert_studio:
    build: .
    container_name: bert-backend
    env_file:
      - ./backend/.env.local
    ports:
      - "8000:8000"
    depends_on:
      - mongo
    volumes:
      - model_cache:/app/models
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8000/health"]
      interval: 30s
      timeout: 10s
      retries: 3

  mongo:
    image: mongo:6
    container_name: bert-mongo
    restart: unless-stopped
    ports:
      - "27017:27017"
    volumes:
      - mongo_data:/data/db
    environment:
      MONGO_INITDB_ROOT_USERNAME: admin
      MONGO_INITDB_ROOT_PASSWORD: password
    command: mongod --auth

  nginx:
    image: nginx:1.25
    container_name: bert-nginx
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./dist:/usr/share/nginx/html:ro
      - ./nginx.conf:/etc/nginx/conf.d/default.conf:ro
      - ./ssl:/etc/nginx/ssl:ro
    depends_on:
      - bert_studio
    restart: unless-stopped

volumes:
  mongo_data:
  model_cache:
```

### GPU Support

For GPU-enabled deployment, modify docker-compose.yml:

```yaml
services:
  bert_studio:
    # ... other configuration
    runtime: nvidia
    environment:
      NVIDIA_VISIBLE_DEVICES: all
    deploy:
      resources:
        reservations:
          devices:
            - driver: nvidia
              count: 1
              capabilities: [gpu]
```

### SSL/TLS Configuration

**nginx.conf with SSL**:
```nginx
server {
    listen 80;
    server_name your-domain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name your-domain.com;

    ssl_certificate /etc/nginx/ssl/cert.pem;
    ssl_certificate_key /etc/nginx/ssl/key.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;

    # Security headers
    add_header X-Frame-Options DENY;
    add_header X-Content-Type-Options nosniff;
    add_header X-XSS-Protection "1; mode=block";
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains";

    # Frontend
    location / {
        root /usr/share/nginx/html;
        try_files $uri $uri/ /index.html;
    }

    # Backend API
    location /api/ {
        proxy_pass http://bert_studio:8000/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_timeout 300s;
    }
}
```

---

## 3. Kubernetes Deployment

### Prerequisites
- Kubernetes cluster (1.20+)
- kubectl configured
- Helm 3+ (optional)

### Basic Kubernetes Manifests

**namespace.yaml**:
```yaml
apiVersion: v1
kind: Namespace
metadata:
  name: bert-studio
```

**mongodb.yaml**:
```yaml
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: mongodb
  namespace: bert-studio
spec:
  serviceName: mongodb
  replicas: 1
  selector:
    matchLabels:
      app: mongodb
  template:
    metadata:
      labels:
        app: mongodb
    spec:
      containers:
      - name: mongodb
        image: mongo:6
        ports:
        - containerPort: 27017
        env:
        - name: MONGO_INITDB_ROOT_USERNAME
          value: admin
        - name: MONGO_INITDB_ROOT_PASSWORD
          valueFrom:
            secretKeyRef:
              name: mongodb-secret
              key: password
        volumeMounts:
        - name: mongodb-data
          mountPath: /data/db
  volumeClaimTemplates:
  - metadata:
      name: mongodb-data
    spec:
      accessModes: ["ReadWriteOnce"]
      resources:
        requests:
          storage: 10Gi
```

**backend.yaml**:
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: bert-backend
  namespace: bert-studio
spec:
  replicas: 3
  selector:
    matchLabels:
      app: bert-backend
  template:
    metadata:
      labels:
        app: bert-backend
    spec:
      containers:
      - name: backend
        image: bert-studio:latest
        ports:
        - containerPort: 8000
        env:
        - name: MONGODB_CONNECTION_STRING
          value: "mongodb://admin:password@mongodb:27017/bert_studio?authSource=admin"
        - name: SECRET_KEY
          valueFrom:
            secretKeyRef:
              name: app-secrets
              key: secret-key
        resources:
          requests:
            memory: "1Gi"
            cpu: "500m"
          limits:
            memory: "4Gi"
            cpu: "2"
        livenessProbe:
          httpGet:
            path: /health
            port: 8000
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /health
            port: 8000
          initialDelaySeconds: 5
          periodSeconds: 5
```

**ingress.yaml**:
```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: bert-studio-ingress
  namespace: bert-studio
  annotations:
    nginx.ingress.kubernetes.io/rewrite-target: /
    cert-manager.io/cluster-issuer: letsencrypt-prod
spec:
  tls:
  - hosts:
    - your-domain.com
    secretName: bert-studio-tls
  rules:
  - host: your-domain.com
    http:
      paths:
      - path: /api
        pathType: Prefix
        backend:
          service:
            name: bert-backend
            port:
              number: 8000
      - path: /
        pathType: Prefix
        backend:
          service:
            name: bert-frontend
            port:
              number: 80
```

### Helm Chart Deployment

```bash
# Create Helm chart
helm create bert-studio-chart

# Install with custom values
helm install bert-studio ./bert-studio-chart \
  --set image.tag=latest \
  --set mongodb.auth.rootPassword=securepassword \
  --set ingress.enabled=true \
  --set ingress.hosts[0].host=your-domain.com
```

---

## 4. Cloud Platform Deployments

### AWS Deployment

#### ECS with Fargate
```json
{
  "family": "bert-studio",
  "networkMode": "awsvpc",
  "requiresCompatibilities": ["FARGATE"],
  "cpu": "1024",
  "memory": "4096",
  "executionRoleArn": "arn:aws:iam::account:role/ecsTaskExecutionRole",
  "containerDefinitions": [
    {
      "name": "bert-backend",
      "image": "your-account.dkr.ecr.region.amazonaws.com/bert-studio:latest",
      "portMappings": [
        {
          "containerPort": 8000,
          "protocol": "tcp"
        }
      ],
      "environment": [
        {
          "name": "MONGODB_CONNECTION_STRING",
          "value": "mongodb://mongodb.your-cluster.amazonaws.com:27017"
        }
      ],
      "logConfiguration": {
        "logDriver": "awslogs",
        "options": {
          "awslogs-group": "/ecs/bert-studio",
          "awslogs-region": "us-west-2",
          "awslogs-stream-prefix": "ecs"
        }
      }
    }
  ]
}
```

#### EKS Deployment
```bash
# Create EKS cluster
eksctl create cluster --name bert-studio --region us-west-2

# Deploy to EKS
kubectl apply -f k8s/
```

### Google Cloud Platform

#### Cloud Run Deployment
```yaml
apiVersion: serving.knative.dev/v1
kind: Service
metadata:
  name: bert-studio
  annotations:
    run.googleapis.com/ingress: all
spec:
  template:
    metadata:
      annotations:
        autoscaling.knative.dev/maxScale: "10"
        run.googleapis.com/cpu-throttling: "false"
    spec:
      containerConcurrency: 100
      containers:
      - image: gcr.io/your-project/bert-studio:latest
        ports:
        - containerPort: 8000
        env:
        - name: MONGODB_CONNECTION_STRING
          value: "mongodb://mongo-service:27017"
        resources:
          limits:
            cpu: "2"
            memory: "4Gi"
```

### Azure Container Instances

```bash
# Create resource group
az group create --name bert-studio --location eastus

# Deploy container group
az container create \
  --resource-group bert-studio \
  --name bert-studio-app \
  --image your-registry.azurecr.io/bert-studio:latest \
  --cpu 2 \
  --memory 4 \
  --ports 8000 \
  --environment-variables \
    MONGODB_CONNECTION_STRING="mongodb://cosmos-mongodb.documents.azure.com:10255"
```

---

## Production Checklist

### Security
- [ ] Change default passwords and secrets
- [ ] Enable SSL/TLS encryption
- [ ] Configure firewall rules
- [ ] Set up VPN access for administrative tasks
- [ ] Enable MongoDB authentication
- [ ] Configure CORS properly
- [ ] Set up API rate limiting
- [ ] Enable security headers in Nginx

### Performance
- [ ] Configure horizontal pod autoscaling (K8s)
- [ ] Set up load balancing
- [ ] Configure caching layers
- [ ] Optimize database indexes
- [ ] Set up CDN for static assets
- [ ] Configure resource limits and requests
- [ ] Enable GPU support if needed

### Monitoring
- [ ] Set up application monitoring (Prometheus/Grafana)
- [ ] Configure log aggregation (ELK stack)
- [ ] Set up alerting (PagerDuty/Slack)
- [ ] Configure health checks
- [ ] Set up database monitoring
- [ ] Configure backup monitoring

### Backup & Recovery
- [ ] Configure automated database backups
- [ ] Test backup restoration procedures
- [ ] Set up disaster recovery plan
- [ ] Configure data retention policies
- [ ] Document recovery procedures

### Scaling
- [ ] Test autoscaling behavior
- [ ] Configure resource quotas
- [ ] Set up multiple availability zones
- [ ] Plan for traffic spikes
- [ ] Configure database replication

---

## Troubleshooting

### Common Issues

**Backend won't start**:
```bash
# Check logs
docker-compose logs bert_studio

# Common causes:
# - MongoDB connection issues
# - Missing environment variables
# - Port conflicts
```

**Frontend build fails**:
```bash
# Clear cache and rebuild
npm run build:clean
npm install
npm run build
```

**Database connection errors**:
```bash
# Test MongoDB connectivity
docker exec -it bert-mongo mongosh
# or
mongo mongodb://localhost:27017
```

**GPU not detected**:
```bash
# Check GPU availability in container
docker exec -it bert-backend python -c "import torch; print(torch.cuda.is_available())"

# Ensure nvidia-docker is installed
sudo apt-get install nvidia-docker2
sudo systemctl restart docker
```

### Performance Tuning

**Memory optimization**:
```python
# Adjust model cache size
MAX_CACHED_MODELS = 3

# Use CPU for smaller models
if model_size < 500_000_000:  # 500MB
    device = "cpu"
```

**Database optimization**:
```javascript
// Add appropriate indexes
db.custom_tasks.createIndex({"created_at": -1})
db.execution_logs.createIndex({"timestamp": -1})

// Configure connection pooling
maxPoolSize: 50
```

---

## Maintenance

### Regular Tasks
- Update dependencies monthly
- Review and rotate secrets quarterly
- Monitor disk usage and clean old logs
- Update SSL certificates
- Review and update backup procedures
- Performance testing and optimization

### Monitoring Dashboard

Key metrics to monitor:
- API response times
- Database query performance
- Memory and CPU usage
- Model inference latency
- Error rates and types
- User activity patterns