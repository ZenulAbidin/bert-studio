# BERT Studio - Advanced Model Playground

![user interface](https://i.imgur.com/SJZIUq7.png)

BERT Studio is a comprehensive, full-stack platform for experimenting with BERT and other transformer-based models from HuggingFace. It provides an intuitive web interface for model exploration, task execution, and custom code development with enterprise-grade MongoDB integration.

## 🚀 Features

### Core ML Capabilities
- **Model Management**: Browse, download, and load models from HuggingFace Hub
- **Embedding Generation**: Create embeddings from text using various models
- **Text Classification**: Perform sentiment analysis and multi-class classification
- **Question Answering**: Extract answers from context using extractive QA models
- **Named Entity Recognition**: Identify and classify entities in text
- **Fill Mask**: Complete masked text using language models
- **Text Summarization**: Generate concise summaries from longer texts
- **Feature Extraction**: Extract high-dimensional features from text

### Advanced Features
- **Custom Tasks**: Execute custom PyTorch/Transformers code with security restrictions
- **MongoDB Integration**: Enterprise-grade task storage and management
- **API Key Management**: Secure authentication and session handling
- **Task Sharing**: Export/import custom tasks between installations
- **Real-time Processing**: Fast inference with GPU acceleration support
- **Docker Deployment**: Production-ready containerized deployment

## 🏗️ Architecture

BERT Studio follows a modern full-stack architecture:

- **Frontend**: React 18 + TypeScript + Vite + shadcn/ui + Tailwind CSS
- **Backend**: FastAPI + Python with PyTorch and Transformers
- **Database**: MongoDB for persistent storage
- **Deployment**: Docker Compose with Nginx reverse proxy
- **Authentication**: Session-based with API key management

## 📋 Prerequisites

- **Node.js** 18+ and npm/yarn
- **Python** 3.9+ 
- **MongoDB** 6+ (or Docker)
- **Docker** and Docker Compose (for containerized deployment)
- **CUDA** (optional, for GPU acceleration)

## 🛠️ Installation

### Option 1: Local Development Setup

1. **Clone the repository**:
   ```bash
   git clone <YOUR_GIT_URL>
   cd bert-studio
   ```

2. **Frontend Setup**:
   ```bash
   npm install
   npm run dev
   ```

3. **Backend Setup**:
   ```bash
   cd backend
   pip install -r requirements.txt
   python start_server.py
   ```

4. **MongoDB Setup**:
   ```bash
   # Install MongoDB locally or use MongoDB Atlas
   # Ubuntu/Debian
   sudo apt-get install mongodb
   
   # macOS
   brew install mongodb-community
   
   # Configure connection (optional)
   export MONGODB_CONNECTION_STRING="mongodb://localhost:27017"
   export MONGODB_DATABASE_NAME="bert_studio"
   ```

### Option 2: Docker Deployment (Recommended)

1. **Clone and configure**:
   ```bash
   git clone <YOUR_GIT_URL>
   cd bert-studio
   cp backend/.env.example backend/.env.local
   # Edit backend/.env.local with your configuration
   ```

2. **Deploy with Docker Compose**:
   ```bash
   docker-compose up -d
   ```

3. **Access the application**:
   - Frontend: http://localhost
   - Backend API: http://localhost:8000
   - MongoDB: localhost:27017

## 🎯 Usage

### Getting Started
1. Navigate to the web interface
2. Browse available models in the Model Browser
3. Select a task type (Classification, QA, NER, etc.)
4. Choose or download a model
5. Input your text and run inference

### Custom Tasks
Create custom PyTorch code with these security features:
- Only `transformers` and `torch` imports allowed
- Code must be wrapped in functions
- Separate tokenizer, model, and function code blocks
- Function must be named `custom_function` and accept text parameter

**Example Custom Task**:
```python
# Tokenizer Code
tokenizer = AutoTokenizer.from_pretrained("distilbert-base-uncased")

# Model Code  
model = AutoModelForSequenceClassification.from_pretrained("distilbert-base-uncased")

# Function Code
def custom_function(text):
    inputs = tokenizer(text, return_tensors="pt", truncation=True, padding=True)
    outputs = model(**inputs)
    probabilities = torch.nn.functional.softmax(outputs.logits, dim=-1)
    return {"prediction": probabilities[0][1].item()}
```

### Task Management
- **Save Tasks**: Store custom code with metadata (name, description, tags)
- **Search & Filter**: Find tasks by name, description, tags, or model
- **Export/Import**: Share tasks between installations
- **Statistics**: View usage analytics and popular tags
- **Backup/Restore**: Full database backup capabilities

## 🤝 Contributing

We welcome contributions! Please follow these guidelines:

### Development Workflow
1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Make your changes
4. Run tests: `npm run test` (frontend) and `pytest` (backend)
5. Lint code: `npm run lint` (frontend) and `flake8` (backend)
6. Commit changes: `git commit -m 'Add amazing feature'`
7. Push to branch: `git push origin feature/amazing-feature`
8. Open a Pull Request

### Code Standards
- **Frontend**: Follow React/TypeScript best practices, use ESLint configuration
- **Backend**: Follow PEP 8, use type hints, add docstrings
- **Database**: Use proper MongoDB indexing and query optimization
- **Security**: Never commit API keys, follow OWASP guidelines

### Testing
- Frontend: Jest + React Testing Library
- Backend: pytest with async test support
- Integration: Docker-based end-to-end testing

## 📊 Why BERT Studio?

### Advantages Over Alternatives

| Feature | BERT Studio | HuggingFace Spaces | Colab | Local Scripts |
|---------|-------------|-------------------|-------|---------------|
| **Custom Code Execution** | ✅ Secure sandbox | ❌ Limited | ✅ Full access | ✅ Full access |
| **Persistent Storage** | ✅ MongoDB | ❌ Session only | ❌ Session only | ✅ Local files |
| **Multi-Model Support** | ✅ Full HF Hub | ✅ Full HF Hub | ✅ Manual setup | ✅ Manual setup |
| **Web Interface** | ✅ Professional UI | ✅ Basic | ❌ Notebook only | ❌ CLI/Scripts |
| **Task Management** | ✅ Advanced search/tags | ❌ None | ❌ None | ❌ File-based |
| **Production Ready** | ✅ Docker + scaling | ❌ Shared resources | ❌ Development only | ❌ Manual setup |
| **Collaboration** | ✅ Export/import | ✅ Public only | ✅ Sharing | ❌ Manual |

### Use Cases
- **Research**: Rapid prototyping and model comparison
- **Education**: Teaching ML concepts with hands-on examples
- **Production**: Model validation before deployment
- **Enterprise**: Secure, self-hosted ML experimentation platform

## 📚 Documentation

See the `docs/` directory for detailed documentation:
- [API Reference](docs/api-reference.md)
- [Frontend Architecture](docs/frontend-architecture.md)
- [Backend Architecture](docs/backend-architecture.md)
- [Database Schema](docs/database-schema.md)
- [Deployment Guide](docs/deployment.md)
- [Security Guidelines](docs/security.md)

## 🔧 Configuration

### Environment Variables
```bash
# Backend (.env.local)
MONGODB_CONNECTION_STRING=mongodb://localhost:27017
MONGODB_DATABASE_NAME=bert_studio
SECRET_KEY=your-secret-key-here
CORS_ORIGINS=http://localhost:3000,http://localhost

# Optional: HuggingFace configuration
HF_TOKEN=your-huggingface-token
TRANSFORMERS_CACHE=/path/to/cache
```

### Docker Configuration
- **CPU Only**: Default configuration works out of the box
- **GPU Support**: Uncomment GPU sections in docker-compose.yml
- **Custom Models**: Mount model cache directories for persistence

## 🚀 Deployment

### Production Checklist
- [ ] Set strong SECRET_KEY in environment
- [ ] Configure MongoDB with authentication
- [ ] Set up SSL/TLS certificates
- [ ] Configure Nginx with security headers
- [ ] Set up monitoring and logging
- [ ] Configure automated backups
- [ ] Test disaster recovery procedures

### Scaling
- **Horizontal**: Load balance multiple backend instances
- **Vertical**: Increase container resources for large models
- **Database**: Use MongoDB replica sets or sharding
- **CDN**: Serve static assets via CDN

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙋‍♂️ Support

- **Issues**: [GitHub Issues](https://github.com/your-username/bert-studio/issues)
- **Discussions**: [GitHub Discussions](https://github.com/your-username/bert-studio/discussions)
- **Documentation**: [docs/](docs/)

## 🎉 Acknowledgments

- [HuggingFace Transformers](https://huggingface.co/transformers/) for the ML backend
- [shadcn/ui](https://ui.shadcn.com/) for the beautiful UI components
- [FastAPI](https://fastapi.tiangolo.com/) for the robust API framework
- [MongoDB](https://www.mongodb.com/) for reliable data persistence

---

**Built with ❤️ for the ML community**