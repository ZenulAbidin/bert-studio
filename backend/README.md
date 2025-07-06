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

3. Configure MongoDB Connection:
   
   **Option 1: Interactive Setup (Recommended)**
   ```bash
   python setup_env.py
   ```
   This will guide you through setting up your MongoDB connection string.
   
   **Option 2: Manual Configuration**
   
   The application uses MongoDB for storing custom tasks. You can configure the connection using environment variables:
   
   ```bash
   # Set MongoDB connection string
   export MONGODB_CONNECTION_STRING="mongodb://localhost:27017"
   export MONGODB_DATABASE_NAME="bert_studio"
   ```
   
   Or create a `.env` file in the backend directory:
   ```bash
   # .env file
   MONGODB_CONNECTION_STRING=mongodb://localhost:27017
   MONGODB_DATABASE_NAME=bert_studio
   DEBUG=false
   ```
   
   **Connection String Examples:**
   - Local MongoDB: `mongodb://localhost:27017`
   - MongoDB Atlas: `mongodb+srv://username:password@cluster.mongodb.net`
   - Docker MongoDB: `mongodb://mongodb:27017`

## Running the Server

Start the FastAPI server with Uvicorn:

```bash
uvicorn main:app --reload
```

The server will be available at [http://localhost:8000](http://localhost:8000).

# If models fail to load

Upgrade your `transformers` version:

```bash
pip install -U transformers
```

## Endpoints

- `GET /` — Health check
- `POST /embed` — Get BERT embeddings for a list of texts (to be implemented) 