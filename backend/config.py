import os
from typing import Optional
from dotenv import load_dotenv

# Load environment variables from .env.local first, then .env
load_dotenv('.env.local')
load_dotenv('.env')

class Config:
    # MongoDB Configuration
    MONGODB_CONNECTION_STRING: str = os.getenv(
        "MONGODB_CONNECTION_STRING", 
        "mongodb://localhost:27017"
    )
    MONGODB_DATABASE_NAME: str = os.getenv(
        "MONGODB_DATABASE_NAME", 
        "bert_studio"
    )
    
    # Application Configuration
    APP_NAME: str = "BERT Studio"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = os.getenv("DEBUG", "false").lower() == "true"
    
    # Security Configuration
    ALLOWED_ORIGINS: list = [
        "http://localhost:8000",
        "http://localhost:8080",
        "http://localhost:3000",
    ]
    
    # Model Configuration
    DEFAULT_MODEL_CACHE_DIR: str = "./models"
    MAX_MODEL_SIZE_MB: int = 5000  # 5GB limit
    
    # Task Configuration
    MAX_TASK_NAME_LENGTH: int = 100
    MAX_TASK_DESCRIPTION_LENGTH: int = 500
    MAX_TASK_TAGS_LENGTH: int = 200
    
    # Rate Limiting (if needed)
    RATE_LIMIT_REQUESTS: int = 100
    RATE_LIMIT_WINDOW: int = 3600  # 1 hour
    
    # Auth Configuration
    AUTH_USERNAME: str = os.getenv("AUTH_USERNAME", "bert-developer")
    AUTH_PASSWORD: str = os.getenv("AUTH_PASSWORD", "changeme")
    
    @classmethod
    def get_mongodb_config(cls) -> dict:
        """Get MongoDB configuration as dictionary."""
        return {
            "connection_string": cls.MONGODB_CONNECTION_STRING,
            "database_name": cls.MONGODB_DATABASE_NAME,
        }
    
    @classmethod
    def validate_config(cls) -> bool:
        """Validate the configuration."""
        try:
            # Validate MongoDB connection string
            if not cls.MONGODB_CONNECTION_STRING:
                raise ValueError("MongoDB connection string is required")
            
            # Validate database name
            if not cls.MONGODB_DATABASE_NAME:
                raise ValueError("MongoDB database name is required")
            
            return True
        except Exception as e:
            print(f"Configuration validation failed: {e}")
            return False

# Environment-specific configurations
class DevelopmentConfig(Config):
    DEBUG = True
    # Use environment variable if set, otherwise default to localhost
    MONGODB_CONNECTION_STRING = os.getenv("MONGODB_CONNECTION_STRING", "mongodb://localhost:27017")

class ProductionConfig(Config):
    DEBUG = False
    # In production, these should be set via environment variables
    MONGODB_CONNECTION_STRING = os.getenv("MONGODB_CONNECTION_STRING", "mongodb://localhost:27017")
    MONGODB_DATABASE_NAME = os.getenv("MONGODB_DATABASE_NAME", "bert_studio_prod")

class TestingConfig(Config):
    DEBUG = True
    # Use environment variable if set, otherwise default to localhost
    MONGODB_CONNECTION_STRING = os.getenv("MONGODB_CONNECTION_STRING", "mongodb://localhost:27017")
    MONGODB_DATABASE_NAME = "bert_studio_test"

# Configuration factory
def get_config(environment: str = "development") -> Config:
    """Get configuration based on environment."""
    configs = {
        "development": DevelopmentConfig,
        "production": ProductionConfig,
        "testing": TestingConfig,
    }
    
    config_class = configs.get(environment, DevelopmentConfig)
    return config_class()

# Default configuration
config = get_config() 