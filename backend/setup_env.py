#!/usr/bin/env python3
"""
Setup script to configure MongoDB connection string via environment variable.
"""

import os
import sys

def setup_environment():
    """Interactive setup for MongoDB connection string."""
    print("=== MongoDB Connection Setup ===")
    print()
    
    # Check if .env file exists
    env_file = ".env"
    if os.path.exists(env_file):
        print(f"Found existing {env_file} file.")
        overwrite = input("Do you want to overwrite it? (y/N): ").lower().strip()
        if overwrite != 'y':
            print("Setup cancelled.")
            return
    
    # Get MongoDB connection string
    print("\nEnter your MongoDB connection string:")
    print("Examples:")
    print("  - Local MongoDB: mongodb://localhost:27017")
    print("  - MongoDB Atlas: mongodb+srv://username:password@cluster.mongodb.net")
    print("  - Docker MongoDB: mongodb://mongodb:27017")
    print()
    
    connection_string = input("MongoDB Connection String: ").strip()
    if not connection_string:
        connection_string = "mongodb://localhost:27017"
        print(f"Using default: {connection_string}")
    
    # Get database name
    database_name = input("Database Name (default: bert_studio): ").strip()
    if not database_name:
        database_name = "bert_studio"
    
    # Get debug setting
    debug = input("Enable debug mode? (y/N): ").lower().strip() == 'y'
    
    # Create .env file
    env_content = f"""# MongoDB Configuration
MONGODB_CONNECTION_STRING={connection_string}
MONGODB_DATABASE_NAME={database_name}

# Application Configuration
DEBUG={'true' if debug else 'false'}
"""
    
    try:
        with open(env_file, 'w') as f:
            f.write(env_content)
        print(f"\n✅ Environment configuration saved to {env_file}")
        print(f"Connection String: {connection_string}")
        print(f"Database Name: {database_name}")
        print(f"Debug Mode: {'Enabled' if debug else 'Disabled'}")
        print("\nYou can now start the server with: uvicorn main:app --reload")
        
    except Exception as e:
        print(f"❌ Error creating {env_file}: {e}")
        print("\nYou can manually set the environment variables:")
        print(f"export MONGODB_CONNECTION_STRING='{connection_string}'")
        print(f"export MONGODB_DATABASE_NAME='{database_name}'")
        print(f"export DEBUG={'true' if debug else 'false'}")

if __name__ == "__main__":
    setup_environment() 