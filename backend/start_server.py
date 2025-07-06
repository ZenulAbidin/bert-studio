#!/usr/bin/env python3
"""
BERT Studio Server Startup Script
Handles MongoDB connection validation and server startup
"""

import sys
import os
import subprocess
from pathlib import Path

def check_mongodb_connection():
    """Check if MongoDB is running and accessible."""
    try:
        from pymongo import MongoClient
        from config import config
        
        print("🔍 Checking MongoDB connection...")
        
        client = MongoClient(config.MONGODB_CONNECTION_STRING, serverSelectionTimeoutMS=5000)
        client.admin.command('ping')
        
        print("✅ MongoDB connection successful!")
        return True
        
    except Exception as e:
        print(f"❌ MongoDB connection failed: {e}")
        print("\n📋 MongoDB Setup Instructions:")
        print("1. Install MongoDB:")
        print("   Ubuntu/Debian: sudo apt-get install mongodb")
        print("   macOS: brew install mongodb-community")
        print("   Windows: Download from https://www.mongodb.com/try/download/community")
        print("\n2. Start MongoDB service:")
        print("   Ubuntu/Debian: sudo systemctl start mongodb")
        print("   macOS: brew services start mongodb-community")
        print("   Windows: Start MongoDB service from Services")
        print("\n3. Or use MongoDB Atlas (cloud):")
        print("   Set MONGODB_CONNECTION_STRING environment variable")
        return False

def install_dependencies():
    """Install required Python dependencies."""
    try:
        print("📦 Installing Python dependencies...")
        subprocess.check_call([sys.executable, "-m", "pip", "install", "-r", "requirements.txt"])
        print("✅ Dependencies installed successfully!")
        return True
    except subprocess.CalledProcessError as e:
        print(f"❌ Failed to install dependencies: {e}")
        return False

def start_server():
    """Start the FastAPI server."""
    try:
        print("🚀 Starting BERT Studio server...")
        subprocess.run([sys.executable, "-m", "uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000", "--reload"])
    except KeyboardInterrupt:
        print("\n👋 Server stopped by user")
    except Exception as e:
        print(f"❌ Failed to start server: {e}")

def main():
    """Main startup function."""
    print("🎯 BERT Studio Server Startup")
    print("=" * 40)
    
    # Check if we're in the right directory
    if not Path("main.py").exists():
        print("❌ Please run this script from the backend directory")
        sys.exit(1)
    
    # Install dependencies
    if not install_dependencies():
        sys.exit(1)
    
    # Check MongoDB connection
    if not check_mongodb_connection():
        print("\n⚠️  MongoDB is not available. Some features may not work.")
        response = input("Continue anyway? (y/N): ")
        if response.lower() != 'y':
            sys.exit(1)
    
    # Start the server
    start_server()

if __name__ == "__main__":
    main() 